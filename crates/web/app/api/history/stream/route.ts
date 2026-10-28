/**
 * GET /api/history/stream — Server-Sent Events, the cross-profile half of
 * realtime history (M12).
 *
 * Three transports, one contract ("history moved, refetch"):
 *
 *   1. **BroadcastChannel** — same profile, other tabs: instant, no server
 *      round-trip. Already in `lib/history.ts`.
 *   2. **This stream** — other *profiles*: they share the SQLite file but
 *      never a BroadcastChannel, so the server relays its write notifications
 *      here (see `onHistoryChange` in `lib/history-db.ts`).
 *   3. **A 4 s poll while visible** — the fallback in `lib/history.ts` when
 *      this connection is down, so history still refreshes without an F5.
 *
 * Guard order matches every other handler: Host first, before anything
 * subscribes. The stream itself carries no payload beyond "changed" — a
 * client that wants the data does the same GET every other client does,
 * so there is one reader path and one validation path.
 */
import { requireLoopbackHost } from "@/lib/ollama";
import { onHistoryChange } from "@/lib/history-db";

/** Beats keep intermediaries from closing an idle stream (never fatal). */
const HEARTBEAT_MS = 25_000;

export async function GET(request: Request): Promise<Response> {
  const denied = requireLoopbackHost(request);
  if (denied) return denied;

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let beat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const push = (chunk: string): void => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // client went away mid-write; the abort handler cleans up
        }
      };

      // Announce ourselves so the client knows the stream is live, then
      // relay every write for as long as this tab stays connected.
      push(`data: ${JSON.stringify({ t: "open" })}\n\n`);
      unsubscribe = onHistoryChange(() => {
        push(`data: ${JSON.stringify({ t: "history" })}\n\n`);
      });
      beat = setInterval(() => push(`: ping\n\n`), HEARTBEAT_MS);

      const close = (): void => {
        if (beat !== null) clearInterval(beat);
        beat = null;
        unsubscribe?.();
        unsubscribe = null;
        try {
          controller.close();
        } catch {
          // already closed/cancelled
        }
      };
      request.signal.addEventListener("abort", close, { once: true });
    },
    cancel() {
      // Tab closed / connection dropped: release the subscription.
      if (beat !== null) clearInterval(beat);
      beat = null;
      unsubscribe?.();
      unsubscribe = null;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // never buffer a push stream
      "X-Accel-Buffering": "no",
    },
  });
}
