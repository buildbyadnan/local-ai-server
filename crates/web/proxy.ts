import { NextResponse, type NextRequest } from "next/server";
import { allModels } from "@/data/models";

/** The one shape the API accepts — anything else is refused here, before a
 *  route handler ever touches the body: guards run first, body second. */
function rejectEncoding(): NextResponse {
  return NextResponse.json(
    { error: "Compressed request bodies are not accepted." },
    { status: 415 },
  );
}

/**
 * Two jobs, both in front of the render/handler pipeline:
 *
 *  1. `/api/*` — refuse any `Content-Encoding` other than `identity`
 *     (or absent). This is the standing mitigation for the bundled Brotli
 *     decoder flaw (CVE-2026-111497, "Node2Shell"): the runtime must never
 *     be asked to inflate bytes an attacker controls. Kept even on patched
 *     Node — it costs one header read.
 *
 *  2. `/llama/<slug>` — rewrite unknown slugs to an unmatched path so they
 *     hit the static not-found and return a real 404 status. Without this,
 *     the Partial-Prerender shell flushes 200 before notFound() resolves
 *     (racy).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    const encoding = request.headers.get("content-encoding");
    if (encoding && encoding.trim().toLowerCase() !== "identity") {
      return rejectEncoding();
    }
    return NextResponse.next();
  }

  const slug = pathname.slice("/llama/".length);
  const known = allModels.some((model) => model.slug === slug);
  if (!known) {
    return NextResponse.rewrite(new URL("/__unknown-model__", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/llama/:slug", "/api/:path*"],
};
