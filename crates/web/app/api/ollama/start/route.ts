/**
 * POST /api/ollama/start — spawn `ollama serve`, detached (the Start button's request).
 *
 * Fixed argv, allowlisted binary (the same candidate list the status probe
 * walks), no shell: this is the one process the app starts, and it only
 * exists for the "installed but not running" state. Success means "the
 * process was started" — the client polls /api/ollama/status and reports
 * honestly if it never comes up (port clash, missing GPU, …).
 *
 * Guard order: Host → Origin → body, before anything spawns.
 */
import {
  jsonError,
  readJsonBody,
  requireLocalPost,
  requireLoopbackHost,
} from "@/lib/ollama";
import { startOllama } from "@/lib/ollama-admin";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: Request): Promise<Response> {
  const hostDenied = requireLoopbackHost(request);
  if (hostDenied) return hostDenied;
  const postDenied = requireLocalPost(request);
  if (postDenied) return postDenied;

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const result = await startOllama();
  if (!result.ok) {
    return jsonError(409, result.error);
  }
  return Response.json({ ok: true }, { headers: NO_STORE });
}
