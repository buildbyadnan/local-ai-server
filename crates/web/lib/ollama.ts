/**
 * Server-only helpers for the three Ollama proxy route handlers.
 *
 * Everything here is deliberately narrow: the upstream base URL comes from
 * the environment (same convention as the `llama` CLI), the upstream paths
 * are fixed, and every request is guarded before it can touch Ollama.
 *
 * The guards are the product's security boundary (see CONNECTIVITY_PLAN
 * §3.2/§4.4): the server binds loopback only, the Host guard rejects
 * DNS-rebinding traffic, and the body cap bounds memory in a tool with no
 * auth. They are guard rails, not a multi-tenant security model.
 */
import { execFile } from "node:child_process";
import path from "node:path";

/** Loopback hostnames accepted by the Host guard. */
const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1"]);

const DEFAULT_HOST = "http://127.0.0.1:11434";

/** Model tags we forward upstream: lowercase registry names, optional tag. */
const TAG_RE = /^[a-z0-9][a-z0-9._/-]{0,127}(?::[a-z0-9._-]{1,64})?$/;

/** The Ollama base URL — env first, identical fallback to the CLI's clap default. */
export function base(): string {
  const raw = process.env.OLLAMA_HOST?.trim() || DEFAULT_HOST;
  return raw.replace(/\/+$/, "");
}

/** JSON error helper used by every guard and validation path. */
export function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

/**
 * Normalize an authority (`host` header or URL hostname) to a bare
 * hostname: strips `[]` around IPv6 and any `:port`.
 */
function hostnameOf(authority: string): string {
  if (authority.startsWith("[")) {
    const end = authority.indexOf("]");
    return end === -1 ? authority : authority.slice(1, end);
  }
  return authority.replace(/:\d+$/, "");
}

/** Port of a `host` header (`"127.0.0.1:3000"` → `"3000"`), `""` if absent. */
function portOfHost(host: string): string {
  const m = /:(\d+)$/.exec(host);
  return m ? m[1] : "";
}

/**
 * Guard 1 (all routes, including GET): the request must arrive on loopback.
 * A DNS-rebound attacker page gets a foreign `Host` and is rejected before
 * anything reaches Ollama. Returns a ready Response on failure, else null.
 */
export function requireLoopbackHost(request: Request): Response | null {
  const host = request.headers.get("host") ?? "";
  if (!LOOPBACK.has(hostnameOf(host))) {
    return jsonError(403, "Requests to this server must come from this machine.");
  }
  return null;
}

/**
 * Guard 2 (POST routes): JSON content type, and — when a browser sends an
 * `Origin` — that origin must be loopback on the same port as this request.
 * Origin-absent requests (curl) pass; cross-site browser POSTs cannot
 * preflight through us because we send no CORS headers.
 */
export function requireLocalPost(request: Request): Response | null {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("application/json")) {
    return jsonError(400, "Send JSON with Content-Type: application/json.");
  }

  const origin = request.headers.get("origin");
  if (origin !== null) {
    if (origin === "null") {
      return jsonError(403, "Cross-origin requests are not allowed.");
    }
    let allowed = false;
    try {
      const url = new URL(origin);
      const host = request.headers.get("host") ?? "";
      allowed =
        LOOPBACK.has(hostnameOf(url.hostname)) && url.port === portOfHost(host);
    } catch {
      allowed = false;
    }
    if (!allowed) {
      return jsonError(403, "Cross-origin requests are not allowed.");
    }
  }
  return null;
}

/** Result of reading a request body: either a failure Response or the value. */
export type BodyResult =
  | { ok: true; value: unknown }
  | { ok: false; response: Response };

/**
 * Read and parse a JSON body with a hard byte cap (default 1 MiB — the real
 * limit; the message-count/length checks are the finer-grained guard). On
 * failure returns a ready-made Response; a client payload containing an
 * `error` key can never be mistaken for our own error envelope.
 */
