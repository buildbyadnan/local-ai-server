# Plan — Local AI Server: UI ↔ Ollama / `llama` CLI connectivity

Status: **revised after audit round 2 of 3** — round-1 and round-2 findings
folded in; next: round 3 audit, revise, then implement.
Scope: turn the static web UI into a working local chat product: detect
Ollama, guide installation, show the models already on this machine, let the
user select and chat with them (real streaming), and pull new models from the
catalog — all local, nothing shipped to production.

---

## 0. Revision log

**Round 1 → rev. 1 (commit `e389971`)** — 24 findings folded in; round-2
auditors re-verified all six blockers and confirmed the core amendments
request-time pinning, Response passthrough, corrected vision tags,
mount-only localStorage, persistence owned by M4, corrected `DEFAULT_TAG`
as doc-accurate. Cross-reference pointers in this §0 table are corrected
below where round 2 found them stale.

**Round 2 → this revision** — both auditors verdict "amend first"; fixes:

| # | Finding (round 2) | Fix |
|---|---|---|
| R2-1 | **BLOCKER** route-count gate arithmetically impossible (no artifact goes 24→27) | §10.1 — named artifacts + commands |
| R2-2 | **BLOCKER** §3.4 sketch lacks error paths (503 / AbortError) accepted against elsewhere | §3.4 — full try/catch sketch; §5.3 `response.ok` branch |
| R2-3 | **BLOCKER** §6 matching rules depend on nonexistent "bands"; rule 3 would badge non-Llama models | §6 — `paramsBillions` field + family-first rules adapted from `catalog_entry_for` |
| R2-4 | **BLOCKER** §5.5 restore has no click target; "New chat" button doesn't exist | §5.5 — session rows above the raw JSON + named control |
| R2-5 | §0 cross-references misrouted (6 rows) | §0 — pointers corrected |
| R2-6 | forbidden-string sweep unpassable (`query` ×15 in source) | §10.4 — scoped: v1 list → built HTML; new list → source; runs after M4 |
| R2-7 | `pnpm dev` also binds `0.0.0.0` (LAN exposure) | §3.6 — loopback mandatory for dev **and** prod |
| R2-8 | Origin guard Host-spoofable (DNS rebinding); GET status unguarded | §3.2 — loopback allowlist + Host check on every route |
| R2-9 | `execFile("ollama")` Windows/PATH unspecified | §4.1 — `.exe` on win32, env, fallback paths, `onPath` |
| R2-10 | two `pullSize`s ~2× wrong; "locked by test" had no mechanism | §6 — corrected sizes + asserted value table |
| R2-11 | forbidden exports under-listed (`fetchCache`, `dynamicParams`) | §3.3 — full list |
| R2-12 | two owners for status fetch; pull flag non-reactive module var | §5.1/§5.2 — `ModelProvider` owns all fetching + pull state |
| R2-13 | multi-tab merge keyed on immutable `created_at` (silent loss) | §5.5 — `updated_at` + tie-break, merge never writes back |
| R2-14 | M1 honesty gap (`CANNED_REPLY` alive under a green pill); §10 "every milestone" impossible | §9/§10 — canned reply dies in **M1**; per-milestone QA subsets |
| R2-15 | pixel-diff gate implies tooling §10.3 forbids | §10.6 — manual diff vs committed references, recorded in `qa/README` |
| R2-16 | matrix rows 2 vs 22 undetectable + false advice | §7 — merged, host visible in copy (CLI voice) |
| R2-17 | missing matrix rows (Stop, 413, checking, bad JSON line, pull drop, switch mid-stream) | §7 — rows 28–33 |
| R2-18 | copy gaps (lowercase "ollama", hardcoded `⚡ llama` picker, "on the left", 3-vs-4 states, `systemctl --user`) | §8 — rows added |
| R2-19 | history flash/`N of M` meta, restore lifecycle underspecified | §5.5 — hydration skeleton + 4 lifecycle bullets |
| R2-20 | misc: M1 Stop reference, unused status fields, `--debug-prerender` wording, `start` script drift, IPv6 note | §4.1, §9, §10, §11 |

---

## 1. Product thinking

**Who it's for.** Someone who installed this repo and wants a GUI over the
same local stack the `llama` CLI drives. The CLI already proves the product:
a thin client to a local Ollama server. The UI becomes the second client.

**Principles (carried over from v1):**
- Local-only: no cloud, no accounts, no telemetry; data stays in the browser.
- Honest states: never pretend a model answered when nothing ran — and never
  claim persistence/connectedness the UI doesn't have (§9 keeps M1 honest).
