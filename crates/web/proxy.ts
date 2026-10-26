import { NextResponse, type NextRequest } from "next/server";
import { allModels } from "@/data/models";

/**
 * Unknown /llama/<slug> URLs are rewritten to an unmatched path so they hit
 * the static not-found and return a real 404 status. Without this, the
 * Partial-Prerender shell flushes 200 before notFound() resolves (racy).
 */
export function proxy(request: NextRequest) {
  const slug = request.nextUrl.pathname.slice("/llama/".length);
  const known = allModels.some((m) => m.slug === slug);
  if (!known) {
    return NextResponse.rewrite(new URL("/__unknown-model__", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/llama/:slug",
};