export async function readJsonBody(
  request: Request,
  maxBytes = 1024 * 1024,
): Promise<BodyResult> {
  const reader = request.body?.getReader();
  if (!reader) {
    return { ok: false, response: jsonError(400, "A JSON body is required.") };
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      reader.cancel().catch(() => undefined); // best-effort; we're rejecting anyway
      return {
        ok: false,
        response: jsonError(413, "That request is too large (1 MB limit)."),
      };
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { ok: false, response: jsonError(400, "The body isn't valid JSON.") };
  }
}

/** A well-formed lowercase Ollama registry tag (no path/content injection). */
export function isValidTag(tag: unknown): tag is string {
  return typeof tag === "string" && TAG_RE.test(tag);
}

/**
 * Fetch an upstream Ollama path. Always `no-store` (never a build/data-cache
 * snapshot). `timeoutMs` applies only when the caller supplies no signal of
 * its own (streaming routes pass `request.signal` instead).
 */
export async function ollamaFetch(
  pathname: string,
  init: RequestInit = {},
  timeoutMs = 0,
): Promise<Response> {
  const signal =
    init.signal ?? (timeoutMs > 0 ? AbortSignal.timeout(timeoutMs) : undefined);
  return fetch(base() + pathname, { ...init, cache: "no-store", signal });
}

/** Where to look for the `ollama` binary, and whether finding it counts as PATH. */
interface Candidate {
  file: string;
  onPath: boolean;
}

/**
 * Candidate binaries. `OLLAMA_BIN_PATHS` (comma-separated) overrides the
 * list — an empty value forces "not installed". That override exists so the
 * not-installed UI state is testable on a machine that has Ollama (QA only;
 * see CONNECTIVITY_PLAN §10.5).
 */
function candidates(): Candidate[] {
  const override = process.env.OLLAMA_BIN_PATHS;
  if (override !== undefined) {
    return override
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .map((file) => ({ file, onPath: true }));
  }
  if (process.platform === "win32") {
    const list: Candidate[] = [{ file: "ollama.exe", onPath: true }];
    if (process.env.LOCALAPPDATA) {
      list.push({
        file: path.join(
          process.env.LOCALAPPDATA,
          "Programs",
          "Ollama",
          "ollama.exe",
        ),
        onPath: false,
      });
    }
    return list;
  }
  return [
    { file: "ollama", onPath: true },
    { file: "/usr/local/bin/ollama", onPath: false },
    { file: "/usr/bin/ollama", onPath: false },
    { file: "/Applications/Ollama.app/Contents/Resources/ollama", onPath: false },
  ];
}

/** Does this binary exist and run? Never rejects — the callback always fires. */
function runs(file: string): Promise<boolean> {
  return outputOf(file).then((out) => out !== null);
}

/** `--version` output of a candidate binary, or null when it doesn't run. */
function outputOf(file: string): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(
      file,
      ["--version"],
      { timeout: 2000, env: process.env },
      (error, stdout, stderr) => resolve(error === null ? `${stdout}${stderr}` : null),
    );
  });
}

/** Probe for an installed Ollama. All outcomes are values, never throws. */
export async function probeInstalled(): Promise<{
  installed: boolean;
  onPath: boolean;
}> {
  for (const candidate of candidates()) {
    if (await runs(candidate.file)) {
      return { installed: true, onPath: candidate.onPath };
    }
  }
  return { installed: false, onPath: false };
}

/** Absolute path of the first binary that actually runs, else null. */
export async function findOllama(): Promise<string | null> {
  for (const candidate of candidates()) {
    if (await outputOf(candidate.file)) return candidate.file;
  }
  return null;
}

/**
 * Raw `ollama --version` output ("ollama version is 0.40.8"), or null when
 * Ollama isn't installed. Parsing into a version lives in `lib/system.ts`
 * so this stays a dumb, honest passthrough of the binary's own words.
 */
export async function ollamaVersion(): Promise<string | null> {
  const bin = await findOllama();
  return bin === null ? null : outputOf(bin);
}

/**
 * Map an upstream failure to a short human message: Ollama reports some
 * errors as `{error}` JSON (bad tag, context overflow) even on non-2xx,
 * otherwise fall back to the status text.
 */
export async function safeMessage(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json();
    if (
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
    ) {
      return (data as { error: string }).error;
    }
  } catch {
    // not JSON — fall through
  }
  return response.statusText || "Ollama returned an error.";
}
