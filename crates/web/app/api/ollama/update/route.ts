/**
 * GET /api/ollama/update — what the Update dialog reports.
 *
 * Without a query it answers fast and offline: just this machine's
 * `ollama --version`. `?check=1` additionally asks GitHub's releases API
 * for the newest version; a network failure is reported as an honest
 * "couldn't check" (the dialog never guesses a version it didn't see).
 *
 * Guard order per §3.3: Host first, before any process/network work.
 */
import { ollamaVersion, requireLoopbackHost } from "@/lib/ollama";
import { parseOllamaVersion } from "@/lib/system";
import { compareVersions } from "@/lib/format";

const NO_STORE = { "Cache-Control": "no-store" };

export interface UpdateReport {
  /** This machine's version, null when Ollama isn't installed. */
  current: string | null;
  /** Whether a release lookup was attempted. */
  checked: boolean;
  /** Newest release tag, null when unknown or the check failed. */
  latest: string | null;
  /** true/false only when both versions are known, else null. */
  updateAvailable: boolean | null;
  /** Why the check failed, in plain words. */
  error: string | null;
}

const RELEASES = "https://api.github.com/repos/ollama/ollama/releases/latest";

async function latestRelease(): Promise<{ tag: string } | { error: string }> {
  let response: Response;
  try {
    response = await fetch(RELEASES, {
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": "local-ai-server",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
  } catch {
    return { error: "Couldn't reach github.com — you may be offline." };
  }
  if (!response.ok) {
    return {
      error:
        response.status === 403 || response.status === 429
          ? "GitHub rate-limited this machine — try again in a few minutes."
          : `GitHub answered HTTP ${response.status} — try again later.`,
    };
  }
  const data = (await response.json().catch(() => null)) as { tag_name?: unknown } | null;
  const raw = typeof data?.tag_name === "string" ? data.tag_name : "";
  const tag = parseOllamaVersion(raw) ?? (raw.trim() || null);
  return tag ? { tag } : { error: "GitHub's answer didn't include a version." };
}

export async function GET(request: Request): Promise<Response> {
  const denied = requireLoopbackHost(request);
  if (denied) return denied;

  const current = parseOllamaVersion(await ollamaVersion());
  const report: UpdateReport = {
    current,
    checked: false,
    latest: null,
    updateAvailable: null,
    error: current === null ? "Ollama isn't installed on this machine." : null,
  };

  const params = new URL(request.url).searchParams;
  if (params.get("check") !== "1") {
    return Response.json(report, { headers: NO_STORE });
  }
  if (current === null) {
    return Response.json(report, { headers: NO_STORE });
  }

  const release = await latestRelease();
  if ("error" in release) {
    report.error = release.error;
    return Response.json(report, { headers: NO_STORE });
  }

  report.checked = true;
  report.latest = release.tag;
  report.updateAvailable = compareVersions(release.tag, current) > 0;
  report.error = null;
  return Response.json(report, { headers: NO_STORE });
}
