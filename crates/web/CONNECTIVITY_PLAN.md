# Plan — Local AI Server: UI ↔ Ollama / `llama` CLI connectivity

Status: **revised after audit round 1 of 3** — every round-1 finding folded in;
next: round 2 audit, revise, round 3 audit, revise, then implement.
Scope: turn the static web UI into a working local chat product: detect
Ollama, guide installation, show the models already on this machine, let the
user select and chat with them (real streaming), and pull new models from the
catalog — all local, nothing shipped to production.

---

## 0. Revision log (round 1 → this draft)

| # | Finding (audit) | Fix in this draft |
|---|---|---|
| 1 | **BLOCKER** request-time mechanism never pinned (Next.js) | §3.4 — pinned with doc citations; segment-config exports forbidden |
| 2 | **BLOCKER** `ndjsonPipe(ollamaRes, res)` API doesn't exist (Next.js) | §4.1 — `new Response(upstream.body, …)` passthrough specified exactly |
| 3 | **BLOCKER** "live status" wasn't actually live (product) | §5.1 — visibility/focus/interval polling spec |
| 4 | **BLOCKER** sessions saved but never restorable (product) | §5.5 — load-on-mount, restore-latest, click-to-open |
| 5 | **BLOCKER** `pnpm start -- -H 127.0.0.1` broken (hygiene) | §4.4 — correct `pnpm exec next start -H 127.0.0.1` |
| 6 | **BLOCKER** wrong vision tags (hygiene/product) | §6 — `llama3.2-vision:11b` / `llama3.2-vision:90b` |
| 7 | **BLOCKER** `localStorage` read during render breaks `next build` (hygiene) | §5.5 — mount-only reads, pure `filterSessions(sessions, query)` |
| 8 | **BLOCKER** M2 ↔ M4 milestone contradiction on history (hygiene) | §9 — persistence owned solely by M4 |
| 9 | Abort propagation to Ollama unspecified (Next.js) | §3.5 — `request.signal` wiring |
| 10 | `cache: 'no-store'` + `Cache-Control: no-store` (Next.js) | §4.1–4.2 |
| 11 | gzip may buffer NDJSON (Next.js) | §4.1 + QA §10.2 latency check, `compress: false` escape hatch |
| 12 | `ModelContext` mounting in a server component (Next.js) | §5.2 — `"use client"` `ModelProvider` wrapper |
| 13 | Client NDJSON line-buffering details (Next.js) | §5.3 — TextDecoder + split-safe line buffer |
| 14 | Origin/content-type CSRF guard + body cap (hygiene) | §4.2 |
| 15 | `:latest`/parameter-size matching promoted to v1 (product/hygiene) | §6 — port `catalog_entry_for` |
| 16 | Starter default wrong: catalog default is `llama3.1:8b` (hygiene) | §6 |
| 17 | Pull UX: one-at-a-time, `Σcompleted/Σtotal`, size hints (product) | §5.4 |
| 18 | Model-switch confirm + auto-select rules (product) | §5.2, §5.4 |
| 19 | Install-guide space math + OS detection (product) | §5.1 — collapsed-by-default, detected-OS command first |
| 20 | `.desc` copy lie; empty-history `[]`; full copy table (product/hygiene) | §5.2, §5.5, §8 |
| 21 | State matrix gaps: multi-tab, quota, corrupt JSON, context overflow, stale model, double-submit (product) | §7 |
| 22 | vitest unit tests + `pnpm test` CI step (hygiene) | §10.3 |
| 23 | README left claiming "static, canned" (hygiene) | §9 — M4 updates `crates/web/README.md` |
| 24 | Forbidden-string list undefined; a11y rows; route counts; screenshot baselines (hygiene) | §10.4–10.6 |

---

## 1. Product thinking

**Who it's for.** Someone who installed this repo and wants a GUI over the
same local stack the `llama` CLI drives. The CLI already proves the product:
a thin client to a local Ollama server. The UI becomes the second client.

**Principles (carried over from v1):**
- Local-only: no cloud, no accounts, no telemetry; data stays in the browser.
- Honest states: never pretend a model answered when nothing ran.
- Plain language: install/status/pull copy for humans, not operators (§8 is
  the before→after copy contract).
- No unnecessary code: every file earns its place.

**The user journey this plan delivers:**
1. Open the UI on a machine with **no Ollama** → a collapsed **Ollama** section
   directly below the sidebar's *Plugins* item explains how to install it
   (detected-OS command first), with a live status pill and Re-check.
2. Ollama **installed but not running** → told how to start it on *their* OS.
3. Ollama **running** → the models already on this machine appear first in the
   picker, pre-selecting one.
4. User **selects a model and chats** → real token streaming, Stop, sessions
   saved locally and restorable.
5. User wants a model they **don't have** → Pull from the tree with live
   progress → auto-select → chat.

**What we deliberately do NOT build:** remote servers, auth/multi-user, model
deletion, parameter tuning, TLS, deployment. The `llama` CLI keeps its role as
the terminal client; no Rust changes are required for v1.

