# Local AI Server — Web UI

A Next.js 16 chat interface for running local Llama models through
[Ollama](https://ollama.com), part of the `local-ai-server` monorepo. It
companions the [`llama` CLI](../llama-cli) — same product, graphical surface.

> Status: local development tool. Nothing in this crate ships to production;
> Bazel intentionally ignores it (see [Repo fit](#repo-fit)).

## Run it

```bash
pnpm install     # once
pnpm dev         # http://localhost:3000
pnpm lint        # eslint (core-web-vitals + TS)
pnpm build       # production build (25 routes)
pnpm start       # serve the production build
```

Requires Node 20+ and pnpm 12 (pinned via `packageManager`).

## What's in the box

| Route            | Contents                                                              |
| ---------------- | --------------------------------------------------------------------- |
| `/`              | Three-panel chat shell: sidebar, empty chat, AI Module model tree      |
| `/llama`         | Directory of all 19 Llama models in three size tiers                   |
| `/llama/[slug]`  | Plain-English guide per model (what it is, flaws, who should use it)    |
| anything else    | Styled 404 (`proxy.ts` gates unknown slugs to a real HTTP 404)         |

```
app/                  Routes + the single stylesheet (globals.css)
  llama/[slug]/       The 19 model guides (static params, plain language)
components/           Sidebar (nav + raw-JSON AI History), CenterChat, AiModule
data/                 chat-sessions.ts (history demo data)
  models/             Single source of truth for every model: tree, directory,
                      sibling links and generateStaticParams all derive from it
proxy.ts              Rewrites unknown /llama/<slug> to the static 404
```

The UI is fully static — no backend, no network calls, no data leaves the
machine. The chat answers are canned; wiring it to Ollama/the `llama` CLI is
the next milestone (connectivity plan in progress).

## Architecture notes (Next.js 16)

This app uses Cache Components + Partial Prefetching. Two deliberate
configurations that look odd but are load-bearing:

- **`app/llama/[slug]/page.tsx` sets `export const instant = false`.** The
  route must `await params` high in the tree so a bogus slug can call
  `notFound()` *before* streaming starts — a mid-stream 404 can only return
  `200 + noindex` (Next docs: streaming status codes). `instant = false` is
  the sanctioned way to allow that blocking behavior without instant-nav
  console insights.
- **`proxy.ts` is the deterministic 404 gate.** Even with the above, the
  prerendered shell could flush `200` before `notFound()` resolved (racy on
  cold caches). The proxy rejects unknown slugs before rendering, so invalid
  URLs always return a real `404`.

Styling is one hand-rolled stylesheet (tokens → minimal reset → components),
no CSS framework. Layout fills the viewport ≥861px (slim `--gut` frame,
internal panel scrolling) and falls back to natural page scroll below that.

## Repo fit

- **Bazel**: `.bazelignore` excludes this crate — `bazel build //...` stays
  scoped to the Rust binary, and package discovery never crawls
  `node_modules`. This crate builds with pnpm.
- **CI**: `.github/workflows/ci.yml` runs `pnpm lint` + `pnpm build` alongside
  the Cargo test matrix.
- **Never commit** `node_modules/`, `.next/` — handled by `.gitignore`.
