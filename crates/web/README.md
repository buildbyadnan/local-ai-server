# Local AI Server — Web UI

A Next.js 16 chat interface for running local Llama models through
[Ollama](https://ollama.com), part of the `local-ai-server` monorepo. It
companions the [`llama` CLI](../llama-cli) — same product, graphical surface.

> Status: local development tool. Nothing in this crate ships to production;
> Bazel intentionally ignores it (see [Repo fit](#repo-fit)).

## Quick start — run it on your machine

You don't need to know AI, and nothing you type ever leaves your computer:
the app talks to a local server on `127.0.0.1` and stores its chats in a
local database on this machine.

**You need four free things:**

| What                                | Why                                | Where to get it                          |
| ----------------------------------- | ---------------------------------- | ---------------------------------------- |
| **Node.js 22.23.4+**               | runs this web app                  | <https://nodejs.org> — pick the **LTS**   |
| **pnpm 12**                         | downloads the app's packages       | ships with Node: run `corepack enable` once (or `npm install -g pnpm`) |
| **[Ollama](https://ollama.com)**   | the local AI server that runs the models | <https://ollama.com/download>       |
| **~2 GB of disk**                   | room for one small model           | —                                        |

**Then run these in a terminal** (macOS: *Terminal*; Windows: *PowerShell*):

```bash
git clone https://github.com/buildbyadnan/local-ai-server.git
cd local-ai-server/crates/web

pnpm install          # 1. fetch the app's packages (only the first time)
ollama pull llama3.2  # 2. download a small model, ~2 GB (only the first time)
pnpm dev              # 3. start the app
```

No `git`? Click **Code → Download ZIP** on GitHub, unzip it, and start from
the unzipped `crates/web` folder.

Start **Ollama** too, if it isn't already running: open the Ollama app
(macOS/Windows), or run `ollama serve` in a terminal on Linux.

Then open **<http://127.0.0.1:3000>** in your browser.

**You'll know it's working when:**

- the sidebar's **OLLAMA** row reads `● Connected`;
- the right-hand panel lists `llama3.2:latest` — click it to select it;
- a message you type streams a reply, and it shows up under **CHAT HISTORY**
  as a session you can reopen (saved on this machine, never uploaded).

Press `Ctrl+C` in the terminal to stop the app.

### Something not working?

| You see                                             | Do this                                                                 |
| --------------------------------------------------- | ----------------------------------------------------------------------- |
| `EBADENGINE` / `Unsupported engine` on `pnpm install` | Your Node is too old — install 22.23.4+ (see above), then `pnpm install` again |
| `pnpm: command not found`                           | `npm install -g pnpm`, then run `pnpm install` again                    |
| The pill says **Not installed**                     | Install Ollama from <https://ollama.com/download>, then reload the page |
| The pill says **Not running**                       | Start Ollama (`ollama serve`, or open the app), then click **Re-check** |
| No model in the picker                              | `ollama pull llama3.2`, then click **Re-check**                          |
| `Port 3000 is already in use`                       | Run `pnpm exec next dev -p 3001` and open <http://127.0.0.1:3001>       |
| `Cannot find module …` or the install looks broken   | Delete `node_modules/` and run `pnpm install` once more                 |
| A reply never finishes                              | The chat shows an honest error with **Retry** — check Ollama is running |

## Commands

```bash
pnpm install     # once
pnpm dev         # http://127.0.0.1:3000
pnpm lint        # eslint (core-web-vitals + TS)
pnpm test        # vitest unit suite
pnpm build       # production build (33 routes)
pnpm start       # serve the production build (bound to 127.0.0.1)
```

Requires Node **22.23.4 or newer** (Node 24 LTS also works; anything older
is affected by the October 2026 Brotli RCE, CVE-2026-111497, so `package.json`
declares `engines.node: ">=22.23.4"`) and pnpm 12 (pinned via `packageManager`).
Check yours with `node -v`; to upgrade without touching the system install:

```bash
curl -fsSL https://nodejs.org/dist/v22.23.4/node-v22.23.4-linux-x64.tar.xz | tar -xJ -C "$HOME/.local"
export PATH="$HOME/.local/node-v22.23.4-linux-x64/bin:$PATH"   # add to ~/.bashrc
node -v   # v22.23.4
```

## What's in the box

| Route            | Contents                                                              |
| ---------------- | --------------------------------------------------------------------- |
| `/`              | Three-panel chat shell: sidebar, empty chat, AI Module model tree      |
| `/llama`         | Directory of all 19 Llama models in three size tiers                   |
| `/llama/[slug]`  | Plain-English guide per model (what it is, flaws, who should use it)    |
| `/api/ollama/*`  | Same-origin proxy to the local Ollama server: status, chat, pull       |
| anything else    | Styled 404 (`proxy.ts` gates unknown slugs to a real HTTP 404)         |

```
app/                  Routes + the single stylesheet (globals.css)
  llama/[slug]/       The 19 model guides (static params, plain language)
  api/ollama/         Status / streaming chat / pull — proxying OLLAMA_HOST
components/           ModelProvider, Sidebar (nav + session history), CenterChat,
                      AiModule (model tree + picker), Pull, OllamaStatus, Footer,
                      ChatText (the reply markdown renderer)
data/models/          Single source of truth for every model: tree, directory,
                      sibling links and generateStaticParams all derive from it
lib/                  Pure helpers + their unit tests: ndjson, match, history
                      (SQLite session store), markdown (reply renderer),
                      ollama (tag validation, status fetch)
proxy.ts              Rewrites unknown /llama/<slug> to the static 404
```

The chat is wired to Ollama on this machine: `/api/ollama/*` route handlers
proxy the local server, replies stream token by token, models install
straight from the tree, and conversations persist to a SQLite file on disk
(`lib/history-db.ts`, shared by every browser profile on the machine).
Replies render as markdown — code blocks, headings, lists and bold all land
as real elements. Nothing leaves the machine — no cloud, no accounts.

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

Styling is one hand-rolled stylesheet (tokens → fonts → minimal reset →
components), no CSS framework. The layout is edge-to-edge: the shell fills
the viewport's length and breadth, columns scale in four breakpoints with
the chat absorbing the rest, and below 620px the panels stack into one
column with the credit bar pinned to the bottom. Every page ends with the
credit line **Developed by Adnan · github.com/buildbyadnan**.

### Nothing leaves this machine

The app talks only to Ollama on `127.0.0.1` — and the build does too:

- **Fonts are vendored.** Geist + Geist Mono live in `public/fonts/` (11
  woff2 subsets, ~160 KB) with their `@font-face` rules in `globals.css`.
  `next/font/google` fetches from Google *at build time*; these are the
  same files it downloaded, so type renders identically with the network
  unplugged. The two latin faces are preloaded in `app/layout.tsx`.
- **Next.js's own phone-home is switched off** in `next.config.ts`:
  telemetry (on by default) and `experimental.agentUpgrade` (defaults to
  `"security"`, which POSTs advisories to `registry.npmjs.org` on every
  build).

Verified, not asserted: a full `next build` under `strace` with a global
`fetch()` hook makes **0 outbound sockets, 0 DNS queries, 0 fetch calls**,
and the browser-side offline audit walks the chat, directory and guide
pages, streams a real reply and holds the history stream open — every one
of its ~110 requests goes to `127.0.0.1`.

## Repo fit

- **Bazel**: `.bazelignore` excludes this crate — `bazel build //...` stays
  scoped to the Rust binary, and package discovery never crawls
  `node_modules`. This crate builds with pnpm.
- **CI**: `.github/workflows/ci.yml` runs `pnpm lint` + `pnpm test` +
  `pnpm build` alongside the Cargo test matrix.
- **Never commit** `node_modules/`, `.next/` — handled by `.gitignore`.
