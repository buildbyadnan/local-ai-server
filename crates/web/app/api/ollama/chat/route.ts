/**
 * POST /api/ollama/chat — validated passthrough of a streaming chat request.
 *
 * Guards → byte cap → shape validation → upstream fetch with
 * `request.signal` wired through, so the browser's Stop/navigation abort
 * reaches Ollama and stops generation (CONNECTIVITY_PLAN §3.4/§3.5).
 * Ollama's own `{"error"}` lines arrive on HTTP 200 and flow through
 * untouched; transport failures map to 503/502 before streaming starts.
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

const MAX_MESSAGES = 100;
const MAX_CONTENT = 32_000;
const ROLES = new Set(["user", "assistant", "system"]);

interface ForwardableChat {
  model: string;
  messages: Array<{ role: string; content: string }>;
}

function validateChat(value: unknown): ForwardableChat | string {
  if (typeof value !== "object" || value === null) {
    return "Send a JSON object with `model` and `messages`.";
  }
  const body = value as { model?: unknown; messages?: unknown };
  if (!isValidTag(body.model)) {
    return "`model` must be a model name like llama3.1:8b.";
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return "`messages` must be a non-empty array.";
  }
  if (body.messages.length > MAX_MESSAGES) {
    return `Too many messages (limit ${MAX_MESSAGES}).`;
  }
  const messages: ForwardableChat["messages"] = [];
  for (const entry of body.messages) {
    if (typeof entry !== "object" || entry === null) {
      return "Each message must be an object with `role` and `content`.";
    }
    const message = entry as { role?: unknown; content?: unknown };
    if (typeof message.role !== "string" || !ROLES.has(message.role)) {
      return "Each message `role` must be user, assistant, or system.";
    }
    if (typeof message.content !== "string") {
      return "Each message `content` must be a string.";
    }
    if (message.content.length > MAX_CONTENT) {
      return `A message is too long (limit ${MAX_CONTENT} characters).`;
    }
    messages.push({ role: message.role, content: message.content });
  }
  return { model: body.model, messages };
}

export async function POST(request: Request): Promise<Response> {
  const hostDenied = requireLoopbackHost(request);
  if (hostDenied) return hostDenied;
  const postDenied = requireLocalPost(request);
  if (postDenied) return postDenied;

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const validated = validateChat(body.value);
  if (typeof validated === "string") return jsonError(400, validated);

  let upstream: Response;
  try {
    upstream = await ollamaFetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validated, stream: true }),
      signal: request.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      // Client went away mid-connect — quiet, like any cancelled request.
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