- Plain language: install/status/pull copy for humans (§8 is the contract).
- No unnecessary code: every field, file, and state earns its place.

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
  `catalog_entry_for(installed)` (lines 206–236) matches an installed model
  to a catalog entry in two steps: **exact tag**, else **same base name +
  ≤25 % relative deviation from the entry's nominal params, nearest wins**.
  §6 adapts exactly this (family constraint included — a `mistral:7b` must
  never badge a Llama guide, per the CLI's own test `catalog.rs:417-430`).
- Ollama pull API (docs.ollama.com, v0.40.8): `POST /api/pull`
  `{"model": "<tag>"}` streams NDJSON: `{"status":"pulling manifest"}` →
  `{"status":"downloading <digest>","digest","total","completed"}` →
  `{"status":"success"}`; failures arrive as `{"error": "..."}` lines on
  HTTP 200. Content type `application/x-ndjson`.
- All 15 tags in §6's table were confirmed present in the registry
  (`registry.ollama.ai/v2/library/<name>/manifests/<tag>` → 200, round 2);
  sizes corrected against Σ manifest layers. `ollama show` cannot verify an
  **uninstalled** tag — registry/library checks only.

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
│  · loopback Host + Origin/content-type guard + 1 MiB body cap       │
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

| Route | Guarded | In | Out |
|---|---|---|---|
| `GET /api/ollama/status` | Host (§3.2) | – | `{installed, onPath, running, host, models[], loaded[]}` JSON |
| `POST /api/ollama/chat` | Host + Origin + content-type (§3.2) | `{model, messages[]}` | NDJSON stream (Ollama passthrough) |
| `POST /api/ollama/pull` | Host + Origin + content-type (§3.2) | `{model}` | NDJSON progress (Ollama passthrough) |

### 3.2 Shared server helper — `lib/ollama.ts` (server-only)

- `base()` → `process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434"`, trimmed
  of trailing `/` (identical fallback to the CLI's clap default).
- `requireLoopbackHost(request)` — **applied to all three routes, including
  GET**: the request's `Host` header must be `localhost`, `127.0.0.1`,
  `[::1]` or `localhost:<port>` form (loopback only). This is the
  DNS-rebinding backstop: an attacker page re-bound to 127.0.0.1 arrives with
  a foreign `Host` and is rejected before touching Ollama. Failure →
  `403 {error}`.
- `requireLocalPost(request)` — for both POST routes: additionally requires
  `Content-Type: application/json` and, **when an `Origin` is present**, that
  its host is loopback **and** its port equals this request's port (pinned
  allowlist — not "matches the Host header", which a rebind would forge);
  `Origin: null` is rejected. Origin-absent requests (curl, same-origin
  same-method GETs) are accepted — the mandatory JSON content-type is what
  blocks cross-site browser POSTs in practice (they'd preflight, and we send
  no CORS headers). Failure → `400`/`403 {error}`.
- `readJsonBody(request, maxBytes = 1 MiB)` — running byte counter; over the
  cap → `413 {error}` before parsing. **Effective cap note:** 1 MiB of JSON
  ≈ well under the nominal `100 × 32 000` message limits — the byte cap is
  the real constraint; §7 row 30 covers the overflow UX.
- `isValidTag(tag)` — `^[a-z0-9][a-z0-9._/-]{0,127}(?::[a-z0-9._-]{1,64})?$`
  (**lowercase only** — Ollama registry tags are lowercase; uppercase is
  rejected, which the §10.3 test asserts).
- `ollamaFetch(path, init, timeoutMs)` — `fetch(base() + path, {cache:
  "no-store", signal, ...init})` with AbortSignal timeouts (2 s for status,
  none for streams). Rejects fast when Ollama is down.

### 3.3 Request-time semantics — pinned (round 1, re-verified round 2)

Per `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
lines 87–124: under Cache Components, GET route handlers **run at request
time by default**; prerendering stops when a handler accesses **network
requests**, request-object properties, or `connection()`.

**Implementation rules (no exceptions):**
- Do **not** export any segment config from `app/api/**/route.ts`. Forbidden
  (they error, per `migrating-to-cache-components.md:74,652` and `route.md`):
  `dynamic`, `revalidate`, `fetchCache`, `runtime`, `dynamicParams`
  (`preferredRegion` is deprecated too). Request-time behavior comes from
  touching the network/request, not config flags.
- The **network fetch** is what guarantees non-prerendering. Important
  nuance (round 2): `process.env` reads and `execFile` are **not** tracked
  dynamic APIs — **`execFile("ollama", …)` actually executes at build time**
  (twice: prospective + final render), and *any uncaught rejection in the GET
  handler fails `pnpm build`*. Therefore every promise in the status handler
  is caught with a fallback (`installed: false`, `[]`, …) — §4.1's fallbacks
  are build-breaking requirements, not just runtime politeness.
- Status fetches use `cache: "no-store"`; responses send
  `Cache-Control: no-store` so neither data cache nor browser holds a stale
  pill. (Only GET is ever prerenderable — reading `Origin` on POST is safe.)
- Acceptance (§10.2): `GET /api/ollama/status` reflects live Ollama state
  after `ollama serve` is killed/restarted, with no rebuild, and
  `.next/prerender-manifest.json` still contains **no** `/api/*` entries.

### 3.4 Streaming passthrough — exact pattern (round 1; error paths added round 2)

Route handlers return a `Response`; there is no Node-style `res` piping API.

```ts
// app/api/ollama/chat/route.ts (the authoritative shape)
const guard = requireLoopbackHost(request) ?? requireLocalPost(request);
if (guard) return guard;                          // 403/400 before touching Ollama

const body = await readJsonBody(request);         // 413 over 1 MiB
if (body.error) return Response.json(body, { status: body.status });
// …validate model/messages (§4.2) → 400 on violation…

let upstream: Response;
try {
  upstream = await fetch(`${base()}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: true }),
    signal: request.signal,                       // §3.5 — client abort reaches Ollama
  });
} catch (err) {
  if (err instanceof DOMException && err.name === "AbortError") {
    return new Response(null, { status: 499 });   // client went away — quiet
  }
  return Response.json({ error: "Ollama isn't running." }, { status: 503 });
}
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
  lines on HTTP 200 — passed through and parsed client-side (§5.3).
  Transport failures are mapped above **before** streaming starts.
- **Client side:** if `!response.ok`, read the JSON `{error}` and enter the
  corresponding state instead of opening a stream reader (§5.3).
- **Compression:** the mandated `no-transform` already excludes these routes
  from Next's gzip (vendored `compression` honors it), so §10.2 measures
  first-byte latency with gzip out of the picture. `compress: false` in
  `next.config.ts` remains a documented whole-server fallback if latency
  still exceeds budget for *other* reasons (then suspect Ollama itself).

### 3.5 Abort propagation (round 1; acceptance wording fixed round 2)

Mechanism (in-tree source, no doc covers it): `build/templates/app-route.js`
wires `signalFromNodeResponse(res)` into every route-handler `NextRequest`;
the adapter aborts it on response `'close'` when not fully written
(`server/web/spec-extension/adapters/next-request.js:45-63`). Passing
`request.signal` into the upstream `fetch` therefore destroys the TCP
connection to `:11434`, and Go's http server cancels the request context —
Ollama stops generating. Acceptance: **Stop/abort mid-stream → generation
stops (`ollama ps` shows the model going idle within its normal unload
window), and the Next server log has no unhandled rejection.** A lagging
unload is not a failure.

### 3.6 Serving locally — loopback mandatory (round 1; extended round 2)

```bash
pnpm exec next dev   -H 127.0.0.1   # dev, loopback only
pnpm exec next start -H 127.0.0.1   # production build, loopback only
```

- **Both** default to binding `0.0.0.0` (CLI docs `06-cli/next.md:64-71,
  112-123`) — combined with the "Origin-absent → accepted" rule, a bare dev
  server would let any machine on the LAN drive Ollama through us. Loopback
  binding is a product rule, not a nicety.
- `pnpm start -- -H …` is **not** used: the documented, unambiguous path is
  `pnpm exec next …` (pnpm arg-forwarding to `next start` is the kind of
  behavior change we don't want to depend on).
- `-H 127.0.0.1` is IPv4 loopback only: QA commands use
  `http://127.0.0.1:<port>` URLs, not `localhost` (some resolvers prefer
  `::1`). M4 changes the `package.json` `start` script to
  `next start -H 127.0.0.1` so the default can't be exposed by accident.

---

## 4. Backend behavior details

### 4.1 `GET /api/ollama/status`

1. `installed` + `onPath`: `execFile(process.platform === "win32" ?
   "ollama.exe" : "ollama", ["--version"], { timeout: 2000, env:
   process.env })` — `execFile` never spawns a shell (fixed argv, no
   injection); route handlers default to the Node runtime (no `runtime`
   export exists to change it). If PATH lookup fails (ENOENT), retry known
   install locations — `%LOCALAPPDATA%\Programs\Ollama\ollama.exe` (Windows),
   `/usr/local/bin/ollama` (Linux), `/Applications/Ollama.app/Contents/
   Resources/ollama` (macOS). Found only via fallback → `installed: true,
   onPath: false` so the UI can say "installed but not on PATH" instead of
   lying "not installed" (GUI-launched servers often lack user PATH).
   **Every outcome is caught** — an uncaught rejection here fails the build
   (§3.3).
2. `running`: `GET /api/tags` via `ollamaFetch(..., 2000)`; failure →
   `running: false`.
3. `models`: `tags.models[]` → `{name, size, parameterSize}` only — exactly
   what the picker shows and §6 matching needs (round 2: drop `installedAt`/
   `quantization` — no consumer). `[]` when down.
4. `loaded`: `GET /api/ps` → names currently in memory; `[]` on failure.
5. Every field has a fallback (`false` / `[]` / host string).

### 4.2 `POST /api/ollama/chat`

- Guards (§3.2) → `readJsonBody` (1 MiB) → validate: `model` passes
  `isValidTag` (lowercase); `messages` array ≤ 100 entries, each
  `{role: user|assistant|system, content: string ≤ 32 000 chars}`.
  Violation → `400 {error: "<plain-English reason>"}` **before** any
  upstream call.
- Ollama unreachable → `503 {error: "Ollama isn't running."}` — the UI
  renders this as the "not running" notice, never as a fake reply.
- Otherwise → passthrough per §3.4.

### 4.3 `POST /api/ollama/pull`

- Same guards; `model` must pass `isValidTag`.
- Passthrough per §3.4. Cancel = client aborts fetch (§3.5); Ollama finishes
  or resumes the download on its own — the UI says so honestly (§8).

### 4.4 Payload-caps philosophy

Caps are guard rails for an unauthenticated localhost tool (memory + abuse
bounds), not a security boundary — stated as such in code comments. The real
security boundary is loopback binding (§3.6) + Host/Origin guards (§3.2).

---

## 5. UI changes, section by section

### 5.1 Sidebar — new "OLLAMA" section (directly below *Plugins*)

**Space math:** desktop sidebar inner height ≈ 840 px @1440×900 and ≈ 708 px
@1366×768; existing content ≈ 325 px closed / ≈ 515 px with AI History open.
`.side` is a flex column with `overflow-y: auto` and `flex: none` children
(`globals.css:162-175`) — so the section is **collapsed by default**: a
header row (label + status pill) that expands on click. QA at **1440×768**
specifically (§10.5).

```
OLLAMA                              ● Connected      ← click to expand
┌──────────────────────────────────────────────┐
│ not installed:                               │
│   Install Ollama to chat with local models.  │
│   [detected OS one-liner, selectable text]   │
│   Other systems: macOS · Windows ▾           │
│   Or download: ollama.com/download           │
│   [Re-check]                                 │
│ installed, unreachable:                      │
│   Can't reach Ollama at 127.0.0.1:11434.     │
│   Start it: <OS-specific command>            │
│   (Set OLLAMA_HOST if it lives elsewhere.)    │
│   [Re-check]                                 │
│ running:                                     │
│   2 local models on this machine             │
│   llama3.1:8b · llama3.2:latest  → jump to   │
│   [Re-check]                         picker  │
└──────────────────────────────────────────────┘
```

**State ownership (round 2):** `ModelProvider` (§5.2) owns the **single**
status fetch — on mount, every **5 s gated by `document.visibilitychange`**
(no background polling), on `window` focus, and via `refresh()` (Re-check,
after pulls). Each poll **aborts the previous in-flight request** and applies
its result only if it is the latest (`pollId` guard) — a slow poll can never
overwrite a fresh pill. `OllamaStatus` is **presentation-only**: it reads
`status` from context and calls `refresh()`.

Pill → header word mapping (4 states, 4 words): `checking → "Checking…"`
(grey), `down → "Not installed"` (`--bad`), `stopped → "Not running"`
(`--y`), `up → "Connected"` (`--g`). Dot **+ text always** (not color-alone),
`aria-live="polite"` on the status line.

Install commands: detected-OS-first via `navigator.userAgent` (client only);
the other OSes are one click away; all commands selectable text (no copy
buttons). Linux start copy: `ollama serve` in a terminal, or
`sudo systemctl start ollama` (the official installer creates a **system**
unit — `--user` would fail). macOS: `open -a Ollama`. Windows: start from the
Start menu. Body copy matches the CLI's register (`client.rs:117`): always
show the actual host, never hide it in a tooltip.

### 5.2 ModelProvider + AI Module (right panel) — this machine first

- **`ModelProvider` (round 1 #12 + round 2 #12):** `components/
  ModelProvider.tsx` with `"use client"` exporting context + hook;
  `app/page.tsx` stays a server component and renders
  `<ModelProvider>…children…</ModelProvider>`. Context value:
  `{status, models, selected, setSelected, refresh, pulling, startPull,
  cancelPull, sessions…}` — **all** fetching and pull state live here (a
  module-scoped variable cannot re-render React). `AiModule`, `CenterChat`,
  and `OllamaStatus` are consumers only.
- **Dropdown = the real picker.** Options = `status.models` (installed
  models only — the tree is the sole path to not-installed models), sorted by
  name; each shows size + `loaded` badge; **pre-select the first** on load.
  Button label = the selected tag (fallback "No model selected"); the
  hardcoded `⚡ llama / llama / local` labels and the assistant-bubble name
  `llama` are replaced by the real tag (§8).
- **Model-switch rule:** if the current session has messages and a stream is
  **not** in flight, picking another model shows an inline confirm in the row
  ("Switch to llama3.2:latest? Your current chat stays as its own session.")
  with Switch / Cancel. During a stream the picker is disabled (Stop first).
  No messages → switch silently.
- **Tree gains install state** (via `ollamaTag`, §6):
  - tag installed → `✓ installed` chip — for vision (`llama3.2-vision:*`)
    and `llama4:*` guides the chip reads `✓ installed (text chat)` (the chat
    has no image input; the plain `✓` would imply otherwise); clicking the
    row **selects** it (guide link stays reachable via title/↗),
  - tag not installed → **Pull** button (§5.4), disabled with reason when
    Ollama is down,
  - guide without a tag (Safety classifiers, LLaMA 1, …) → unchanged
    guide-only link (never a dead button).
- **`.desc` copy rewritten:** "Every model below runs on this machine through
  ollama." → *"Browse the Llama family below. Models you've installed show ✓
  and can be selected; the rest can be pulled in one click."*

### 5.3 Chat — real streaming (`components/CenterChat.tsx`)

- `CANNED_REPLY` is deleted in **M1** (§9) and replaced by an honest
  placeholder ("Chat lands next — pick a model to get ready.") so a green
  pill never coexists with "no model is running" copy. M2 wires:
  Send → `POST /api/ollama/chat` → if **`!response.ok`**, read JSON
  `{error}` and enter the matching state (503 → "not running" notice) —
  never open a stream reader on an error response. Otherwise read
  `response.body` with a `ReadableStream` reader, decode via `new
  TextDecoder()` (stream mode — handles chunks split mid-multibyte), buffer
  across chunk boundaries, split on `\n`, `JSON.parse` each non-empty line
  **inside try/catch** (a malformed line → row 29, not a crash):
  - `message.content` → append to the assistant bubble,
  - `error` → error state (§7),
  - `done: true` → finish, persist session (M4).
- **Double-submit guard:** while streaming, Send becomes **Stop**
  (AbortController) and Enter is ignored; empty/whitespace drafts never fire.
- **Stop outcome:** keep whatever partial text arrived, mark the reply
  "stopped" — **no** error line, **no** Retry (row 28).
- **Warm-up line:** on send, if `selected ∉ status.loaded` → *"Warming up
  `<model>` — the first reply takes a few seconds…"* until the first token;
  refresh `loaded` when the stream ends.
- **State matrix rows** (inside the existing `.chat` frame):
  1. `ollama down` → notice: "Ollama isn't running — start it from the
     Ollama section in the sidebar." (**position-neutral**: at ≤620 px the
     sidebar sits *below* the chat, `globals.css:660-665`); clicking the
     notice expands + scrolls the Ollama section into view. Input disabled
     with that placeholder.
  2. `no models` → CTA "No models on this machine yet" + Pull-starter
     (§6 defaults).
  3. `ready` → normal send.
  4. `stream error` → keep partial text, append honest error line, actions
     **Retry** (resends last user message) / **Start new chat**; for
     context-overflow errors offer only **Start new chat** (retrying the
     identical payload fails again).

### 5.4 Pull flow

- Trigger: Pull button in the tree, or the no-models CTA.
- **Preconditions:** Ollama running (else disabled: "Start Ollama first");
  `pullSize` exists (required on every tagged guide, §6).
- **State lives in the provider:** `pulling: {tag, progress, status} | null`
  — one pull at a time: all other Pull buttons disable ("Pulling…");
  AiModule renders the progress row; CenterChat renders "A model is
  downloading in the background." — all reactive because all read context.
- **Confirm inline in the row:** name + size hint ("llama3.1:8b · about
  4.9 GB — downloaded once, then it's yours offline.") → Pull / Cancel.
  **Over-30B extra line** (CLI coherence — the `llama` CLI only recommends
  ≤30B): *"This one is huge (≈245 GB) — bigger than anything the llama CLI
  recommends. Pull anyway / Cancel."*
- **Progress:** keep `Map<digest, {total, completed}>` (last write wins per
  digest); render `percent = Σcompleted / Σtotal × 100` + current `status`
  text. Before `total` arrives (manifest phase): indeterminate bar with the
  guide's `pullSize` as estimate.
- **Success** → `refresh()` status, then **auto-select the new model only if
  the chat is empty**; else "Ready — switch models from the picker." Row
  flips to `✓ installed`.
- **Error line** (`{"error"}` on HTTP 200) → red inline message; row returns
  to Pull. **Transport drop mid-download** → row 31.
- **Cancel** → abort fetch (§3.5); row → Pull + "Download stopped. Ollama
  may pick it back up next time."

### 5.5 AI History — real sessions (raw JSON stays)

- Store in **`lib/history.ts`** (types move from `data/chat-sessions.ts`):
  `id, title, model, created_at, updated_at, messages[], message_count`;
  `title` = first user message truncated to 60 chars; `updated_at` stamped
  on every save; key `localStorage["las.sessions.v1"]`.
- **Restore (round 1 #4 + round 2 #4):** on mount, read sessions **inside
  `useEffect`** (never during render — a render-time `localStorage` read
  breaks `next build`; initial state is empty so SSR/CSR match), then select
  the most recent session into the chat.
  - **Click target (new):** above the raw JSON, each session renders as a
    `.histrow` **button** (title · model · relative date) that loads that
    session; the raw `<pre>` keeps its JSON look but shows **the currently
    selected session's JSON** (the block the owner liked stays honest and
    now meaningful).
  - **New-chat control (new):** a `.histbtn`-styled "＋ New chat" button
    under the `CHAT HISTORY` label (`aria-label="New chat"`) — clears
    CenterChat's messages and starts a fresh unsaved session.
- **Lifecycle rules:** first send after restore **appends** to the open
  session (title/`created_at` frozen at session start; `updated_at` bumps);
  restoring **drops any draft** without prompting; if the restored
  `session.model` is no longer installed → load messages **read-only** with
  row 18's notice; every appended message stamps
  `at: new Date().toISOString()`.
- **Hydration (round 2 #19):** until the mount read completes
  (`hydrated === false`) the JSON block renders a neutral skeleton (`…`),
  **not** the empty-state comment — a returning user must never see
  "No chats yet" flash before their sessions load. Meta line:
  "**N sessions** — stored in this browser" (the current "*N of M*"
  denominator dies with the seed).
- **Search:** `filterSessions(sessions, query)` — pure function moved to
  `lib/history.ts`, no module-level storage access (unit-testable, §10.3).
- **Multi-tab:** `storage` event → merge by session `id` comparing
  **`updated_at`** (tie-break: greater `messages.length`, then lexicographic
  id) — `created_at` alone is immutable and can't detect newer messages.
  Merges only update local state (**never write back**) → no event loops.
- **Guards:** corrupt JSON → reset to `[]` + welcome state; `QuotaExceededError`
  → evict oldest sessions (floor 5) → else honest "Couldn't save this chat
  (browser storage is full)." notice.
- **Caps:** 20 sessions × 100 messages (evict oldest beyond 20; trim
  messages beyond 100).
- **Empty state:** `// No chats yet — messages you send are saved in this
  browser only.` above `[]`.
- **Selection persistence:** `localStorage["las.selected.v1"]`, restored on
  mount, shared across tabs (§7 row 19 reads it via the `storage` event).
- **Delete** `data/chat-sessions.ts`; `Sidebar.tsx` (its only importer —
  verified) switches to the store. **`filterSessions` moves wholesale** — no
  dead copies.

---

## 6. Data model changes + tag mapping

`data/models/types.ts`:

```ts
export interface ModelGuide {
  // …existing fields…
  /** Exact `ollama pull` tag when this guide maps to a registry model. */
  ollamaTag?: string;   // e.g. llama-3-1-8b → "llama3.1:8b"
  /** Pull-size hint for the confirm step ("~4.9 GB"). Required when
      ollamaTag is set — enforced by the §10.3 test. */
  pullSize?: string;
  /** Nominal parameter counts (billions) this guide covers — the matching
      rule in §6 compares installed details.parameter_size against these
      (±25%, per catalog_entry_for). Required when ollamaTag is set. */
  paramsBillions?: number[];
}
```

Mapping for the 19 guides — tags confirmed present in the registry
(round 2); sizes are Σ registry manifest layers (capture: Oct 2026,
`TAG_SIZES`-style table asserted by the §10.3 test):

| Guide | tag | pullSize | params | | Guide | tag | pullSize | params |
|---|---|---|---|---|---|---|---|---|
| llama-2-7b-13b | `llama2:7b` | ~3.8 GB | [7, 13] | | llama-2-70b | `llama2:70b` | ~39 GB | [70] |
| codellama-7b-13b | `codellama:7b` | ~3.8 GB | [7, 13] | | codellama-34b-70b | `codellama:34b` | ~19 GB | [34, 70] |
| llama-3-8b | `llama3:8b` | ~4.7 GB | [8] | | llama-3-70b | `llama3:70b` | ~40 GB | [70] |
| llama-3-1-8b | `llama3.1:8b` | ~4.9 GB | [8] | | llama-3-1-70b | `llama3.1:70b` | ~43 GB | [70] |
| llama-3-2-1b-3b | `llama3.2:3b` | ~2.0 GB | [1, 3] | | llama-3-3-70b | `llama3.3:70b` | ~42 GB | [70] |
| llama-3-2-vision-11b | `llama3.2-vision:11b` | ~7.8 GB | [11] | | llama-3-2-vision-90b | `llama3.2-vision:90b` | ~55 GB | [90] |
| llama-3-1-405b | `llama3.1:405b` | ~243 GB | [405] | | llama-4-scout | `llama4:scout` | ~67 GB | [109] |
| llama-4-maverick | `llama4:maverick` | ~245 GB | [400] | | | | | |

*(no tag — guide only): llama-1-6-7b-13b, safety-classifiers, llama-1-33b-65b,
llama-4-behemoth.*

**Vision tags are `llama3.2-vision:<size>`** — `llama3.2:11b-vision` /
`llama3.2:90b-vision` do not exist. Note: `ollama.com/library/llama4` now
*displays* `llama4:16x17b` / `llama4:128x17b` while `llama4:scout|maverick`
still resolve (200) — existence checks use the API, not the display names.

**Installed-matching rule — an *adaptation* of `catalog_entry_for`
(`catalog.rs:206-236`), family constraint included (round 2 #3):**

1. **Exact tag:** `/api/tags[].name === ollamaTag` → installed.
2. **Same base name + params:** let `base(name)` = text before `:` in the
   model name. A guide matches iff `base(installed) === base(ollamaTag)`
   **and** `details.parameter_size` (parsed to billions) is within **±25 %**
   of **any** value in the guide's `paramsBillions`. Multiple matches →
   badge all (honest); no matches → no badge.
3. Guides without `ollamaTag` never badge.

Consequences (the §10.3 expected-results table): `llama3.2:latest` (3.2B)
→ badges the 1B–3B guide only; `llama3.1:8b` → exact, 8B guide;
`llama3.1:405b` → 405B guide only; `llama3.1:70b` (>30B) must **not** badge
the 8B guide; `mistral:7b` / `qwen2.5:7b` → **no badge** (base-name mismatch
— this is the family constraint the CLI's test asserts, `catalog.rs:417-430`);
`llama3.2-vision:latest` → vision guide, never the text guide.
"Over-30B rejection" in §10.3 means exactly the `llama3.1:70b` row above.

**Starter default:** the no-models CTA offers `DEFAULT_TAG = "llama3.1:8b"`
("the default pick — about 4.9 GB"), with a secondary link to `llama3.2:3b`
("about 2 GB, if you're short on RAM") — matching `catalog.rs:162`.

**Persistence:** `localStorage` only — versioned keys (`las.sessions.v1`,
`las.selected.v1`), no server DB.

---

## 7. Error / state matrix (must all render honestly)

| # | Condition | Detect | UI | Milestone |
|---|---|---|---|---|
| 1 | Ollama not installed | `execFile` + fallbacks fail | Install guide + Re-check | M1 |
| 2 | Installed, can't reach (not running **or** wrong `OLLAMA_HOST` — indistinguishable) | `installed && ping failed` | "Can't reach Ollama at `<host>`. Start it with `ollama serve` — or set OLLAMA_HOST if it lives elsewhere." (host always visible; voice matches `client.rs:117`) | M1 |
| 2b | Installed but not on PATH | `onPath: false` | "Ollama is installed but not on your PATH — the status check used its default location." | M1 |
| 3 | Running, 0 models | tags `[]` | Picker empty state (M1); Pull-starter CTA (M3) | M1/M3 |
| 4 | Running, models | tags list | Pre-select first; tree badges (M3) | M1 |
| 5 | Status down mid-session | 5 s poll / focus | Pill red; input disables with notice | M1 |
| 6 | Status back up | same | Pill green; input re-enables; selection kept if still installed | M1 |
| 7 | Chat while down | 503 from handler | Inline notice + disabled input | M2 |
| 8 | Slow first token | not in `loaded[]` at send | "Warming up …" line | M2 |
| 9 | Model unloads after idle | next send re-warms | Normal send + warm-up line | M2 |
| 10 | Mid-stream failure | reader error / `error` line | Partial text + error line + Retry / Start new chat | M2 |
| 11 | Context window exceeded | `error` line about context/length | "Start new chat" only | M2 |
| 12 | Double-submit | send while streaming | Send → Stop; Enter ignored | M2 |
| 13 | Pull failure | `{"error"}` line | Red inline row message | M3 |
| 14 | Pull cancel | user abort | Row → Pull + "may resume later" | M3 |
| 15 | Pull while down | status at click | Disabled: "Start Ollama first" | M3 |
| 16 | Chat while pulling | — | Allowed; background-download note | M3 |
| 17 | Second pull attempted | provider `pulling` flag | Other Pull buttons disabled ("Pulling…") | M3 |
| 18 | Selected model deleted externally | poll: name gone | Clear selection + "was removed — pick another model" | M1 |
| 19 | Two tabs | `storage` event | Merge by `updated_at`, no write-back; selection shared via `las.selected.v1` | M4 |
| 20 | localStorage corrupt | JSON.parse throws | Reset + welcome state | M4 |
| 21 | localStorage full | QuotaExceededError | Evict oldest (floor 5) → honest notice | M4 |
| 22 | Wrong OLLAMA_HOST | — | Folded into row 2 | — |
| 23 | Very long response | — | Internal scroll + auto-scroll (existing) | M2 |
| 24 | Non-ASCII/emoji streaming | TextDecoder stream mode | Renders correctly | M2 |
| 25 | Empty/whitespace draft | client guard | Send does nothing | M2 |
| 26 | First-ever visit (no Ollama, no history) | both empty | Install section + welcome + CTA, no overlap | M1 (M4 for welcome) |
| 27 | Guide with no tag clicked | no `ollamaTag` | Guide link only — no chip, no Pull | M3 |
| 28 | **Stop pressed** | AbortController | Keep partial text, mark "stopped" — no error line, no Retry | M2 |
| 29 | **Malformed NDJSON line** | JSON.parse throws in try/catch | Skip line, log once; if it kills the stream → row 10 | M2 |
| 30 | **Chat payload > 1 MiB** | 413 from handler | "This chat is too long to send — start a new chat." | M2 |
| 31 | **Pull stream transport drop** | reader error | "Connection lost mid-download — Ollama will finish it next time you pull." | M3 |
| 32 | **Model-switch confirm while streaming** | stream active | Picker disabled until Stop/finish | M2 |
| 33 | **Status still `checking` on first paint** | `status === "checking"` | Send disabled with placeholder "Checking Ollama…" until resolved | M1 |

---

## 8. Copy contract (before → after; plain English)

| Where | ❌ Current / round-1 draft | ✅ This draft |
|---|---|---|
| `.desc` (tree) | "Every model below runs on this machine through ollama." | "Browse the Llama family below. Models you've installed show ✓ and can be selected; the rest can be pulled in one click." |
| Chat header/starter (CenterChat.tsx:39,56,88) | "Chat with local models via ollama" / "served by ollama" | "Chat with local models" / "…streamed live from Ollama on your machine." (**Ollama** capitalized everywhere — §10.4 positive check) |
| Picker button + options (AiModule.tsx:55-69) | hardcoded `⚡ llama` / `llama` / `local` | button = selected tag (e.g. `llama3.1:8b`); fallback "No model selected"; options = real tags |
| Assistant bubble name (CenterChat.tsx:66) | `llama` | the selected tag |
| Chat empty state (after M1) | canned reply | "Chat lands next — pick a model to get ready." (M1) → "Pick a model and say hi — replies stream live from your machine." (M2) |
| Chat down | "no model is running" | "Ollama isn't running — start it from the Ollama section in the sidebar." (click → expands + scrolls to it; **position-neutral**: sidebar is *below* chat at ≤620 px) |
| Status checking | — | "Checking…" (4th pill word — header never has fewer words than pill states) |
| Not installed body | "Install Ollama, then reload this page." | "Install Ollama to chat with local models — it's free and runs on your machine. Install it, then press Re-check." |
| Can't-reach body | "Start it: ollama serve" | "Can't reach Ollama at `127.0.0.1:11434`. Start it: `open -a Ollama` (macOS) / `ollama serve` (Linux/Windows) — or set OLLAMA_HOST if it lives elsewhere." (Linux systemd: `sudo systemctl start ollama`, **not** `--user`) |
| Pull confirm | "≈4.9 GB download" | "llama3.1:8b · about 4.9 GB — downloaded once, then it's yours offline." |
| Pull confirm (>30B) | (none) | "This one is huge (≈245 GB) — bigger than anything the llama CLI recommends. Pull anyway / Cancel." |
| Pull cancel | "partial download resumes later" | "Download stopped. Ollama may pick it back up next time." |
| Warm-up | "Warming up <model>…" | "Warming up llama3.1:8b — the first reply takes a few seconds." |
| History meta | "N of M sessions" | "**N sessions** — stored in this browser" |
| History empty | bare `[]` | `// No chats yet — messages you send are saved in this browser only.` above `[]`; skeleton (`…`) until hydrated |
| Context overflow | "Retry" | "This chat is too long for the model's memory. Start a new chat." + button |
| Payload >1 MiB | (none) | "This chat is too long to send — start a new chat." |
| No-models CTA | "Pull a starter model (llama3.2:3b)" | "No models yet — get the default pick: llama3.1:8b (about 4.9 GB). Prefer smaller? llama3.2:3b (about 2 GB)." |