---

## 2. Ground truth (verified on this machine, Oct 2026)

- Ollama **0.40.8** installed (`/usr/local/bin/ollama`), `ollama serve`
  running; models present: **llama3.1:8b** (4.9 GB), **llama3.2:latest**
  (2.0 GB); nothing loaded (`/api/ps` → empty).
- The `llama` CLI is a thin HTTP client over `http://127.0.0.1:11434`
  (host via `--host` / `OLLAMA_HOST`) using exactly `GET /api/tags`,
  `POST /api/generate`, `POST /api/chat` (NDJSON: `{message:{content},
  done, error}`).
- `catalog.rs`: `DEFAULT_TAG = "llama3.1:8b"` (line 162);
  `catalog_entry_for(installed)` (line 206) matches an installed model to a
  catalog entry by exact tag **or** by `details.parameter_size` — this logic
  is ported to the web in §6.
- Ollama pull API (docs.ollama.com, v0.40.8): `POST /api/pull`
  `{"model": "<tag>"}` streams NDJSON: `{"status":"pulling manifest"}` →
  `{"status":"downloading <digest>","digest","total","completed"}` →
  `{"status":"success"}`; failures arrive as `{"error": "..."}` lines on
  HTTP 200. Content type `application/x-ndjson`.
- The web's 19-model guide registry (`data/models/`) has no Ollama tags today
  — mapping added in §6. Tag correctness is verified against
  **ollama.com/library** during the build (an uninstalled tag cannot be
  checked with `ollama show` — it only knows local models).

---

## 3. Architecture

```
┌────────────────────────────── browser ──────────────────────────────┐
│ Sidebar (Ollama status)    AI Module (picker + tree)    Chat (NDJSON)│
└───────────────┬───────────────────────┬─────────────────────────────┘
                │ same-origin fetch()   │ (no CORS — server-side proxy)
┌───────────────▼───────────────────────▼─────────────────────────────┐
│ Next.js route handlers  app/api/ollama/*   (part of crates/web)     │
│  · base URL ONLY from OLLAMA_HOST env (same convention as the CLI)  │
│  · fixed paths — client can never choose the target (no SSRF)       │
│  · Origin/content-type guard + 1 MiB body cap on every POST         │
│  · upstream NDJSON body returned through unmodified                 │
└───────────────┬─────────────────────────────────────────────────────┘
                │ plain HTTP 127.0.0.1:11434
        ┌───────▼────────┐          ┌──────────────────┐
        │  ollama serve   │ ◄─────── │  llama CLI        │ (sibling client,
        └────────────────┘          │  same API, same   │  unchanged)
                                    │  host convention  │
                                    └──────────────────┘
```

**Why proxy through route handlers instead of calling Ollama from the
browser:** (a) no dependence on Ollama's `OLLAMA_ORIGINS` CORS defaults,
(b) the base URL is server-fixed via env — a malicious page can't aim our
handler at an arbitrary host, (c) one place maps Ollama errors to honest UI
states, (d) streaming passthrough is trivial server-side.

**CLI relationship:** both clients speak the identical API and share
conventions. The web re-implements ~3 endpoints in TypeScript rather than
shelling the binary — `llama chat` is an interactive TTY unsuitable for a
server process, `llama models` prints human text. v1 = zero Rust changes.

### 3.1 Route map (new: `app/api/ollama/*`)

| Route | In | Out |
|---|---|---|
| `GET /api/ollama/status` | – | `{installed, running, host, models[], loaded[]}` JSON |
| `POST /api/ollama/chat` | `{model, messages[]}` | NDJSON stream (Ollama passthrough) |
| `POST /api/ollama/pull` | `{model}` | NDJSON progress (Ollama passthrough) |

### 3.2 Shared server helper — `lib/ollama.ts` (server-only)

