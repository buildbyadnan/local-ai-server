/**
 * POST /api/ollama/pull — validated passthrough of an Ollama model pull.
 *
 * Progress is Ollama's NDJSON (`{status, digest, total, completed}` lines,
 * failures as `{error}` on HTTP 200) — piped through byte-for-byte and
 * parsed client-side. Cancel = the browser aborts the fetch, which aborts
 * this handler via `request.signal` and closes the upstream connection.
 */
import {
  isValidTag,
  jsonError,
  ollamaFetch,
  readJsonBody,
  requireLocalPost,
  requireLoopbackHost,
  safeMessage,
} from "@/lib/ollama";

export async function POST(request: Request): Promise<Response> {
  const hostDenied = requireLoopbackHost(request);
  if (hostDenied) return hostDenied;
  const postDenied = requireLocalPost(request);
  if (postDenied) return postDenied;

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const value = body.value;
  const model =
    typeof value === "object" && value !== null
      ? (value as { model?: unknown }).model
      : undefined;
  if (!isValidTag(model)) {
    return jsonError(400, "`model` must be a model name like llama3.1:8b.");
  }

  let upstream: Response;
  try {
    upstream = await ollamaFetch("/api/pull", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, stream: true }),
      signal: request.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return new Response(null, { status: 499 });
    }
    return jsonError(503, "Ollama isn't running.");
  }

  if (!upstream.ok || !upstream.body) {
    return jsonError(502, await safeMessage(upstream));
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store, no-transform",
    },
  });
}