Voice check at M4: the section must read like `llama`'s guided recommender
(same defaults — `DEFAULT_TAG`, same plain-English register).

---

## 9. Milestones (each ends with the applicable §10 subset)

- **M1 — Status + local models + honest chat placeholder.** `lib/ollama.ts`
  (guards included), all three route handlers, `OllamaStatus` sidebar
  section (collapsed, live, detected-OS install guide), `ModelProvider`
  (status ownership + selection), real dropdown (installed models only).
  **`CANNED_REPLY` is deleted here** — CenterChat shows the M1 placeholder
  so a green pill never coexists with "no model is running" (round 2 #14).
  *Done when:* pill flips correctly with `ollama serve` killed/restarted
  without a rebuild; dropdown shows `llama3.1:8b` + `llama3.2:latest` with
  sizes; install guide visible when down; abort wiring verified via the
  §10.2.5 curl abort (no runaway generation — the Stop **button** is M2).
- **M2 — Real chat.** Streaming pipeline (`response.ok` branch, split-safe
  line buffer, parse try/catch), state matrix rows 5–12, 23–25, 28–30, 32,
  Stop, warm-up, double-submit guard, model-switch confirm. Sessions remain
  **in-memory** (no persistence claim anywhere in M2 copy).
  *Done when:* tokens stream, Stop leaves a "stopped" reply with no error
  line, killing Ollama mid-conversation shows the honest notice, forbidden
  strings (§10.4 list B) are gone from source.
- **M3 — Pull.** `ollamaTag` + `pullSize` + `paramsBillions` on all 15
  tagged guides, installed matching (§6 rules 1–3), tree chips (`(text
  chat)` variants), provider-owned one-at-a-time pull with aggregated
  progress, auto-select-if-empty, starter CTA, `.desc` rewrite, copy rows
  for picker/bubble. *Done when:* pulling `llama3.2:1b` end-to-end shows
  progress → appears installed → chat answers; a bad tag errors inline;
  this machine's `llama3.2:latest` badges the 1B–3B guide; `mistral:7b`
  badges nothing (§10.3 table).
- **M4 — Real history + polish + docs + full QA.** `lib/history.ts`
  (mount-only reads, session rows + raw JSON of current session, New-chat
  control, restore-latest, lifecycle rules, hydration skeleton, multi-tab
  merge, quota guards, caps, `las.selected.v1`), seed deleted, full copy
  table (§8), README + **`package.json` `start` script** updated (loopback
  bind, stale route count fixed, "static/canned" claims removed), vitest
  suite green, full §10 gate + committed screenshot references.
  *Done when:* every §8 row is the shipped copy; §10 checklist signed off.

Deferred (explicitly out of scope): model deletion, `llama catalog --json`
alignment, autostart, multi-remote servers, parameter tuning, image input in
chat (vision guides get `(text chat)` chips; vision *input* is a separate
product decision).

---

## 10. QA gate — full set at M4, applicable subset at each milestone

### 10.1 Build & lint
1. `pnpm lint` clean; `pnpm build` exits 0 with **no** `Error occurred
   prerendering` / `dynamic-server-error` lines. `next build
   --debug-prerender` is a *separate diagnostic build* (it disables
   minification and must not be deployed): run it when investigating, then
   rebuild clean; route handlers never run instant validation, so API routes
   can't affect its output.
2. **Route accounting (named artifacts, round 2 #1):**
   - `.next/prerender-manifest.json` → `routes` has **24** entries today and
     must **stay exactly 24** after M1 — the 3 API routes must never be
     prerendered (this is the executable form of §3.3's assertion),
   - `.next/app-path-routes-manifest.json` → **6** entries today → **9**
     after M1 (3 API routes),
   - proxy counted separately from `.next/functions-config-manifest.json`.

### 10.2 Backend smoke (curl, against `http://127.0.0.1:<port>`)
1. Status: live flips with `ollama serve` killed/restarted (no rebuild);
   `OLLAMA_HOST=http://127.0.0.1:1` override → honest "can't reach" (row 2).
   `.next/prerender-manifest.json` contains no `/api/*` entries.
2. Chat: `curl -N -X POST …/api/ollama/chat` streams NDJSON; measure
   time-to-first-byte (expected fast — `no-transform` already excludes gzip,
   §3.4). If > ~200 ms, suspect Ollama TTFB, then consider server-wide
   `compress: false` as fallback.
3. Pull: `llama3.2:1b` end-to-end; bad tag → `{"error"}` line.
4. Guards: foreign `Origin` → 403; `Origin: null` → 403; foreign `Host`
   (rebinding-style) → 403 **on GET and POST**; non-JSON content-type → 400;
   2 MiB body → 413; tag `../../etc` or uppercase `llama3:8B` → 400;
   Origin-absent curl → accepted.
5. Abort: client abort mid-stream → generation stops (`ollama ps` idles
   within its unload window), server log has no unhandled rejection.

### 10.3 Unit tests (vitest)
`vitest` devDependency + `"test": "vitest run"`; CI gains a **Test** step
between Lint and Build. Pure functions only — no e2e runner (the manual
matrix in §10.5 covers integration; proportionate for a never-in-production
tool):
- `isValidTag`: accept/reject table — `../../etc`, uppercase `llama3:8B`,
  empty, overlong, valid mixed-case suffixes are **rejected** (lowercase
  rule).
- NDJSON line buffer: chunk splits mid-line, mid-multibyte char, CRLF, blank
  lines, `{error}` line, `done` line, malformed line (row 29).
- `filterSessions(sessions, query)` — pure search behavior.
- `matchInstalled(tags, guides)` — **expected-results table** (§6):
  `llama3.2:latest` → 1B–3B guide only; `llama3.1:8b` → 8B guide (exact);
  `llama3.1:405b` → 405B guide only; `llama3.1:70b` must not badge the 8B
  guide; `mistral:7b`/`qwen2.5:7b` → none; `llama3.2-vision:latest` →
  vision guide only; `llama4:scout` → scout guide.
- Data integrity: every `ollamaTag` guide has `pullSize` **and**
  `paramsBillions`; no duplicate tags; **pullSize value table asserted**
  (the §6 sizes with their Oct-2026 capture note — this is the mechanism
  round 2 asked for instead of the "locked" claim).
- History prune: 21 sessions → 20; 101 messages → 100.

### 10.4 Forbidden-string sweep (scoped, round 2 #6)
- **List B (source, `app/ components/ data/ lib/ *.json *.yaml`, excluding
  this plan):** `CANNED_REPLY|canned|UI-only demo|demo nonsense|no
  backend|TODO|FIXME` — zero matches after M2 (README part after M4). Also a
  **positive check**: `Ollama` is capitalized in all user-facing copy (a
  grep for lowercase `ollama` in JSX text must only hit code identifiers,
  URLs, and commands).
- **List A (built HTML + RSC payloads of `/` `/llama` `/llama/<slug>`):**
  `guy hawkins|invite|command d+|slack|zoom|upwork|centra` — zero matches.
  The bare token `query` is **dropped** (it's the natural parameter name the
  plan itself prescribes, and legitimate model copy contains it).

### 10.5 Manual matrix + accessibility
- Every §7 row rendered at **1920×1080, 1440×768, 768×1024, 375×812**
  (1440×768 for sidebar space math; 375×812 for the ≤620 px reorder) —
  per-milestone subsets: M1 → rows 1–4, 5–6, 22(gone), 26, 33; M2 →
  5–12, 23–25, 28–30, 32; M3 → 13–17, 18, 27, 31; M4 → 19–21, 26 full.
- A11y rows: status pill = dot **+ text** with `aria-live="polite"`; pull bar
  = `role="progressbar"` + `aria-valuenow/min/max` + label; disabled inputs
  have `aria-disabled` + visible placeholder reason; every icon button has an
  `aria-label` (incl. `＋ New chat`); focus ring visible on
  Pull/Send/Stop/Re-check/session rows; keyboard-only pass:
  expand-status → picker → chat → pull → history.

### 10.6 Regressions + visual references
1. 19 slugs 200, bogus slug 404, `/` + `/llama` 200, all internal links 200.
2. **Visual diff — manual, explicit (round 2 #8):** committed reference
   screenshots under `crates/web/qa/baselines/` (home/guide/directory ×
   1920/768/375 + 1440×768 sidebar-expanded), captured with
   `npx playwright screenshot` **run locally by the implementer at M4** (not
   in CI — CI has no browser and §10.3 forbids an e2e runner). Diffing is a
   human side-by-side recorded in `crates/web/qa/README.md` (which screenshot,
   what changed, why intentional). CI never runs browsers.
3. `bazel build //...` unaffected (`.bazelignore`); CI green (web job =
   lint + test + build).
4. `git status`: only intended files, nothing outside `crates/web/` (+ root
   files if M4 touches them); `docs/` + `models/` stay untracked.

---

## 11. Decisions & open questions (input for round 3)

**Decided (round 2 inputs):**
1. *405b / 245 GB maverick pulls in the confirm copy* → **mark them**: the
   >30B warning line ships (§5.4, §8) — the CLI's ≤30B promise is part of
   the product's voice.
2. *Vision chip wording* → `✓ installed (text chat)` for
   `llama3.2-vision:*` and `llama4:*` (chat has no image input).
3. *Warm-up heuristic vs `/api/ps` poller* → **heuristic kept** (7 s
   measured cold-load; a poller adds a second fetch loop for copy that's
   already honest). Revisit only if M2 QA shows it misleads.
4. *IPv6* → accepted: IPv4-loopback-only bind; QA uses `127.0.0.1` URLs.
5. *`--debug-prerender` as a gate* → downgraded to a diagnostic (§10.1) —
   the hard gate is `pnpm build` exit 0 + no prerender errors + manifest
   invariants.

**Open for round 3:**
1. Re-verify §6's `paramsBillions` values against `catalog.rs` entry params
   and the registry's reported `parameter_size` strings (parsing format:
   `"8.0B"`, `"109B"`… — confirm the parse rule).
2. §5.5's session-row `.histrow` styling: new CSS in `globals.css` — confirm
   it fits the sidebar's existing rhythm without the round-1 space math
   breaking (the rows appear *above* the raw JSON, growing the section).
3. Provider size: status + selection + pulling + sessions in one context —
   does it need `useMemo`/split contexts to avoid re-rendering the whole
   tree every 5 s? (Round 3 to judge: recommend a concrete split if so.)
4. Anything round 3 finds new.
