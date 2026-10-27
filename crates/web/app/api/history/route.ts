/**
 * /api/history — the one door to the server-side history DB (M7).
 *
 *   GET    → `{ sessions: ChatSession[] }`, newest first (store shape)
 *   POST   → save one draft `{"id","model","messages"}` → `{ session }`,
 *            or migrate an old browser's storage with `{"import":[…]}`
 *            → `{ imported }` (the only path that keeps old timestamps)
 *   DELETE → `?id=…` one session, or `?all=1` everything → `{ deleted }`
 *
 * Guard order §3.3, in every handler: Host → Origin/POST → body →
 * validation → disk. `DELETE` deliberately requires `?all=1` for the
 * wipe: a client that loses track of a query string can wipe by accident,
 * and history deletion is irreversible.
 */
import {
  jsonError,
  readJsonBody,
  requireLocalOrigin,
  requireLocalPost,
  requireLoopbackHost,
} from "@/lib/ollama";
import {
  deleteAll,
  deleteSession,
  importSessions,
  listSessions,
  parseSaveDraft,
  saveSession,
} from "@/lib/history-db";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Migration payloads carry up to 20 sessions × 100 messages; the default
 * 1 MiB body cap would reject exactly the one upload it exists for.
 * Still bounded (32 MiB), still Host/Origin guarded before the read.
 */
const MAX_BODY = 32 * 1024 * 1024;

export async function GET(request: Request): Promise<Response> {
  const denied = requireLoopbackHost(request);
  if (denied) return denied;
  return Response.json({ sessions: listSessions() }, { headers: NO_STORE });
}

export async function POST(request: Request): Promise<Response> {
  const hostDenied = requireLoopbackHost(request);
  if (hostDenied) return hostDenied;
  const postDenied = requireLocalPost(request);
  if (postDenied) return postDenied;

  const body = await readJsonBody(request, MAX_BODY);
  if (!body.ok) return body.response;

  const value = body.value;
  if (typeof value === "object" && value !== null && "import" in value) {
    const imported = importSessions((value as { import: unknown }).import);
    return Response.json({ imported }, { headers: NO_STORE });
  }

  const draft = parseSaveDraft(value);
  if (draft === null) {
    return jsonError(
      400,
      'Send a session draft as {"id","model","messages"} with valid messages.',
    );
  }
  return Response.json({ session: saveSession(draft) }, { headers: NO_STORE });
}

export async function DELETE(request: Request): Promise<Response> {
  const hostDenied = requireLoopbackHost(request);
  if (hostDenied) return hostDenied;
  const originDenied = requireLocalOrigin(request);
  if (originDenied) return originDenied;

  const params = new URL(request.url).searchParams;
  const id = params.get("id");
  if (id !== null) {
    return Response.json(
      { deleted: deleteSession(id) ? 1 : 0 },
      { headers: NO_STORE },
    );
  }
  if (params.get("all") === "1") {
    return Response.json({ deleted: deleteAll() }, { headers: NO_STORE });
  }
  return jsonError(400, "Pass ?id=… to delete one chat or ?all=1 to delete all.");
}
