/**
 * The only operations this app ever performs against the Ollama
 * installation — and the only child processes it may start.
 *
 * Rules (CONNECTIVITY_PLAN §4.4 / decisions):
 *  - allowlisted argv only: a fixed subcommand plus a tag that already
 *    passed `isValidTag`, executed with `execFile` (no shell, no string
 *    interpolation, no PATH guessing beyond the same candidate list the
 *    status probe uses);
 *  - installers are never executed (they need root and this app has no
 *    business elevating) — the UI hands the user a copyable command;
 *  - `start` only ever runs `ollama serve`, detached, with this app's own
 *    OLLAMA_* overrides stripped so a stock local server comes up.
 */
import { execFile, spawn } from "node:child_process";
import { base, findOllama, isValidTag } from "@/lib/ollama";
import { STOCK_HOST, isStockLocalHost } from "@/lib/host";

export { STOCK_HOST, isStockLocalHost };

export type AdminResult = { ok: true } | { ok: false; error: string };

/**
 * `ollama rm <tag>` — validated tag, fixed argv, bounded runtime.
 *
 * Also refuses to run when this app instance is pointed anywhere but the
 * stock local server: the binary we'd exec is the real one on this
 * machine, so against a QA stand-in or a remote host the command would
 * delete from the *wrong* Ollama entirely (the model list we're showing
 * isn't even that server's). Same rule as Start, enforced server-side.
 */
export async function removeModel(tag: string): Promise<AdminResult> {
  if (!isStockLocalHost(base())) {
    return {
      ok: false,
      error: "Deletion only runs against the local Ollama (127.0.0.1:11434).",
    };
  }
  if (!isValidTag(tag)) {
    return { ok: false, error: "That model tag isn't one this app will run." };
  }
  const bin = await findOllama();
  if (!bin) {
    return { ok: false, error: "Ollama isn't installed on this machine." };
  }
  return new Promise<AdminResult>((resolve) => {
    execFile(
      bin,
      ["rm", tag],
      { timeout: 20_000, env: process.env, maxBuffer: 1024 * 1024 },
      (error, _stdout, stderr) => {
        if (error) {
          const text = (stderr || error.message || "").trim().slice(0, 300);
          resolve({ ok: false, error: text || `ollama rm failed (${error.code ?? "error"}).` });
        } else {
          resolve({ ok: true });
        }
      },
    );
  });
}

/**
 * Spawn a detached `ollama serve`. Success here means "the process was
 * started", never "Ollama is up" — the caller polls `/api/ollama/status`
 * and reports honestly either way (a port clash or a missing GPU exit
 * immediately, and the poll simply never sees `running`).
 */
export async function startOllama(): Promise<AdminResult> {
  const bin = await findOllama();
  if (!bin) {
    return { ok: false, error: "Ollama isn't installed on this machine." };
  }
  try {
    const env: NodeJS.ProcessEnv = { ...process.env };
    // A stock local server, whatever this app instance is pointed at.
    delete env.OLLAMA_HOST;
    delete env.OLLAMA_BIN_PATHS;
    const child = spawn(bin, ["serve"], { detached: true, stdio: "ignore", env });
    child.unref();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Couldn't start Ollama.",
    };
  }
}
