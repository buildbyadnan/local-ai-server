/**
 * POST /api/ollama/rm — delete one installed model, allowlisted.
 *
 * The only destructive command the app may run (M5):
 * `ollama rm <tag>` via execFile with a tag that already passed the
 * registry-tag regex — no shell, no interpolation, no free-form input.
 * Guard order: Host → Origin → body → tag validation → exec.
 */
import {
  isValidTag,
  jsonError,
  readJsonBody,
  requireLocalPost,
  requireLoopbackHost,
} from "@/lib/ollama";
import { removeModel } from "@/lib/ollama-admin";

const NO_STORE = { "Cache-Control": "no-store" };

interface RmBody {
  model?: unknown;
}

export async function POST(request: Request): Promise<Response> {
  const hostDenied = requireLoopbackHost(request);
  if (hostDenied) return hostDenied;
  const postDenied = requireLocalPost(request);
  if (postDenied) return postDenied;

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const tag = (body.value as RmBody | null)?.model;
  if (!isValidTag(tag)) {
    return jsonError(400, "Send the model tag to delete as {\"model\":\"name:tag\"}.");
  }

  const result = await removeModel(tag);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 409, headers: NO_STORE });
  }
  return Response.json({ ok: true, model: tag }, { headers: NO_STORE });
}
