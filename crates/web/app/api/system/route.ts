/**
 * GET /api/system — a fresh snapshot for the System-info dialog
 * (M5).
 *
 * Request-time by construction: the Host guard reads
 * `request.headers` first, so no prerender can ever run the collectors,
 * and every collector below is a value — no segment-config exports.
 */
import { requireLoopbackHost } from "@/lib/ollama";
import { collectSystem } from "@/lib/system";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: Request): Promise<Response> {
  const denied = requireLoopbackHost(request);
  if (denied) return denied;

  try {
    const report = await collectSystem();
    return Response.json(report, { headers: NO_STORE });
  } catch {
    // Defensive: collectors swallow their own failures, so reaching here
    // means something unexpected broke. Say so instead of lying.
    return Response.json(
      { error: "Couldn't read this machine's details." },
      { status: 500, headers: NO_STORE },
    );
  }
}
