import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Local AI Server",
  description:
    "Chat with local models via Ollama — a private, offline AI chat interface.",
};

/**
 * M13 — Geist and Geist Mono are vendored in `public/fonts/` and declared
 * in `globals.css`, so the app never asks a font CDN for anything: no
 * build-time fetch (what `next/font/google` did) and no runtime one.
 *
 * These two hints warm up the latin faces, the ones every English page
 * paints with. React hoists `<link>` into `<head>`; `crossOrigin` is
 * required — fonts always load in CORS mode, so a preload without it
 * would not match the real request and would fetch twice.
 */
function FontPreloads(): ReactNode {
  return (
    <>
      <link
        rel="preload"
        as="font"
        type="font/woff2"
        href="/fonts/geist-latin.woff2"
        crossOrigin="anonymous"
      />
      <link
        rel="preload"
        as="font"
        type="font/woff2"
        href="/fonts/geist-mono-latin.woff2"
        crossOrigin="anonymous"
      />
    </>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <FontPreloads />
        {children}
      </body>
    </html>
  );
}