- `base()` → `process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434"`, trimmed
  of trailing `/` (identical fallback to the CLI's clap default).
- `requireLocalPost(request)` — shared guard for both POST routes: rejects
  unless method is POST, `Content-Type` starts with `application/json`, and
  `Origin`/`Referer` (when present) match this request's own host. Rationale:
  the handlers are an unauthenticated localhost proxy; a random other page on
  the user's machine must not be able to drive Ollama through us. Response:
  `400/403 {error}` as appropriate.
- `readJsonBody(request, maxBytes = 1 MiB)` — reads the request stream with a
  running byte counter; over the cap → `413 {error}` before parsing. Bounds
  memory in a tool with no auth.
- `isValidTag(tag)` — `^[a-z0-9][a-z0-9._/-]{0,127}(?::[A-Za-z0-9._-]{1,64})?$`.
  Only validated tags are ever placed into the upstream JSON (no path or
  content injection possible; upstream paths are fixed anyway).
- `ollamaFetch(path, init, timeoutMs)` — `fetch(base() + path, {cache:
  "no-store", signal, ...init})` with AbortSignal timeouts (2 s for status,
  none for streams). Rejects fast when Ollama is down.

### 3.3 Request-time semantics — pinned (audit #1)

Under `cacheComponents: true`, per `01-app/01-getting-started/15-route-handlers.md`
(lines 87–124): GET route handlers **run at request time by default** and are
prerendered only when they touch nothing dynamic; prerendering stops if the
handler accesses **network requests**, request-object properties, or
`connection()`. Our status handler always performs a network request to
Ollama, so it can never be a build-time snapshot.

**Rules for the implementation (no exceptions):**
- Do **not** export any segment config from `app/api/**/route.ts` —
  `dynamic`, `revalidate`, and `runtime` are deprecated/erroneous under
  Cache Components in this version. Request-time behavior comes from touching
  the network/request, not from config flags.
- Status responses send `Cache-Control: no-store`; the fetches use
  `cache: "no-store"` so neither the Next data cache nor the browser holds a
  stale pill.
- Acceptance test (QA §10.2): `GET /api/ollama/status` reflects live Ollama
  state after `ollama serve` is killed/restarted, with no rebuild.

### 3.4 Streaming passthrough — exact pattern (audit #2)

Route handlers return a `Response`; there is no Node-style `res` piping API.

```ts
// app/api/ollama/chat/route.ts (sketch — the authoritative shape)
const upstream = await fetch(`${base()}/api/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ model, messages, stream: true }),
  signal: request.signal,          // §3.5 — client abort reaches Ollama
});
if (!upstream.ok || !upstream.body) {
  return Response.json({ error: await safeMessage(upstream) }, { status: 502 });
}
return new Response(upstream.body, {
  headers: {
    "Content-Type": "application/x-ndjson",
    "Cache-Control": "no-store, no-transform",
  },
});
```

- Ollama reports some errors (bad tag, context overflow) as `{"error"}`
  lines on HTTP 200 — these flow through untouched and are parsed client-side
  (§5.3). Transport-level failures (connection refused) never reach this
  point; they're mapped to `503 {error}` before streaming starts.
- **No compression on these routes.** `no-transform` tells downstream
  middleware not to re-encode; if QA §10.2 measures first-byte latency from
  gzip buffering of small NDJSON chunks, set `compress: false` in
  `next.config.ts` as the documented escape hatch (whole-server tradeoff —
  only if measured, not preemptively).

### 3.5 Abort propagation (audit #3)

Browser `AbortController.abort()` (Stop button, navigation away) cancels the
in-flight route-handler request; passing `request.signal` into the upstream
`fetch` propagates that cancellation to Ollama so it stops generating instead
of burning GPU for a dead socket. Wire it in **both** streaming routes.
Acceptance: Stop mid-stream → `ollama ps` shows the model going idle; no
"aborted fetch" stack traces in the Next server log (the abort is caught and
the handler returns quietly).

### 3.6 Serving locally (audit #5 — corrected command)

```bash
pnpm dev                          # dev, http://localhost:3000
pnpm exec next start -H 127.0.0.1 # production build, loopback only
```

**Not** `pnpm start -- -H 127.0.0.1`: pnpm's `--` forwarding to `next start`
is unreliable (the `--` can reach the binary itself), and `next start` binds
`0.0.0.0` by default — which would expose the unauthenticated proxy beyond
the machine. `-H 127.0.0.1` is mandatory for the production serve; document it
in `crates/web/README.md` (M4).

---

## 4. Backend behavior details

### 4.1 `GET /api/ollama/status`

1. `installed`: `execFile("ollama", ["--version"], { timeout: 2000 })` —
   Node's `execFile` never spawns a shell (no injection), args are a fixed
   array, and route handlers default to the Node runtime (Node APIs like
   `node:child_process` are available; verify no `edge` segment config exists
   — §3.3 forbids them). Failure → `installed: false`.
2. `running`: `GET /api/tags` via `ollamaFetch(..., 2000)`; failure →
   `running: false`.
3. `models`: `tags.models[]` mapped to `{name, size, parameterSize,
   quantization, installedAt}`; `[]` when down.
4. `loaded`: `GET /api/ps` → names of models currently in memory; `[]` on
   failure.
5. Every field has a fallback (`false` / `[]` / host string) — the UI never
   renders `undefined`.

### 4.2 `POST /api/ollama/chat`

- Guard (`requireLocalPost`) → `readJsonBody` (1 MiB) → validate:
  `model` passes `isValidTag`; `messages` is an array ≤ 100 entries, each
  `{role: user|assistant|system, content: string ≤ 32 000 chars}`.
  Violation → `400 {error: "<plain-English reason>"}` **before** any
  upstream call.
- Ollama unreachable → `503 {error}` (the UI renders this as the "not
  running" notice, never as a fake reply).
- Otherwise → passthrough per §3.4.

### 4.3 `POST /api/ollama/pull`

- Same guards; `model` must pass `isValidTag` (rejects path tricks).
- Passthrough per §3.4. Cancel = client aborts fetch (§3.5); Ollama finishes
  or resumes the download on its own — the UI says so honestly (§8).

### 4.4 Payload-caps philosophy

Caps are guard rails for an unauthenticated localhost tool (memory + abuse
bounds), not security theater — stated as such in code comments so a future
reader doesn't mistake them for a security boundary.

---

## 5. UI changes, section by section

### 5.1 Sidebar — new "OLLAMA" section (directly below *Plugins*)

**Space math (audit #19):** desktop sidebar inner height ≈ 840 px @1440×900
and ≈ 708 px @1366×768, with existing content ≈ 325 px closed / ≈ 515 px with
AI History open. The section is therefore **collapsed by default** — a header
row (label + status pill) that expands on click — so the default layout never
overflows. QA screenshots at **1440×768** specifically (§10.6).

```
OLLAMA                              ● Connected      ← click to expand
┌──────────────────────────────────────────────┐
│ not installed:                               │
│   Install Ollama to chat with local models.  │
│   [detected OS one-liner, selectable text]   │   ← e.g. Linux:
│   Other systems: macOS · Windows ▾           │     curl -fsSL … | sh
│   Or download: ollama.com/download           │
│   [Re-check]                                 │
│ installed-not-running:                       │
│   Ollama is installed but not running yet.   │
│   Start it:  open -a Ollama        (macOS)   │
│   Start it:  ollama serve          (Linux/Win│
│   [Re-check]                                 │
│ running:                                     │
│   2 local models on this machine             │
│   llama3.1:8b · llama3.2:latest  → jump to   │
│   [Re-check]                         picker  │
└──────────────────────────────────────────────┘
```

**Liveness (audit #3):** `OllamaStatus` (`components/OllamaStatus.tsx`,
`"use client"`) re-fetches:
- on mount and on **Re-check**,
- every **5 s** while the tab is visible (`document.visibilitychange` gates
  the interval — no polling in background tabs),
- immediately on `window` **focus** (user returns after starting/stopping
  Ollama in a terminal).

Pill states: `checking` (grey, `…`), `down` (`--bad`), `stopped` (`--y`),
`up` (`--g`), each with a text label beside the dot (not color-alone — §10.5).
`aria-live="polite"` on the status line so screen readers announce changes.

Install commands are detected-OS-first via `navigator.userAgent` (client
only): the single command for the detected OS is shown; the other two are one
click away. All commands are selectable text (no copy buttons in v1).

### 5.2 AI Module (right panel) — this machine first

- **`ModelProvider` (audit #12):** new `components/ModelProvider.tsx` with
  `"use client"` exporting the context + hook; `app/page.tsx` stays a server
  component and simply renders `<ModelProvider>…children…</ModelProvider>`.
  Context value: `{models, selected, setSelected, status, refresh}` —
  consumed by AiModule + CenterChat (siblings; no prop drilling).
- **Dropdown becomes the real picker.** Options = `status.models` from this
  machine (name, size, `loaded` badge when `/api/ps` reports it), sorted
  installed-first, **pre-select the first** on load, persist selection in the
  provider (restored per session in §5.5).
- **Model-switch rule (audit #18):** if the current session has messages and
  the user picks a different model, show an inline confirm in the row
  ("Switch to llama3.2:latest? Your current chat stays as its own session.")
  with Switch / Cancel. No messages → switch silently.
- **Tree gains install state** (via `ollamaTag`, §6):
  - tag installed → `✓ installed` chip; clicking the row **selects** it for
    chat (guide link stays reachable via the title/↗),
  - tag not installed → **Pull** button (§5.4), disabled with reason when
    Ollama is down,
  - guide without a tag (Safety classifiers, LLaMA 1, …) → unchanged
    guide-only link.
- **`.desc` copy rewritten (audit #20):** today it claims *"Every model below
  runs on this machine through ollama"* — false with 19 guides vs 2
  installed, and self-refuting once chips/Pull buttons appear. New copy:
  *"Browse the Llama family below. Models you've installed show ✓ and can be
  selected; the rest can be pulled in one click."* (Lands in M3 with the
  chips; listed in §8.)

### 5.3 Chat — real streaming (`components/CenterChat.tsx`)

- Delete `CANNED_REPLY` (M2). Send → `POST /api/ollama/chat` → read
  `upstream.body` with a `ReadableStream` reader, decode via
  `new TextDecoder()` in stream mode, buffer across chunk boundaries, split on
  `\n`, `JSON.parse` each non-empty line (audit #13 — chunks split lines
  arbitrarily; UTF-8 multibyte characters may also straddle chunks):
  - line has `message.content` → append to the assistant bubble,
  - line has `error` → error state (matrix §7),
  - line `done: true` → finish, persist session (M4).
- **Double-submit guard (audit #21):** while streaming, Send is replaced by
  **Stop** (AbortController) and Enter is ignored; empty/whitespace-only
  drafts never fire.
- **Warm-up line:** on send, if `selected ∉ status.loaded`, show *"Warming
  up `<model>` — first reply takes a few seconds…"* until the first token
  lands (llama3.1:8b ≈ 7 s measured cold). Refresh `loaded` from status when
  the stream ends. Heuristic (not a `/api/ps` poller) — keeps the client
  simple; revisit only if QA shows it's misleading.
- **State matrix** (each rendered inside the existing `.chat` frame):
  1. `ollama down` → notice pointing at the sidebar Ollama section; input
     disabled with placeholder "Ollama isn't running".
  2. `no models` → CTA "No models on this machine yet" + Pull-starter
     action (§6 default tag).
  3. `ready` → normal send.
  4. `stream error` → keep whatever partial text arrived, append an honest
     error line, actions: **Retry** (resends last user message) and **Start
     new chat** — for context-overflow errors specifically, offer only
     *Start new chat* (retrying the same payload would fail again, §7).
- Empty-state copy updates: it currently promises the dropdown picks the
  model — after M1 that's true (§8).

### 5.4 Pull flow

- Trigger: Pull button in the tree, or the no-models CTA.
- **Preconditions:** Ollama running (else the button is disabled with
  "Start Ollama first"); a `pullSize` hint must exist on the guide (§6
  makes it required for every tagged guide).
- **One pull at a time (audit #17):** a module-level "pull in flight" state
  disables all other Pull buttons (label: "Pulling…"); chat remains usable —
  Ollama queues requests — with a small note "A model is downloading in the
  background."
- **Confirm inline in the row:** model name + size hint
  ("llama3.1:8b · about 4.9 GB download") → Pull / Cancel.
- **Progress:** Ollama emits per-layer `{digest, total, completed}`; keep a
  `Map<digest, {total, completed}>`, render
  `percent = Σcompleted / Σtotal × 100` (layers report same digest for
  manifest/weights — dedupe by digest, last write wins), plus the current
  `status` text ("pulling 4.9 GB / 6.6 GB layers"). `total` arrives only
  after the manifest — before that, show an indeterminate bar with the
  guide's `pullSize` as the estimate ("about 4.9 GB").
- **Success** → refresh status, then **auto-select the new model only if the
  chat is empty** (audit #18); otherwise show "Ready — switch models from the
  picker". Row flips to `✓ installed`.
- **Error line** (`{"error"}` on HTTP 200) → red inline message in the row
  (bad tag / disk full / network), row returns to the Pull button.
- **Cancel** → abort fetch (§3.5); row returns to Pull with note
  "Download stopped — Ollama may resume it later."

### 5.5 AI History — real sessions (raw JSON stays)

- Session shape kept (`ChatSession` in `data/chat-sessions.ts` → moved to
  `lib/history.ts` types): `id, title, model, created_at, messages[],
  message_count`.
  - `title` = first user message truncated to 60 chars,
  - saved when a stream completes (M4), keyed `localStorage["las.sessions.v1"]`.
- **Restore (audit #4):** on mount, load sessions **inside `useEffect`** —
  never during render (a render-time `localStorage` read breaks `next build`
  because prerendering runs without `window`, audit #7) — then select the most
  recent session into the chat. Clicking a session in the AI History list
  loads it. New chat button starts an empty one.
- **Search becomes a pure function (audit #7):** `filterSessions(sessions,
  query)` — takes data as an argument (no module-level storage access),
  unit-testable (§10.3).
- **Multi-tab (audit #21):** subscribe to the `storage` event; on change,
  merge by session `id` (newest `created_at` wins per session) and re-render
  — two tabs never clobber each other's history.
- **Guards (audit #21):** corrupt/unparseable JSON → log once, reset to `[]`,
  show the welcome state; `QuotaExceededError` on write → drop oldest
  sessions until it fits (floor: keep 5), and if still failing show
  *"Couldn't save this chat (browser storage is full)."* — honest, never
  silent.
- **Caps:** 20 sessions × 100 messages each (oldest session evicted beyond
  20; messages beyond 100 trimmed per session) — bounds localStorage well
  under the ~5 MB origin quota.
- **Empty state (audit #20):** not a bare `[]`. The JSON block keeps its raw
  look but shows a one-line comment-style welcome above it:
  `// No chats yet — messages you send are saved in this browser only.`
  followed by `[]`. The meta line gains "stored in this browser" wording.
- **Delete** `data/chat-sessions.ts` seed; only `components/Sidebar.tsx`
  imports it today (verified by grep) — its import switches to the store.
  **`filterSessions` moves to `lib/history.ts` wholesale** — no dead copies.
- Model change starts a new conversation (per §5.2's confirm rule) so each
  session's `model` field stays truthful.

---

## 6. Data model changes + tag mapping

`data/models/types.ts`:

```ts
export interface ModelGuide {
  // …existing fields…
  /** Exact `ollama pull` tag when this guide maps to a registry model. */
  ollamaTag?: string;   // e.g. llama-3-1-8b → "llama3.1:8b"
  /** Pull-size hint shown in the confirm step ("~4.9 GB"). Required when
      ollamaTag is set — enforced by a test (§10.3). */
  pullSize?: string;
}
```

Mapping for the 19 guides — every tag verified against
**ollama.com/library** during the build (`ollama show` cannot confirm an
uninstalled tag; audit #16):

| Guide | tag | pullSize | | Guide | tag | pullSize |
|---|---|---|---|---|---|---|
| llama-2-7b-13b | `llama2:7b` | ~3.8 GB | | llama-2-70b | `llama2:70b` | ~39 GB |
| codellama-7b-13b | `codellama:7b` | ~3.8 GB | | codellama-34b-70b | `codellama:34b` | ~19 GB |
| llama-3-8b | `llama3:8b` | ~4.7 GB | | llama-3-70b | `llama3:70b` | ~40 GB |
| llama-3-1-8b | `llama3.1:8b` | ~4.9 GB | | llama-3-1-70b | `llama3.1:70b` | ~43 GB |
| llama-3-2-1b-3b | `llama3.2:3b` | ~2.0 GB | | llama-3-3-70b | `llama3.3:70b` | ~47 GB |
| llama-3-2-vision-11b | `llama3.2-vision:11b` | ~7.9 GB | | llama-3-2-vision-90b | `llama3.2-vision:90b` | ~54 GB |
| llama-3-1-405b | `llama3.1:405b` | ~231 GB | | llama-4-scout | `llama4:scout` | ~33 GB |
| llama-4-maverick | `llama4:maverick` | ~110 GB | | | | |

*(no tag — guide only): llama-1-6-7b-13b, safety-classifiers, llama-1-33b-65b,
llama-4-behemoth.*

**Vision tags are `llama3.2-vision:<size>` (audit #6)** — the round-1 draft's
`llama3.2:11b-vision` / `llama3.2:90b-vision` do not exist in the registry.
Sizes above are registry-approximate; corrected against ollama.com/library at
build time and locked by the §10.3 test.

**Installed-matching rule (promoted to v1, audit #15)** — port the CLI's
`catalog_entry_for` (`catalog.rs:206`):
1. exact tag equality: `/api/tags[].name === ollamaTag` → installed;
2. else base-name match: an installed `llama3.2:latest` strips to family
   `llama3.2` and matches the `llama3.2:3b` guide **iff** its
   `details.parameter_size` (3.2B) falls in that guide's band (1B–3.3B) —
   this machine's `llama3.2:latest` therefore badges the 1B–3B guide;
3. else compare `details.parameter_size` numerically against the guide's
   band (port of `catalog_entry_for_matches_by_param_size`).
Multiple matches → badge all (honest); the picker still lists every installed
model by its real name.

**Starter default (audit #16):** the no-models CTA offers the catalog's own
`DEFAULT_TAG = "llama3.1:8b"` ("the default pick — about 4.9 GB"), with a
secondary link to `llama3.2:3b` ("about 2 GB, if you're short on RAM"). The
round-1 draft wrongly attributed `llama3.2:3b` as the catalog default.

**Persistence:** `localStorage` only — versioned key (`v1`), no server DB
(consistent with local-only).

---

## 7. Error / state matrix (must all render honestly)

| # | Condition | Detect | UI |
|---|---|---|---|
| 1 | Ollama not installed | `execFile` fails | Sidebar: install guide + Re-check |
| 2 | Installed, not running | ping fails, exec ok | Sidebar: OS-specific start command + Re-check |
| 3 | Running, 0 models | tags `[]` | Picker empty state + Pull-starter CTA; chat CTA |
| 4 | Running, models | tags list | Pre-select first; tree badges |
| 5 | Status goes down **mid-session** | 5 s poll / focus re-check | Pill flips red; chat input disables with notice (no fake reply) |
| 6 | Status comes back up | same | Pill green; input re-enables; selection preserved if still installed |
| 7 | Chat while down | 503 from handler | Inline notice + disabled input |
| 8 | Slow first token | not in `loaded[]` at send | "Warming up …" line (§5.3) |
| 9 | Model unloads (Ollama ~5-min idle) after load | next send re-warms | Normal send + warm-up line again (honest, no special case) |
| 10 | Mid-stream failure | reader error / `error` line | Keep partial text + error line + Retry / Start new chat |
| 11 | Context window exceeded | `error` line mentioning context/length | "Start new chat" only (retry would fail again) |
| 12 | Double-submit | send while streaming | Send replaced by Stop; Enter ignored |
| 13 | Pull failure | `{"error"}` line | Red inline row message |
| 14 | Pull cancel | user abort | Row → Pull + "may resume later" |
| 15 | Pull while Ollama down | status at click time | Pull disabled: "Start Ollama first" |
| 16 | Chat while pulling | — | Allowed; note "A model is downloading in the background." |
| 17 | Second pull started | module flag | Other Pull buttons disabled ("Pulling…") |
| 18 | Selected model deleted externally | status poll: name gone | Clear selection, notice "llama3.1:8b was removed — pick another model", picker refreshes |
| 19 | Two tabs open | `storage` event | Merge by session id, newest wins; selection per tab |
| 20 | localStorage corrupt | JSON.parse throws | Reset to `[]` + welcome state |
| 21 | localStorage full | QuotaExceededError | Evict oldest (floor 5) → else honest "couldn't save" notice |
| 22 | Wrong `OLLAMA_HOST` (unreachable) | fetch rejects | Status `down` with host shown in the section tooltip |
| 23 | Very long response | — | Bubble scrolls internally; auto-scroll keeps latest visible (existing behavior) |
| 24 | Non-ASCII/emoji streaming | TextDecoder stream mode | Renders correctly (decoder handles split multibyte, §5.3) |
| 25 | Empty / whitespace draft | client guard | Send does nothing |
| 26 | First-ever visit (no Ollama, no history) | both empty | Install section + empty-history welcome + no-models CTA all render together without overlap |
| 27 | Guide with no tag clicked | no `ollamaTag` | Guide link only — no chip, no Pull (never a dead button) |

---

## 8. Copy contract (before → after; plain English, audit #20)

| Where | ❌ Round-1 / current | ✅ This draft |
|---|---|---|
| `.desc` (tree) | "Every model below runs on this machine through ollama." | "Browse the Llama family below. Models you've installed show ✓ and can be selected; the rest can be pulled in one click." |
| Chat empty state | "…this reply would stream from the llama model…" (canned) | "Pick a model on the right and say hi — replies stream live from your machine." (after M1); down → "Ollama isn't running — start it from the Ollama section on the left." |
| Install section header | "OLLAMA ● Connected" (jargon-free but terse) | "OLLAMA — Connected / Not installed / Not running" (always word + dot) |
| Install body | "Install Ollama, then reload this page." | "Install Ollama to chat with local models — it's free and runs on your machine. Install it, then press Re-check." |
| Not-running body | "Start it: ollama serve" | OS-specific: macOS "Open Ollama from your Applications folder (or run `open -a Ollama`)", Linux "Run `ollama serve` in a terminal (or `systemctl --user start ollama`)", Windows "Start Ollama from the Start menu" |
| Pull confirm | "≈4.9 GB download" | "llama3.1:8b · about 4.9 GB — downloaded once, then it's yours offline." |
| Pull cancel | "partial download resumes later" | "Download stopped. Ollama may pick it back up next time." |
| Warm-up | "Warming up <model>…" | "Warming up llama3.1:8b — the first reply takes a few seconds." |
| History meta | raw counts only | + "stored in this browser" |
| History empty | `[]` | `// No chats yet — messages you send are saved in this browser only.` above `[]` |
| Context overflow | "Retry" | "This chat is too long for the model's memory. Start a new chat." + button |
| No-models CTA | "Pull a starter model (llama3.2:3b)" | "No models yet — get the default pick: llama3.1:8b (about 4.9 GB). Prefer smaller? llama3.2:3b (about 2 GB)." |

Voice check at M4: the section must read like `llama`'s guided recommender
(same defaults — `DEFAULT_TAG`, same plain-English register).

---

## 9. Milestones (each ends with the full QA gate in §10)

- **M1 — Status + local models.** `lib/ollama.ts`, all three route handlers
  (guards included), `OllamaStatus` sidebar section (collapsed, live,
  detected-OS install guide), `ModelProvider`, real dropdown listing this
  machine's models. *Done when:* pill flips correctly with `ollama serve`
  killed/restarted **without a rebuild**; dropdown shows `llama3.1:8b` +
  `llama3.2:latest` with sizes; install guide visible when down; Stop/abort
  wiring verified (§3.5).
- **M2 — Real chat.** Streaming pipeline, full state matrix (rows 5–12, 25),
  Stop, warm-up line, double-submit guard. Sessions are **ephemeral in M2**
  (in-memory only, explicitly labeled "not saved yet" nowhere — M2 simply
  doesn't claim persistence). *Done when:* tokens stream, Stop works, killing
  Ollama mid-conversation shows the honest notice, and `CANNED_REPLY` /
  `canned` are gone from the tree (§10.4).
  *(Round-1 contradiction fixed: history auto-save was listed in M2 while
  `lib/history.ts` was built in M4 — persistence now lives **only** in M4.)*
- **M3 — Pull.** `ollamaTag` + `pullSize` on all 15 tagged guides, installed
  matching (§6 rules 1–3), tree chips, one-at-a-time pull with aggregated
  progress, auto-select-if-empty, starter CTA, `.desc` rewrite (§8).
  *Done when:* pulling `llama3.2:1b` end-to-end shows progress → appears as
  installed → chat answers; a bad tag errors inline; this machine's
  `llama3.2:latest` badges the 1B–3B guide.
- **M4 — Real history + polish + docs + full QA.** `lib/history.ts`
  (mount-only reads, restore-latest, click-to-open, multi-tab merge, quota
  guards, caps), seed deleted, empty-history welcome, model-switch confirm,
  copy table applied (§8), **`crates/web/README.md` updated** (remove
  "fully static / canned" claims, document the API routes + correct
  `pnpm exec next start -H 127.0.0.1`), root README note if the command
  changed, vitest suite green, full §10 gate + committed screenshot
  baselines.

Deferred (explicitly out of scope): model deletion, `llama catalog --json`
alignment, autostart, multi-remote servers, parameter tuning, image input in
chat (vision guides are text-chatable; vision *input* is a separate product
decision).

---

## 10. QA gate (run at every milestone; full set at M4)

### 10.1 Build & lint
1. `pnpm lint` clean; `pnpm build` clean; `next build --debug-prerender`
   shows **zero** insights.
2. Route accounting (audit-defined): the current build emits **24 app route
   entries + 1 proxy = 25**; after M1 it must be **27 app routes (24 + 3
   API) + 1 proxy = 28**. Any other delta is investigated.

### 10.2 Backend smoke (curl)
1. Status: live flips with `ollama serve` killed/restarted (no rebuild);
   `OLLAMA_HOST=http://127.0.0.1:1` override → honest `down` + host.
2. Chat: `curl -N -X POST …/api/ollama/chat -d '{"model":"llama3.1:8b",…}'`
   streams NDJSON; measure **time-to-first-byte** — if > ~200 ms on localhost,
   gzip buffering is implicated → apply the `compress: false` escape hatch
   (§4.1) and re-measure.
3. Pull: tiny tag (`llama3.2:1b`) end-to-end; bad tag → `{"error"}` line.
4. Guards: POST without Origin (curl) → accepted; with foreign Origin → 403;
   non-JSON content-type → 400; 2 MiB body → 413; tag `../../etc` → 400.
5. Abort: client abort mid-stream → Ollama stops (no runaway generation),
   server log has no unhandled rejection.

### 10.3 Unit tests (vitest — audit #22)
Add `vitest` (devDependency) + `"test": "vitest run"`; CI gains a **Test**
step between Lint and Build. Pure functions only — no framework-hopping, no
e2e runner (proportionate for a never-in-production tool; the manual matrix
below covers integration):
- `isValidTag` accept/reject table (incl. `../../etc`, uppercase, empty).
- NDJSON line buffer: chunk splits mid-line, mid-multibyte-char, CRLF, blank
  lines, `{error}` line, `done` line.
- `filterSessions(sessions, query)` — pure search behavior.
- `matchInstalled(tags, guides)` — the three §6 matching rules, incl.
  `llama3.2:latest` → 1B–3B guide and over-30B rejection.
- Data integrity: every guide with `ollamaTag` also has `pullSize`; all 15
  tags present; no duplicate tags.
- History prune: 21 sessions → 20; 101 messages → 100.

### 10.4 Forbidden-string sweep (extends the v1 list)
Grep the built HTML + source for:
`guy hawkins|invite|query|command d+|slack|zoom|upwork|centra` (v1) **plus**
`CANNED_REPLY|canned|UI-only demo|no backend|demo nonsense|TODO|FIXME`.
Zero matches.

### 10.5 Manual matrix + accessibility
- Every row of §7 rendered at **1920×1080, 1440×768, 768×1024, 375×812**
  (1440×768 added for the sidebar space math, audit #19).
- A11y rows: status pill = dot **+ text** with `aria-live="polite"`; pull bar
  = `role="progressbar"` + `aria-valuenow/min/max` + label; disabled inputs
  have `aria-disabled` + visible placeholder reason; every icon button has an
  `aria-label`; focus ring visible on Pull/Send/Stop/Re-check; keyboard-only
  pass through expand-status → picker → chat → pull.

### 10.6 Regressions + baselines
1. 19 slugs 200, bogus slug 404, `/` + `/llama` 200, all internal links 200.
2. Screenshot pixel-diff of untouched areas vs **committed baselines**
   (`crates/web/qa/baselines/`, captured at M4: home/guide/directory ×
   1920/768/375, plus 1440×768 sidebar-expanded) — byte-identical where the
   change set didn't touch, intentional diffs documented.
3. `bazel build //...` unaffected (`.bazelignore`); CI green (web job runs
   lint + test + build).
4. `git status`: only intended files, nothing outside `crates/web/` (+ the
   two root files if M4 touches them); `docs/` + `models/` stay untracked.

---

## 11. Risks & open questions (for round 2)

1. **Request-time mechanism** — pinned in §3.3 from the in-tree docs; round 2
   should re-verify the exact line citations and that no route-config export
   sneaks in.
2. **Warm-up heuristic vs `/api/ps` poller** — heuristic chosen for
   simplicity; flag if round 2 thinks the measured 7 s cold-load justifies a
   poller.
3. **Streaming latency / gzip** — measured in §10.2, `compress: false` is the
   documented fallback; decide only with numbers.
4. **`llama3.1:405b` pullSize (~231 GB)** — honest but absurd; keep (it's
   real) or mark "not recommended locally" in the confirm copy? Round 2 input.
5. **Vision input** — vision guides get chips/Pull but chat is text-only;
   is the "✓ installed" chip misleading for a vision model in a text chat?
   Possible copy: chip reads "✓ installed (text chat)".
6. **Scope creep watch:** anything not serving the 5-step journey in §1
   stays deferred.
