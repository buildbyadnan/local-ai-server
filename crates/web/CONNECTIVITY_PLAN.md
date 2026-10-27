# Plan — Local AI Server: UI ↔ Ollama / `llama` CLI connectivity

Status: **revised after audit round 3 of 3 — final.** Three audit rounds
complete (round 1: 3 auditors × 24 findings; round 2: 2 auditors × 20
findings; round 3: 2 auditors × 30 findings, zero blockers); every finding
folded in; §11 records the decisions the auditors asked for. Ready to
implement M1→M4 (§9).
Scope: turn the static web UI into a working local chat product: detect
Ollama, guide installation, show the models already on this machine, let the
user select and chat with them (real streaming), and pull new models from the
catalog — all local, nothing shipped to production.

---

## 0. Revision log

- **Round 1 → rev. 1 (`e389971`):** 24 findings, all eight BLOCKERs folded
  (request-time pinning, Response passthrough, live status, session restore,
  serve command, vision tags, mount-only localStorage, M2↔M4 ownership).
  Round 2 re-verified the six doc-dependent amendments as accurate.
- **Round 2 → rev. 2 (`861fb09`):** 20 findings folded (route-count gate vs
  named artifacts, streaming error paths, `paramsBillions` matching rules,
  restore click target, loopback guards, pull state ownership, copy table,
  state matrix rows 1–33, scoped QA sweeps).
- **Round 3 → this revision:** both final auditors returned "amend first"
  with **zero blockers**; fixes:

| # | Finding (round 3) | Fix |
|---|---|---|
| R3-1 | **MAJOR** Host allowlist as enumerated rejects `Host: 127.0.0.1:<port>` — the plan's own QA traffic | §3.2 — parse rule (strip port/brackets; hostname ∈ loopback set) |
| R3-2 | **MAJOR** §10.5 row 1 ("not installed") unrenderable on the reference machine | §4.1 + §10.5 — `OLLAMA_BIN_PATHS` QA override + recipes for rows 1/2b/3 |
| R3-3 | **MAJOR** history search left unspecified after the JSON redesign | §5.5 + §8 — search filters rows, auto-open kept, meta variants, zero-result copy |
| R3-4 | **MAJOR** session rows/`＋ New chat` unguarded mid-stream (tokens land in wrong session) | §5.5 + §7 row 38 |
| R3-5 | **MAJOR** persistence timing unspecified (Stop/error replies lost) | §5.5 — three write points; §7 row 35 |
| R3-6 | **MAJOR** restored session's model vs picker selection collision | §5.5 — silent programmatic `setSelected`, read-only fallback, send stamps model |
| R3-7 | **MAJOR** history-lifecycle rules had no §7 rows (journey step 4 untested) | §7 rows 34–38 + subsets |
| R3-8 | **MAJOR** §7 milestone column ≠ §10.5 subsets (rows 3, 18) | §10.5 — aligned |
| R3-9 | **MAJOR** §8 missed `layout.tsx` metadata, line-keyed afters, precedence clause | §8 — rows + normative clause |
| R3-10 | **MAJOR** List B scope omits `README.md` + doesn't exclude `node_modules` | §10.4 — scope fixed |
| R3-11 | **MAJOR** 20 `.histrow`s blow the round-1 space math unboundedly | §5.5 — `max-height: min(40vh, 300px)` cap + restated math + QA threshold |
| R3-12 | MINOR `.next/functions-config-manifest.json` path wrong | §10.1 — `.next/server/…`, stays 1 `/_middleware` |
| R3-13 | MINOR forbidden-export citations don't cover `runtime` | §3.3 — cite `02-route-segment-config/index.md:25` + `runtime.md:24` |
| R3-14 | MINOR execFile-at-build nuance order-dependent vs §3.4 guard-first | §3.3/§4.1 — guard order pinned, mechanism corrected, catches stay mandatory |
| R3-15 | MINOR `--debug-prerender` aside was an invalid inference | §10.1 — reworded as diagnostic for any prerender error |
| R3-16 | MINOR curl smoke lacked `Content-Type` (guard would 400 it) | §10.2 — full command + exit-18 note |
| R3-17 | MINOR §0 stale pointer (R2-6), "six blockers" → eight, dead cross-ref sentence | §0 — cleaned |
| R3-18 | MINOR copy divergences (§5.1/§7 vs §8; starter link; >30B literal `≈245 GB`) | §8 precedence + §5.4 interpolates `pullSize` |
| R3-19 | MINOR M1 Send behavior + seed-history honesty | §9 — input disabled at M1; seed explicitly noted as placeholder |
| R3-20 | MINOR multi-tab removal resurrection; README/CI enumeration; journey "first" wording | §5.5, §9, §1 |
| R3-21 | MINOR §10.3 fixtures missing `parameter_size` inputs; §6 quoted a nonexistent term | §6, §10.3 — fixtures listed, phrase reworded |
| R3-22 | NITs: line refs (`catalog.rs:206-229`, `client.rs:114-119`), `qwen2.5:7b` test, LOCALAPPDATA expansion, `safeMessage` undefined, guard contract, Origin-port source, per-milestone test tags, vitest alias, title/trim rules, meta pre-hydration, heights in §10.6 | folded in at each site |

---

## 1. Product thinking

**Who it's for.** Someone who installed this repo and wants a GUI over the
same local stack the `llama` CLI drives. The CLI already proves the product:
a thin client to a local Ollama server. The UI becomes the second client.

**Principles (carried over from v1):**
- Local-only: no cloud, no accounts, no telemetry; data stays in the browser.
- Honest states: never pretend a model answered when nothing ran — and never
  claim persistence/connectedness the UI doesn't have (§9 keeps M1 honest).
- Plain language: install/status/pull copy for humans (§8 is normative).
- No unnecessary code: every field, file, and state earns its place.

**The user journey this plan delivers:**
1. Open the UI on a machine with **no Ollama** → a collapsed **Ollama** section
   directly below the sidebar's *Plugins* item explains how to install it
   (detected-OS command first), with a live status pill and Re-check.
2. Ollama **installed but not running** → told how to start it on *their* OS.
3. Ollama **running** → the models already on this machine *are* the picker's
   options (installed only), pre-selecting the first; the tree is the path to
   models you don't have.
4. User **selects a model and chats** → real token streaming, Stop, sessions
   saved locally (on every stream end — including Stop and errors) and
   restorable.
5. User wants a model they **don't have** → Pull from the tree with live
   progress → auto-select → chat.

**What we deliberately do NOT build:** remote servers, auth/multi-user, model
deletion, parameter tuning, TLS, deployment. The `llama` CLI keeps its role as
the terminal client; no Rust changes are required for v1.

---

## 2. Ground truth (verified on this machine, Oct 2026)

- Ollama **0.40.8** installed (`/usr/local/bin/ollama`), `ollama serve`
  running; models present: **llama3.1:8b** (4.9 GB), **llama3.2:latest**
  (2.0 GB); nothing loaded (`/api/ps` → empty). `details.parameter_size`
  values: `"8.0B"`, `"3.2B"` (these strings drive §6's parse rule).
- The `llama` CLI is a thin HTTP client over `http://127.0.0.1:11434`
  (host via `--host` / `OLLAMA_HOST`) using exactly `GET /api/tags`,
  `POST /api/generate`, `POST /api/chat` (NDJSON: `{message:{content},
  done, error}`).
- `catalog.rs`: `DEFAULT_TAG = "llama3.1:8b"` (line 162);
  `catalog_entry_for(installed)` (lines **206–229**) matches an installed
  model in two steps: **exact tag**, else **same base name + ≤25 % relative
  deviation from nominal params, nearest wins**. `parse_billions`
  (lines 186–195) extracts the leading `[0-9.]` run from a
  `parameter_size` string and `parseFloat`s it. §6 adapts exactly this.
- Ollama pull API (docs.ollama.com, v0.40.8): `POST /api/pull`
  `{"model": "<tag>"}` streams NDJSON: `{"status":"pulling manifest"}` →
  `{"status":"downloading <digest>","digest","total","completed"}` →
  `{"status":"success"}`; failures arrive as `{"error": "..."}` lines on
  HTTP 200. Content type `application/x-ndjson`.
- All 15 tags in §6 confirmed present in the registry (round 2); sizes are
  Σ registry manifest layers. `ollama show` cannot verify an **uninstalled**
  tag — registry/library checks only. Registry manifests carry **no**
  `parameter_size` (that field exists only on installed models) — §6's
  values come from published model specs (provenance noted in §10.3).

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

**Guard contract:** each guard function returns a ready-made `Response` on
failure and `null` on success — callers write `if (const err = guard(req))
return err;` (guards run first, in the §3.4 order).

### 3.2 Shared server helper — `lib/ollama.ts` (server-only)

- `base()` → `process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434"`, trimmed
  of trailing `/` (identical fallback to the CLI's clap default).
- `requireLoopbackHost(request)` — **all three routes, including GET**.
  Parse rule (round 3 fixed the enumeration): take the `Host` header, strip
  an optional `:port` and any `[]` brackets → `hostname`; accept iff
  `hostname ∈ {localhost, 127.0.0.1, ::1}` — **any port is fine** (so
  `Host: 127.0.0.1:3000`, `[::1]:3000`, `localhost` all pass; the QA URLs
  in §3.6/§10.2 are exactly these forms). Failure → `403 {error}`. This is
  the DNS-rebinding backstop: a re-bound attacker page arrives with a
  foreign `Host` and is rejected before touching Ollama.
- `requireLocalPost(request)` — both POST routes additionally require
  `Content-Type: application/json` and, **when an `Origin` is present**, that
  its hostname is loopback **and** its port equals the port parsed from the
  already-validated `Host` header (the handler has no socket access; the Host
  port is the source of truth; Host absent → default 80/443 by protocol —
  in practice always present). `Origin: null` → reject. Origin-absent
  requests (curl) are accepted — the mandatory JSON content-type is what
  blocks cross-site browser POSTs (they'd preflight; we send no CORS
  headers). Failure → `400`/`403 {error}`.
- `readJsonBody(request, maxBytes = 1 MiB)` — running byte counter; over the
  cap → returns a ready-made `413 {error}` Response; on success returns the
  parsed object. **Contract: `Response | null`** (never an error envelope —
  round 3: a client payload containing an `error` key must not short-circuit
  validation). Effective cap: 1 MiB of JSON is the real limit (§7 row 30).
- `isValidTag(tag)` — `^[a-z0-9][a-z0-9._/-]{0,127}(?::[a-z0-9._-]{1,64})?$`
  (lowercase only; uppercase `llama3:8B` is rejected — asserted §10.3).
- `ollamaFetch(path, init, timeoutMs)` — `fetch(base() + path, {cache:
  "no-store", signal, ...init})` with AbortSignal timeouts (2 s for status,
  none for streams). Rejects fast when Ollama is down.

### 3.3 Request-time semantics — pinned (rounds 1 & 3)

Per `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
lines 87–124: under Cache Components, GET route handlers **run at request
time by default**; prerendering stops when a handler accesses **network
requests**, request-object properties, or `connection()`.

**Implementation rules (no exceptions):**
- Do **not** export any segment config from `app/api/**/route.ts`. Forbidden:
  `dynamic`, `revalidate`, `fetchCache`, `dynamicParams` (they error —
  `02-route-segment-config/index.md:25`, `migrating-to-cache-components.md:74,652`),
  `runtime` (explicitly unsupported under Cache Components —
  `02-route-segment-config/runtime.md:24`: "remove the `runtime` export,
  including `runtime = 'nodejs'`"), `preferredRegion` (deprecated).
  Request-time behavior comes from touching the network/request, not flags.
- **Guard order is part of this contract** (round 3): the Host guard reads
  `request.headers` *before* anything else (§3.4), so a prospective
  prerender bails at that synchronous request-data access and the handler
  body — including `execFile` — **never runs at build**. Catches around
  every promise remain mandatory anyway: at runtime an uncaught rejection in
  the GET handler takes the route down, and if anyone reorders the handler
  so a promise runs before the first request access, an uncaught rejection
  fails `pnpm build`. Fallbacks in §4.1 are therefore load-bearing.
  **M0 extends the same ordering to the proxy:** `/api/*` requests carrying
  any `Content-Encoding` other than `identity` are refused with **415**
  before a handler can see the body — the standing mitigation for the
  bundled Brotli decoder RCE (CVE-2026-111497), kept even on patched Node.
  Guards (Host → Origin) always precede `readJsonBody` in every handler.
- The **network fetch** is what guarantees non-prerendering (the documented
  bail). `process.env` reads alone are *not* dynamic.
- Status fetches use `cache: "no-store"`; responses send
  `Cache-Control: no-store`. (Only GET is ever prerenderable — reading
  `Origin` on POST is safe.)
- Acceptance (§10.2): status reflects live Ollama state after
  `ollama serve` is killed/restarted with no rebuild, and
  `.next/prerender-manifest.json` contains **no** `/api/*` entries.

### 3.4 Streaming passthrough — exact pattern

```ts
// app/api/ollama/chat/route.ts (the authoritative shape)
if (const err = requireLoopbackHost(request)) return err;
if (const err = requireLocalPost(request)) return err;

const parsed = await readJsonBody(request);       // Response if over 1 MiB
if (parsed instanceof Response) return parsed;
// …validate model/messages (§4.2) → 400 on violation…

let upstream: Response;
try {
  upstream = await fetch(`${base()}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: true }),
    signal: request.signal,        // §3.5 — client abort reaches Ollama
  });
} catch (err) {
  if (err instanceof DOMException && err.name === "AbortError") {
    return new Response(null, { status: 499 });   // client went away — quiet
  }
  return Response.json({ error: "Ollama isn't running." }, { status: 503 });
}
if (!upstream.ok || !upstream.body) {
  // safeMessage: try JSON.parse(await upstream.text()).error,
  // fall back to `upstream.statusText || "Ollama returned an error."`
  return Response.json({ error: await safeMessage(upstream) }, { status: 502 });
}
return new Response(upstream.body, {
  headers: {
    "Content-Type": "application/x-ndjson",
    "Cache-Control: "no-store, no-transform",
  },
});
```

- Ollama's on-200 `{"error"}` lines (bad tag, context overflow) pass through
  and are parsed client-side (§5.3); transport failures map to 503/502
  **before** streaming starts.
- **Client side:** if `!response.ok`, read the JSON `{error}` and enter the
  corresponding state — never open a stream reader on an error response.
- **Compression:** the mandated `no-transform` already excludes these routes
  from Next's gzip (vendored `compression` honors it), so §10.2 measures
  first-byte latency with gzip out of the picture; `compress: false` remains
  a whole-server fallback for other routes if ever needed.

### 3.5 Abort propagation

Mechanism (in-tree source; no doc covers it): `build/templates/app-route.js`
wires `signalFromNodeResponse(res)` into every route-handler `NextRequest`;
the adapter aborts it on response `'close'` when not fully written
(`server/web/spec-extension/adapters/next-request.js:45-63`). Passing
`request.signal` into the upstream `fetch` destroys the TCP connection to
`:11434`; Go's http server cancels the request context — Ollama stops
generating. Acceptance: **abort mid-stream → generation stops (`ollama ps`
idles within the model's normal unload window), server log has no unhandled
rejection.** A lagging unload is not a failure.

### 3.6 Serving locally — loopback mandatory

```bash
pnpm exec next dev   -H 127.0.0.1   # dev, loopback only
pnpm exec next start -H 127.0.0.1   # production build, loopback only
```

- **Both** default to binding `0.0.0.0` (CLI docs `06-cli/next.md:64-71,
  112-123`) — with "Origin-absent → accepted", a bare dev server would let
  any LAN machine drive Ollama through us. Loopback binding is a product
  rule. `pnpm exec next …` is the documented, unambiguous path (we don't
  depend on pnpm's arg-forwarding behavior).
- IPv4 loopback only: QA commands use `http://127.0.0.1:<port>` (some
  resolvers prefer `::1` for `localhost`).
- M4 changes the `package.json` `start` script to
  `next start -H 127.0.0.1` so the default can't be exposed by accident.
- **M0** does the same for `dev` (`"dev": "next dev -H 127.0.0.1"`) — the
  rule is "loopback by default", not "loopback in production".

---

## 4. Backend behavior details

### 4.1 `GET /api/ollama/status`

**Order (pinned, §3.3):** guard → `execFile` → network fetches.

1. `installed` + `onPath`: `execFile(process.platform === "win32" ?
   "ollama.exe" : "ollama", ["--version"], { timeout: 2000, env:
   process.env })` — fixed argv, no shell (no injection). PATH miss (ENOENT)
   or a >2 s timeout (AV scan) → retry fallback locations, paths **built with
   `path.join`** (no `%VAR%` expansion in `execFile`):
   - Windows: `path.join(process.env.LOCALAPPDATA, "Programs", "Ollama",
     "ollama.exe")`
   - Linux/macOS: `/usr/local/bin/ollama` (both installers use it),
     `/Applications/Ollama.app/Contents/Resources/ollama` (macOS app),
     `/usr/bin/ollama`.
   Found only via fallback → `installed: true, onPath: false` (GUI-launched
   servers often lack user PATH — the UI says "installed but not on your
   PATH", never "not installed"). **QA override:** `OLLAMA_BIN_PATHS`
   (comma-separated; empty string forces `installed: false`) replaces the
   candidate list so row 1 is renderable on this machine (§10.5).
   **Every outcome is caught** (§3.3) — a rejection here crashes the route
   at runtime and, if reordered ahead of the guard, the build.
2. `running`: `GET /api/tags` via `ollamaFetch(..., 2000)`; failure →
   `running: false`.
3. `models`: `tags.models[]` → `{name, size, parameterSize}` only — exactly
   what the picker shows and §6 matching needs. `[]` when down.
4. `loaded`: `GET /api/ps` → names currently in memory; `[]` on failure.
5. Every field has a fallback (`false` / `[]` / host string).

### 4.2 `POST /api/ollama/chat`

- Guards (§3.2) → `readJsonBody` → validate: `model` passes `isValidTag`;
  `messages` array ≤ 100 entries, each `{role: user|assistant|system, content
  : string ≤ 32 000 chars}` (the moved `ChatMessage.role` type **widens to
  include `"system"`**). Violation → `400 {error: "<plain-English reason>"}`
  before any upstream call.
- Ollama unreachable → `503 {error: "Ollama isn't running."}` — rendered as
  the "not running" notice, never as a fake reply.
- Otherwise → passthrough per §3.4.

### 4.3 `POST /api/ollama/pull`

- Same guards; `model` must pass `isValidTag`.
- Passthrough per §3.4. Cancel = client aborts fetch (§3.5); Ollama finishes
  or resumes on its own — the UI says so honestly (§8).

### 4.4 Payload-caps philosophy

Caps are guard rails for an unauthenticated localhost tool (memory + abuse
bounds), not a security boundary — stated as such in code comments. The real
security boundary is loopback binding (§3.6) + Host/Origin guards (§3.2).

---

## 5. UI changes, section by section

### 5.1 Sidebar — new "OLLAMA" section (directly below *Plugins*)

**Space math (restated after round 3):** sidebar inner height ≈ 840 px
@1440×900 / ≈ 708 px @1366×768; existing content ≈ 325 px closed / ≈ 515 px
with AI History open; the session-row list (§5.5) is **capped at
`min(40vh, 300px)` with internal scroll**, so the open history block adds
≤ ~300 px + meta — never the raw `20 × ~30 px` worst case. `.side` is a flex
column with `overflow-y: auto`, `flex: none` children (`globals.css:162-175`)
— the section is therefore **collapsed by default**: a header row (label +
status pill) that expands on click. QA at **1440×768** with the pass
criterion in §10.5.

```
OLLAMA                              ● Connected      ← click to expand
┌──────────────────────────────────────────────┐
│ not installed:                               │
│   Install Ollama to chat with local models…  │   ← full copy: §8
│   [detected OS one-liner, selectable text]   │
│   Other systems: macOS · Windows ▾           │
│   Or download: ollama.com/download           │
│   [Re-check]                                 │
│ installed, unreachable:                      │
│   Can't reach Ollama at <host>. …            │   ← full copy: §8
│   [Re-check]                                 │
│ running:                                     │
│   2 local models on this machine             │
│   llama3.1:8b · llama3.2:latest  → jump to   │
│   [Re-check]                         picker  │
└──────────────────────────────────────────────┘
```

**State ownership:** `ModelProvider` (§5.2) owns the **single** status fetch —
on mount, every **5 s gated by `document.visibilitychange`**, on `window`
focus, and via `refresh()` (Re-check, after pulls). Each poll **aborts the
previous in-flight request** and applies its result only if latest (`pollId`
guard) — a slow poll can never overwrite a fresh pill. `OllamaStatus` is
**presentation-only**: reads `status` from context, calls `refresh()`.

Pill → header word (4 states, 4 words): `checking → "Checking…"` (grey),
`down → "Not installed"` (`--bad`), `stopped → "Not running"` (`--y`),
`up → "Connected"` (`--g`). Dot **+ text always** (not color-alone),
`aria-live="polite"`.

Install commands: detected-OS-first via `navigator.userAgent` (client only);
other OSes one click away; selectable text (no copy buttons). Start copy per
OS lives in §8. Body copy matches the CLI's register
(`llama-cli/src/ollama/client.rs:114-119`): the actual host is always
visible, never in a tooltip.

### 5.2 ModelProvider + AI Module (right panel) — this machine first

- **One `ModelProvider`** (`components/ModelProvider.tsx`, `"use client"`)
  exporting context + hooks; `app/page.tsx` stays a server component and
  renders `<ModelProvider>…children…</ModelProvider>`. Full context value
  (enumerated): `{status, hydrated, models, selected, setSelected, refresh,
  pulling, startPull, cancelPull, sessions, setSessions, query, setQuery}`.
  All fetching and pull state live here — a module-scoped variable cannot
  re-render React.
  **Re-render discipline (round 3 decision, §11.3):** the value is built with
  `useMemo`, and a new `status` object is committed **only when it differs by
  value** — a stable 5 s poll causes zero re-renders (no
  CenterChat-with-100-messages churn every poll). A context split
  (`StatusContext`/`ChatContext`) is *not* done up front — only if M2
  profiling shows churn. `AiModule`, `CenterChat`, `OllamaStatus` consume via
  `useOllama()` / `useChat()` hooks.
- **Dropdown = the real picker.** Options = `status.models` (installed only —
  the tree is the sole path to not-installed models), sorted by name; size +
  `loaded` badge each; **pre-select the first** on load. Button label =
  selected tag (fallback "No model selected"); the hardcoded
  `⚡ llama / llama / local` labels and the bubble name `llama` are replaced
  by the real tag (§8).
- **Model-switch rule:** current session has messages **and no stream in
  flight** → inline confirm in the row ("Switch to llama3.2:latest? Your
  current chat stays as its own session.") with Switch / Cancel. During a
  stream the picker is disabled (Stop first — §7 row 32). No messages →
  silent switch. *Programmatic* switches (session restore, §5.5) never show
  the confirm — the rule applies to user picks only.
- **Tree gains install state** (via `ollamaTag`, §6):
  - installed → `✓ installed` chip — `llama3.2-vision:*` and `llama4:*`
    guides read `✓ installed (text chat)` (chat has no image input); clicking
    the row **selects** it (guide link stays reachable via title/↗),
  - not installed → **Pull** button (§5.4), disabled with reason when Ollama
    is down,
  - no tag (Safety classifiers, LLaMA 1, …) → unchanged guide-only link
    (never a dead button).
- **`.desc` copy rewritten:** *"Browse the Llama family below. Models you've
  installed show ✓ and can be selected; the rest can be pulled in one click."*

### 5.3 Chat — real streaming (`components/CenterChat.tsx`)

- `CANNED_REPLY` is deleted in **M1** (§9), replaced by an honest placeholder
  with the **input disabled** at M1 (§9) — a green pill never coexists with
  "no model is running" copy. M2 wires:
  Send → `POST /api/ollama/chat` → if **`!response.ok`**, read JSON
  `{error}` and enter the matching state — never open a stream reader on an
  error response. Otherwise read `response.body` with a `ReadableStream`
  reader, decode via `new TextDecoder()` (stream mode — handles chunks split
  mid-multibyte), buffer across chunk boundaries, split on `\n`,
  `JSON.parse` each non-empty line **inside try/catch** (malformed line →
  row 29, not a crash):
  - `message.content` → append to the assistant bubble,
  - `error` → error state (§7),
  - `done: true` → finish; persistence per §5.5 write points (M4).
- **Double-submit guard:** while streaming, Send becomes **Stop**
  (AbortController) and Enter is ignored; empty/whitespace drafts never fire.
- **Stop outcome:** keep partial text, mark the reply "stopped" — no error
  line, no Retry (row 28). **The session is still written** (§5.5).
- **Warm-up line:** on send, if `selected ∉ status.loaded` → *"Warming up
  `<model>` — the first reply takes a few seconds…"* until first token.
- **State matrix rows** (inside the existing `.chat` frame):
  1. `ollama down` → notice: §8 "Chat down" copy (**position-neutral** — at
     ≤620 px the sidebar sits *below* the chat, `globals.css:660-665`);
     clicking the notice expands + scrolls the Ollama section into view.
     Input disabled with that placeholder.
  2. `no models` → CTA + Pull-starter (§6 defaults).
  3. `ready` → normal send.
  4. `stream error` → keep partial text, append honest error line, actions
     **Retry** / **Start new chat**; context-overflow → **Start new chat**
     only (retrying the identical payload fails again).

### 5.4 Pull flow

- Trigger: Pull button in the tree, or the no-models CTA.
- **Preconditions:** Ollama running (else disabled: "Start Ollama first");
  `pullSize` exists (required on every tagged guide, §6).
- **State lives in the provider:** `pulling: {tag, progress, status} | null`
  — one pull at a time (others disable, "Pulling…"); AiModule renders the
  progress row; CenterChat renders "A model is downloading in the
  background." — all reactive through context.
- **Confirm inline in the row:** name + size hint ("llama3.1:8b · about
  4.9 GB — downloaded once, then it's yours offline.") → Pull / Cancel.
  **>30B extra line** (trigger: `max(paramsBillions) > 30`; size
  **interpolated from `pullSize`**, never a hardcoded literal): *"This one
  is huge (≈{pullSize}) — bigger than anything the llama CLI recommends.
  Pull anyway / Cancel."*
- **Progress:** `Map<digest, {total, completed}>` (last write wins per
  digest); `percent = Σcompleted / Σtotal × 100` + current `status` text.
  Before `total` arrives: indeterminate bar with `pullSize` as estimate.
- **Success** → `refresh()`, then **auto-select only if the chat is empty**;
  else "Ready — switch models from the picker." Row flips to `✓ installed`.
- **Error line** → red inline message; row returns to Pull.
  **Transport drop** → row 31.
- **Cancel** → abort fetch (§3.5); row → Pull + "Download stopped. Ollama
  may pick it back up next time."

### 5.5 AI History — real sessions (raw JSON stays)

- Store in **`lib/history.ts`** (types move from `data/chat-sessions.ts`):
  `id, title, model, created_at, updated_at, messages[], message_count`;
  `title` = first user message **hard-cut** at 60 chars; `updated_at` stamped
  on every save; key `localStorage["las.sessions.v1"]`.
- **Restore:** on mount, read sessions **inside `useEffect`** (never during
  render — render-time `localStorage` breaks `next build`; initial state
  empty ⇒ SSR/CSR match), then select the most recent session into the chat.
  - **Click target:** above the raw JSON, each session renders as a
    `.histrow` **button** (title · model · relative date) that loads that
    session; the `<pre>` keeps its JSON look but shows **the selected
    session's JSON**. The list container is capped
    (`max-height: min(40vh, 300px); overflow-y: auto` — new CSS) so 20
    sessions can't blow the sidebar (§5.1 space math).
  - **New-chat control:** `.histbtn`-styled "＋ New chat" under the
    `CHAT HISTORY` label (`aria-label="New chat"`) — clears CenterChat's
    messages, starts a fresh unsaved session.
  - **Mid-stream guard (round 3):** while a stream is in flight, `.histrow`
    buttons and `＋ New chat` are `aria-disabled` with visible reason
    *"Stop the reply first"* (same rule as the picker, row 32) — otherwise
    tokens would land in the swapped-in session. Row 38.
- **Search (specified, round 3):** the search input filters the **`.histrow`
  list** (case-insensitive, via pure `filterSessions(sessions, query)` in
  `lib/history.ts`); the raw `<pre>` is **not** search-scoped — it always
  renders the selected session's JSON. Typing still **auto-opens** the
  collapsed history (preserves `Sidebar.tsx:47`). Meta line: normally
  *"N sessions — stored in this browser"*; while a query is active
  *"N of M sessions matching \"q\""*; zero results → the `<pre>` shows
  `// No sessions match "q".` (§8).
- **Model on restore (round 3):** if `session.model` is installed →
  `setSelected(session.model)` **silently** (programmatic; §5.2's confirm is
  for user picks only); if not installed → keep current selection, load
  messages **read-only** with row 18's notice, input disabled until a model
  is chosen (row 36). **Every send stamps `session.model = selected`** — the
  JSON never claims a model that didn't answer.
- **Write points (round 3 — never write only on `done`):**
  (a) first send → create session (title from first user message,
  `created_at`/`title` frozen, `model = selected`);
  (b) every appended message → stamp `at: new Date().toISOString()`, bump
  `updated_at`;
  (c) stream end of **any** kind — `done`, Stop, or error → write the
  session. A Stop or crashed stream survives reload (row 35).
- **Lifecycle:** first send after restore **appends** to the open session
  (row 34); restoring **drops any draft** without prompting.
- **Hydration:** until the mount read completes (`hydrated === false`) both
  the `<pre>` **and the meta line** render a neutral skeleton (`…`) — never a
  "No chats yet" / "0 sessions" flash (row 37).
- **Multi-tab:** `storage` event → union by session `id`, newer `updated_at`
  wins (tie-break: greater `messages.length`, then lexicographic id); merges
  only update local state (**never write back** → no loops). **Caps are
  re-applied on every local save** (evict oldest >20) so an eviction done in
  another tab doesn't resurrect; removals are not back-propagated — a
  documented limitation of the no-write-back rule.
- **Guards:** corrupt JSON → reset to `[]` + welcome state;
  `QuotaExceededError` → evict oldest sessions (floor 5) → else honest
  *"Couldn't save this chat (browser storage is full)."* notice.
- **Caps:** 20 sessions; per session 100 messages (**oldest dropped** beyond
  100).
- **Empty state:** `// No chats yet — messages you send are saved in this
  browser only.` above `[]`.
- **Selection persistence:** `localStorage["las.selected.v1"]`, restored on
  mount, shared across tabs via the `storage` event (row 19).
- **Delete** `data/chat-sessions.ts` **at M4**; until then the seed stays and
  is explicitly a placeholder (§9 M1 note) — `Sidebar.tsx` (its only
  importer) switches to the store at M4. `filterSessions` moves wholesale —
  no dead copies.

#### 5.5.1 M7 rework — the store moves server-side (normative)

M7 replaces the localStorage blob as the *source of truth* with a
`node:sqlite` file behind `/api/history`; everything above still governs
what the user sees, with these deltas:

- **Storage:** `crates/web/.data/history.db` (gitignored), WAL +
  `busy_timeout`, opened by `lib/history-db.ts`. QA fleet servers each get
  `HISTORY_DB_PATH=~/.cache/las-qa/db/history-<port>.db` so ports never
  share history. The server owns `updated_at`; `title`/`created_at` are
  frozen at first save and can never be renamed/backdated by a re-post.
- **`localStorage["las.sessions.v1"]` is demoted to a read cache** (first
  paint stays synchronous, no hydration flicker). On quota it deletes
  *itself* — sessions live on disk now, so row 21's eviction ladder is
  retired: the cache drops, the next load refetches.
- **Cross-tab:** `BroadcastChannel("las.history")` → other tabs refetch;
  the server row is the union, so row 19's merge/no-write-back dance is
  replaced by refetch. Mutations serialize through one FIFO queue with a
  `version` guard that discards a GET overtaken by a local write.
- **Migration:** a profile still holding pre-server rows POSTs them once
  as `{"import":[…]}` (its own timestamps preserved — the only path
  allowed to set them), then records `las.migrated.v1` and always defers
  to server truth. Import is an idempotent upsert by id, so a lost flag
  can't duplicate rows.
- **UI:** the raw-JSON `<pre>` and its `.jsonmeta` are **deleted** (§9 M7).
  Search still filters rows and auto-opens the panel; each row gains an
  inline `✕ → Delete/Keep` confirm, and under the list sit `Export JSON`
  (Blob download of the visible history) and `Delete all` (modal requiring
  the literal word `DELETE` before the button enables). Deleting the
  *open* session calls `startNewChat()` — a stale conversation must not
  re-save itself.
- **Failure honesty:** a failed save flips the `saveError` notice (messages
  stay on screen, retried at the next write point); a failed *read* keeps
  the cache on screen — offline tolerance, not an error.
- **Guards:** `/api/history` runs the full §3.3 order in every handler —
  Host → Origin (plus JSON content type on POST; DELETE needs `?id=` or
  `?all=1`) → body (32 MiB cap, migration-sized) → validation → disk.

---

## 6. Data model changes + tag mapping

`data/models/types.ts`:

```ts
export interface ModelGuide {
  // …existing fields…
  /** Exact `ollama pull` tag when this guide maps to a registry model. */
  ollamaTag?: string;   // e.g. llama-3-1-8b → "llama3.1:8b"
  /** Pull-size hint for the confirm step ("~4.9 GB"). Required when
      ollamaTag is set — asserted by the §10.3 value table. */
  pullSize?: string;
  /** Nominal parameter counts (billions) this guide covers — §6's matching
      rule compares installed parameter_size against these (±25%, per
      catalog_entry_for). Required when ollamaTag is set. */
  paramsBillions?: number[];
}
```

Mapping for the 19 guides — tags confirmed in the registry (round 2); sizes
are Σ registry manifest layers; **parse rule** for installed
`parameter_size` strings: take the leading `[0-9.]` run, `parseFloat`
(`"8.0B"` → 8.0, `"109B"` → 109 — port of `catalog.rs:186-195`; live-verified
on this machine). Capture: Oct 2026 (asserted, §10.3):

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

Notes: **vision tags are `llama3.2-vision:<size>`** (`llama3.2:11b-vision`
doesn't exist). `paramsBillions` for the 5 tags overlapping `catalog.rs`
(1B/3B/7B/8B/11B/13B) come from the CLI catalog; the other 10 from published
model specs (registry manifests carry no `parameter_size` — provenance
recorded in §10.3's assertion table). `ollama.com/library/llama4` now
*displays* `llama4:16x17b`/`llama4:128x17b` while `llama4:scout|maverick`
still resolve — existence checks use the API, not display names.

**Installed-matching rule — an *adaptation* of `catalog_entry_for`
(`catalog.rs:206-229`), family constraint included:**

1. **Exact tag:** `/api/tags[].name === ollamaTag` → installed.
2. **Same base name + params:** `base(name)` = text before `:`. A guide
   matches iff `base(installed) === base(ollamaTag)` **and**
   `parameter_size` (parsed as above) is within **±25 %** of **any** value
   in the guide's `paramsBillions`. Multiple matches → badge all; none → no
   badge.
3. Guides without `ollamaTag` never badge.

Expected results (§10.3's asserted table, independently re-derived in round
3): `llama3.2:latest` (3.2B) → 1B–3B guide only; `llama3.1:8b` → 8B guide
(exact); `llama3.1:405b` → 405B guide; `llama3.1:70b` → 70B guide and
**must not** badge the 8B guide (family ✓, ±25 % ✗) — note the plan does
*not* enforce the CLI's ≤30B catalog policy: installed >30B guides badge
their own guide, and the §10.3 case asserts only the negative;
`mistral:7b`/`qwen2.5:7b` → **no badge** (base-name mismatch — the CLI's
own test uses `qwen2.5:7b`, `catalog.rs:417-430`); `llama3.2-vision:latest`
→ vision guide only; `llama2:13b` → 7b-13b guide; `codellama:70b` →
34b-70b guide; `llama4:scout` → scout guide.

**Starter default:** no-models CTA offers `DEFAULT_TAG = "llama3.1:8b"`
("the default pick — about 4.9 GB"); secondary link copy is the §8 row
("Prefer smaller? llama3.2:3b (about 2 GB).") — one wording, §8 wins.

**Persistence:** `localStorage` only — versioned keys (`las.sessions.v1`,
`las.selected.v1`), no server DB.

---

## 7. Error / state matrix (must all render honestly)

| # | Condition | Detect | UI | Milestone |
|---|---|---|---|---|
| 1 | Ollama not installed | `execFile` + fallbacks fail (`OLLAMA_BIN_PATHS=` for QA) | Install guide + Re-check | M1 |
| 2 | Installed, can't reach (not running **or** wrong `OLLAMA_HOST` — indistinguishable) | `installed && ping failed` | §8 "Can't-reach body" (OS-specific command; **host always visible** — this row's cell defers to §8, which is normative) | M1 |
| 2b | Installed but not on PATH | `onPath: false` | "Ollama is installed but not on your PATH — the status check used its default location." | M1 |
| 3 | Running, 0 models | tags `[]` | Picker empty state (M1); Pull-starter CTA (M3) | M1/M3 |
| 4 | Running, models | tags list | Pre-select first; tree badges (M3) | M1 |
| 5 | Status down mid-session | 5 s poll / focus | Pill → "Not running" (`--y`; `--bad` only if the binary disappears too); input disables with the row-1 notice | M1 |
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
| 19 | Two tabs | `BroadcastChannel("las.history")` | Other tabs refetch; server row is the union (M7 retires the storage-event merge); selection sharing unchanged until M8 | M4 → M7 |
| 20 | History cache corrupt (localStorage) | JSON.parse throws | Cache resets to `[]`, server truth refetches → welcome state | M4 → M7 |
| 21 | localStorage full (cache write) | QuotaExceededError | Cache deletes **itself**; sessions live in the DB, next load refetches (no eviction) | M4 → M7 |
| 22 | Wrong OLLAMA_HOST | — | Folded into row 2 | — |
| 23 | Very long response | — | Internal scroll + auto-scroll (existing) | M2 |
| 24 | Non-ASCII/emoji streaming | TextDecoder stream mode | Renders correctly | M2 |
| 25 | Empty/whitespace draft | client guard | Send does nothing | M2 |
| 26 | First-ever visit (no Ollama, no history) | both empty | Install section + welcome + CTA, no overlap | M1 (welcome leg: M4) |
| 27 | Guide with no tag clicked | no `ollamaTag` | Guide link only — no chip, no Pull | M3 |
| 28 | Stop pressed | AbortController | Keep partial text, mark "stopped" — no error line, no Retry; session still written (row 35) | M2 |
| 29 | Malformed NDJSON line | JSON.parse throws in try/catch | Skip line, log once; if it kills the stream → row 10 | M2 |
| 30 | Chat payload > 1 MiB | 413 from handler | "This chat is too long to send — start a new chat." | M2 |
| 31 | Pull stream transport drop | reader error | "Connection lost mid-download — Ollama will finish it next time you pull." | M3 |
| 32 | Model-switch confirm while streaming | stream active | Picker disabled until Stop/finish | M2 |
| 33 | Status still `checking` on first paint | `status === "checking"` | Send disabled, placeholder "Checking Ollama…" | M1 |
| 34 | First send after restore | restored session open | Appends to it; `created_at`/`title` frozen; `model` stamped | M4 |
| 35 | Stop/error reply must survive reload | write points §5.5(c) | Session written on any stream end | M4 |
| 36 | Restore with uninstalled model | `session.model ∉ models` | Read-only messages + row-18 notice, input disabled until a model is picked | M4 |
| 37 | Hydration | `hydrated === false` | Skeleton in the meta line — no "No chats yet"/"0 sessions" flash (first client snapshot reads the cache synchronously, so the window is one frame) | M4 → M7 |
| 38 | Stream active + session row / `＋ New chat` clicked | stream state | `aria-disabled` + "Stop the reply first" | M2 |
| 39 | System info unreadable | `/api/system` 5xx/network | "Couldn't read this machine's details — try again." + Refresh (dialog stays open) | M5 |
| 40 | Update check can't reach GitHub | fetch fails / 403 / 429 | Honest reason in the dialog; a version is only ever shown when one was actually read | M5 |
| 41 | `ollama rm` while `OLLAMA_HOST` is not the stock local server | server-side `isStockLocalHost(base())` gate | 409 + inline error; the Delete button isn't rendered either (it would delete on the *wrong* server) | M5 |
| 42 | `ollama rm` with a malformed tag | tag regex | 400 before any binary lookup; the UI only ever sends a tag it is displaying | M5 |
| 43 | Start fails to spawn, or 10 × 700 ms poll never sees `running` | spawn error / status never flips | Inline "Ollama didn't come up — run `ollama serve` in a terminal to see why." | M5 |
| 44 | Start would be pointless (non-stock `OLLAMA_HOST`) | `isStockLocalHost(status.host)` false | No Start button — spawning a stock server could never flip this status | M5 |
| 45 | Show models while Ollama is down | `status.running === false` | "Ollama isn't running at {host}…" — no fabricated list | M5 |
| 46 | Clipboard write refused | permission / insecure context | Button says "Couldn't copy" and the command stays selectable — never a false "Copied ✓" | M5 |
| 47 | Non-Llama model is the persisted/open selection | `isLlamaModel(name, families)` false | Selection cleared (key removed), blocked from auto-pick, "{model} isn't used by this app — pick a Llama model to chat." until the user picks | M6 |
| 48 | History save POST fails (server down mid-chat) | fetch rejects / 5xx | Optimistic row kept on screen + saveError notice; next write point retries; a later success clears the notice | M7 |
| 49 | History GET fails (server unreachable) | fetch rejects / 5xx | Cache stays on screen, no error notice — a failed *read* is offline tolerance, not data loss | M7 |
| 50 | Delete-all attempted without the typed word | button `disabled` until value === "DELETE"; server requires `?all=1` | No wipe (client-side gate + server-side contract); lowercase word rejected | M7 |
| 51 | History API called cross-origin or from a foreign Host | §3.3 guards, every handler | 403 before any body read or disk touch (same order as the Ollama routes) | M7 |

---

## 8. Copy contract (normative — §8 wins wherever §5.1's sketch or §7's
paraphrase differ; strings quoted in §5.x but absent here are normative as
quoted)

| Where (exact) | ❌ Current | ✅ Shipped |
|---|---|---|
| `.desc` (tree) | "Every model below runs on this machine through ollama." | "Browse the Llama family below. Models you've installed show ✓ and can be selected; the rest can be pulled in one click." (**M1 ships an interim sentence** — "Open a folder to browse the family, then click any model for a plain-English guide. Models installed on this machine are in the picker above." — because the ✓/Pull claims only become true with M3's chips; canonical copy lands at M3.) |
| `layout.tsx:18` metadata | "Chat with local models via ollama — …" | Same sentence with **Ollama** capitalized (full metadata line updated at M4) |
| `CenterChat.tsx:39` header | "Chat with local models via ollama" | "Chat with local models" |
| `CenterChat.tsx:55-57` `.empty` paragraph | "…this reply would stream…" (canned) + "the dropdown on the right" | M1: "Chat lands next — pick a model to get ready." M2: "Pick a model and say hi — replies stream live from your machine." |
| `CenterChat.tsx:53` `.empty` heading | "No messages yet" | **Kept** (true at both milestones) |
| `CenterChat.tsx:88` input hint | "…installed yourself with ollama." (line 89 after edits — verify at build) | "…installed yourself with Ollama." |
| `CenterChat.tsx:56`/down state | "no model is running" | "Ollama isn't running — start it from the Ollama section in the sidebar." (click → expands + scrolls; position-neutral: sidebar is *below* chat ≤620 px) |
| Picker button + options (`AiModule.tsx:55-69`) | hardcoded `⚡ llama` / `llama` / `local` | button = selected tag; fallback "No model selected"; options = real tags |
| Assistant bubble name (`CenterChat.tsx:66`) | `llama` | the selected tag |
| Status header | — | 4 words for 4 pill states: "Checking…" / "Not installed" / "Not running" / "Connected" (dot + word always) |
| Not-installed body | "Install Ollama, then reload this page." | "Install Ollama to chat with local models — it's free and runs on your machine. Install it, then press Re-check." |
| Can't-reach body | "Start it: ollama serve" | "Can't reach Ollama at `127.0.0.1:11434`. Start it: `open -a Ollama` (macOS) / `ollama serve` (Linux & Windows) — or set OLLAMA_HOST if it lives elsewhere." (Linux systemd alternative: `sudo systemctl start ollama`, **not** `--user`) |
| Pull confirm | "≈4.9 GB download" | "llama3.1:8b · about 4.9 GB — downloaded once, then it's yours offline." |
| Pull confirm (>30B) | hardcoded `≈245 GB` | "This one is huge (≈{pullSize}) — bigger than anything the llama CLI recommends. Pull anyway / Cancel." (size interpolated; trigger `max(paramsBillions) > 30`) |
| Pull cancel | "partial download resumes later" | "Download stopped. Ollama may pick it back up next time." |
| Warm-up | "Warming up <model>…" | "Warming up llama3.1:8b — the first reply takes a few seconds." |
| History meta (normal) | "N of M sessions" | "**N sessions** — saved on this machine" (M7; was "stored in this browser") |
| History meta (query active) | "N of M … matching" + "— raw JSON" | "**N of M** sessions matching \"q\"" |
| History empty | bare `[]` / raw JSON | "No chats yet — messages you send are saved on this machine." (no JSON rendered at all since M7); "No sessions match \"q\"." on zero results; skeleton until hydrated |
| History delete (per row) | none | `✕` with `aria-label="Delete chat "{title}""` → inline "**Delete** / **Keep**" confirm |
| History delete all | none | Modal `Delete all history`: "Every saved chat on this machine will be deleted — this can't be undone. Export JSON first if you want a copy." + "Type **DELETE** to confirm." → buttons "Delete everything" / "Cancel" (disabled until the input is exactly `DELETE`) |
| History export | none | Button "**Export JSON**" → downloads `chat-history-YYYY-MM-DD.json` |
| History save failure | "Couldn't save this chat (browser storage is full)." | "Couldn't save that change to chat history — your messages stay on screen; it will be retried on the next save." (M7 — the DB, not a quota, is now the failure mode) |
| Context overflow | "Retry" | "This chat is too long for the model's memory. Start a new chat." + button |
| Payload >1 MiB | (none) | "This chat is too long to send — start a new chat." |
| No-models CTA | "Pull a starter model (llama3.2:3b)" | "No models yet — get the default pick: llama3.1:8b (about 4.9 GB). Prefer smaller? llama3.2:3b (about 2 GB)." |

Also normative as quoted elsewhere in this plan: `Switch / Cancel` (§5.2),
"Pulling…" (§5.4), "jump to picker" (§5.1), "Stop the reply first" (§5.5),
"Couldn't save this chat (browser storage is full)." (§5.5), the read-only
restore notice (§5.5 + row 36), "A model is downloading in the background."
(§5.4), "Delete all history" + the typed-`DELETE` confirmation and
"Export JSON" (§5.5.1 + §8 M7 row), "AI History" (the panel toggle label).

**Milestone copy notes (recorded as each milestone ships):**
- **M1:** the `.empty` row's M1 sentence shipped as the *disabled input's*
  placeholder (§9's explicit instruction); the paragraph carried interim
  copy so the two didn't repeat. The canonical `.empty` paragraph copy
  lands at M2 — when the input becomes live and the placeholder reverts to
  "Message the local model…" (a §8 row was never defined for it).
- **M1:** `.desc` interim sentence — see the row above.
- **M2:** the switch confirm ships "Switch to {model}? This starts a new
  chat — the current one won't be saved." instead of §5.2's sentence: at M2
  there is no session store yet, so promising "stays as its own session"
  would be a persistence lie. §5.2's exact sentence lands at M4 with
  `lib/history.ts`.
- **M3:** the canonical `.desc` sentence ships (the M1 interim sentence is
  gone with it).
- **M3:** `pullSize` stores the bare §6 value ("4.9 GB", "2.0 GB"), so
  §5.4's `about {pullSize}` / `≈{pullSize}` interpolate it verbatim; a
  trailing `.0` is dropped *at render*, which is what lets §8's starter
  sentence read "about 2 GB" from that same stored value. One source for
  the number, both quoted strings exact.
- **M3:** rows 15/17's disabled reasons ship as the control's own visible
  label ("Start Ollama first", "Pulling…") rather than a tooltip, so
  §10.5's "visible reason" rule holds for the tree too.
- **M3:** the starter CTA replaces two interim empties — the chat's
  "…the picker has nothing to offer until one is installed." paragraph and
  the picker's "No models on this machine yet." line (the CTA opens with
  the same words and adds the action).

Voice check at M4: the section must read like `llama`'s guided recommender
(same defaults — `DEFAULT_TAG`, same plain-English register).

- **M4:** the switch confirm lands §5.2's sentence verbatim — "Switch to
  {model}? Your current chat stays as its own session." — which is only now
  true: every message on screen has already been through §5.5's save points
  by the time the confirm can appear (a stream blocks it, row 32).
- **M4:** sessions reach the UI through `lib/history.ts`'s external store
  (`useSyncExternalStore`), not §5.2's `setSessions` enumeration —
  `react-hooks/set-state-in-effect` forbids the effect-based read §5.5
  sketched, and the store is what makes row 37's `null`-until-hydrated
  snapshot, row 19's merge-without-write-back, the quota guard and the
  shared caps fall out of one module. The context carries `sessions`,
  `sessionChoice`, `activeSessionId`, `openSession`, `startNewChat`,
  `query` and `saveError`.
- **M4:** `＋ New chat` and a user model switch **mint a fresh session id**
  instead of clearing state — the keyed remount *is* the reset, so a blank
  conversation can never be written back into the session it was opened
  from, and no effect has to clear anything.

- **M5:** every dialog reports only what it actually did or read. Install,
  Update and Re-install print **copyable** commands with the standing line
  "this app never runs installers for you"; the update dialog shows the
  installed version from `ollama --version` and, only after an explicit
  check, whatever GitHub answered — including "Couldn't reach github.com"
  instead of a guessed version. Delete's confirm names the exact tag and
  says the files leave the disk ("Your chats stay; the model has to be
  downloaded again"). Start says "Ollama is running" only after the status
  poll sees it, else it hands the user the terminal command.
- **M5:** the system dialog prints measured values ("11.3 GB (34%)",
  "143.4 GB free of 247.7 GB", "3m 17s") and renders `—` for anything it
  couldn't read — no rounded-up comfort numbers, no invented Next/Node
  versions.

- **M6:** the picker's empty/refusal line is "gemma4:12b isn't used by
  this app — pick a Llama model to chat." — named, not euphemized. The
  OLLAMA list keeps every installed model (it is the machine's inventory)
  but non-Llama chips render dashed/dim with a "Not used by this app"
  tooltip and the models dialog appends "· not used by this app" to the
  row: visible, deletable, never chat-selectable.
- **M7:** the history panel never renders JSON again. The meta line says
  "**N sessions** — saved on this machine" (the machine, not "this
  browser" — the DB is shared by every profile); the empty state is the
  plain sentence "No chats yet — messages you send are saved on this
  machine."; the save-failure notice names the retry ("…your messages
  stay on screen; it will be retried on the next save."); the wipe modal
  is the §8 "History delete all" row verbatim, and its button only
  enables on an exact `DELETE`. Deleting a row shows an inline
  **Delete / Keep** pair — no dialog for one chat, a typed confirm for
  all of them.

---

## 9. Milestones (each ends with the applicable §10 subset)

- **M1 — Status + local models + honest chat placeholder.** `lib/ollama.ts`
  (guards included), all three route handlers, `OllamaStatus` sidebar
  section (collapsed, live, detected-OS install guide), `ModelProvider`
  (status ownership + selection + hydrated flag), real dropdown (installed
  only). **`CANNED_REPLY` deleted here**; CenterChat shows the M1
  placeholder with the **input disabled** (placeholder = the §8 M1 sentence)
  — a green pill never coexists with "no model is running". The seed history
  remains in the sidebar until M4 — an explicit placeholder, **not** a
  persistence claim (row 26's "no history" leg is M4-only).
  *Done when:* pill flips with `ollama serve` killed/restarted without a
  rebuild; dropdown shows `llama3.1:8b` + `llama3.2:latest` with sizes;
  install guide visible when down; input disabled with the M1 placeholder;
  abort wiring verified via §10.2.5 curl abort (no runaway generation — the
  Stop **button** is M2).
- **M2 — Real chat.** Streaming pipeline (`response.ok` branch, split-safe
  line buffer, parse try/catch), state matrix rows 5–12, 23–25, 28–30, 32,
  33, 38, Stop, warm-up, double-submit guard, model-switch confirm,
  mid-stream guards on history controls. Sessions remain **in-memory** (no
  persistence claim in M2 copy). *Done when:* tokens stream, Stop leaves a
  "stopped" reply with no error line, killing Ollama mid-conversation shows
  the honest notice, §10.4 List B is green in source.
- **M3 — Pull.** `ollamaTag` + `pullSize` + `paramsBillions` on all 15
  tagged guides, installed matching (§6 rules 1–3), tree chips (`(text
  chat)` variants), provider-owned one-at-a-time pull with aggregated
  progress, auto-select-if-empty, starter CTA, `.desc` rewrite, picker/bubble
  copy rows. *Done when:* pulling `llama3.2:1b` end-to-end shows progress →
  appears installed → chat answers; a validly-shaped nonexistent tag
  (`no-such-model:1b`) errors inline; `llama3.2:latest` badges the 1B–3B
  guide; `mistral:7b` badges nothing (§10.3 table).
- **M4 — Real history + polish + docs + CI + full QA.**
  `lib/history.ts` (mount-only reads, session rows + raw JSON of current
  session, `＋ New chat`, restore-latest, search spec, model-on-restore rule,
  write points, hydration skeleton, multi-tab merge, quota guards, caps,
  `las.selected.v1`), seed deleted, full copy table (§8), vitest suite
  green, and the doc/CI drift list — **exactly these six:**
  1. `crates/web/README.md`: remove "fully static / canned" claims; add
     `/api/ollama/*` routes to the route table (post-M1 count: **25 route
     entries + 3 API = 28** in the printed table, manifests per §10.1);
     `pnpm dev # http://localhost:3000` → `http://127.0.0.1:3000`; layout
     tree gains `lib/`, drops `data/chat-sessions.ts`; CI line becomes
     lint + test + build;
  2. `package.json`: `"start": "next start -H 127.0.0.1"`;
  3. `.github/workflows/ci.yml`: web job gains `pnpm test` between Lint and
     Build (job name may become `web (lint + test + build)`);
  4. root `README.md`: only if the web commands changed;
  5. `.gitignore`: nothing (verify `qa/baselines/` is **not** ignored);
  6. `qa/baselines/` + `qa/README.md` captured (§10.6).
  *Done when:* every §8 row is the shipped copy; §10 checklist signed off.

- **M0 — Runtime floor + loopback everywhere (security).** `engines.node`
  `>=22.23.4` + `engineStrict: true` (pnpm 12 reads settings from
  `pnpm-workspace.yaml`, not `.npmrc`), README prerequisites updated in both
  READMEs, `"dev": "next dev -H 127.0.0.1"`, and the proxy-level
  `Content-Encoding` refusal from §3.3. *Done when:* `pnpm install` on an
  older Node fails loudly with `ERR_PNPM_UNSUPPORTED_ENGINE`, `br`-encoded
  API bodies get 415, guards still 403 foreign Host/Origin, and the whole
  §10 subset is green on Node 22.23.4.
- **M5 — Contextual Ollama actions + system info.** State-driven buttons
  (Install / Start / Re-check / Show models / Update / Re-install), a shared
  focus-trapped modal, the all-models dialog with copy + confirmed delete
  (allowlisted `ollama rm <tag>` only — never free-form shell, never an
  executed installer), and `GET /api/system` behind the same guards feeding a
  System-info row above OLLAMA. *Done when:* each of the three probe states
  (not installed / not running / running) shows exactly its own buttons, and
  the system dialog reports OS, CPU, RAM, disk, Ollama version, model count
  and sizes correctly.
- **M6 — Llama-only picker.** Status payload gains `families`; a pure
  `isLlamaModel()` gates the dropdown; a persisted non-Llama selection is
  cleared with an honest line. Non-Llama models stay visible **and
  deletable** under OLLAMA (system truth) but can never be selected for
  chat. *Done when:* `gemma4:12b` is absent from `#model-picker`, present in
  the OLLAMA model list, and `matchInstalled`/guides are unchanged.
- **M7 — Server-side history + human history UI.** `node:sqlite` store
  (`crates/web/.data/history.db`, WAL; `HISTORY_DB_PATH` overrides it —
  the QA fleet points each port at its own file), `GET/POST/DELETE
  /api/history`, one-time migration of `las.sessions.v1`, localStorage
  demoted to a read
  cache, cross-tab via `BroadcastChannel`, and the raw-JSON `<pre>` **and
  its copy rows deleted** — replaced by searchable session cards with
  per-row delete, delete-all (typed confirm) and export. *Done when:* two
  different Chrome profiles against the same server show the same sessions,
  deletion is honoured server-side, and no `JSON.stringify` of history is
  ever rendered.
- **M8 — Per-tab selection + parallel chats.** Selection moves to
  `sessionStorage` (the cross-tab `SELECTED_KEY` listener is removed), so
  two tabs can hold different models — measured parallel on this hardware —
  plus an honest "Waiting for the model — another chat may be using it"
  state when the first token is slow (same-model requests queue at
  `OLLAMA_NUM_PARALLEL=1`; noted in System info). *Done when:* two tabs
  select independently and both streams produce first tokens while the other
  is still running.
- **M9 — Desktop-responsive pass + baselines.** Fluid shell
  (`min(1680px, 100%)` replacing the 1000 px cap), `clamp()` column tracks,
  independently scrolling panels, modal sizing, ladder ≥1600 / 1280–1599 /
  1024–1279 / 768–1023 / <768, then `qa/baselines/` recaptured. *Done when:*
  no horizontal overflow or clipped control at 2560/1920/1600/1440/1366/
  1280/1024/768 × 720/800/1080.

Deferred (explicitly out of scope): `llama catalog --json` alignment,
autostart, multi-remote servers, parameter tuning, image input in chat
(vision guides get `(text chat)` chips; vision *input* is a separate
product decision).

---

## 10. QA gate — full set at M4, applicable subset at each milestone

### 10.1 Build & lint
1. `pnpm lint` clean; `pnpm build` exits 0 with **no** `Error occurred
   prerendering` / `dynamic-server-error` lines. `next build
   --debug-prerender` is a **diagnostic** build (disables minification,
   enables server source maps, `prerenderEarlyExit=false` for *any* prerender
   error — including a throwing GET route handler; never deploy its output):
   use it when §3.3-type build failures are investigated, then rebuild clean.
   (`instant` validation covers layout/page segments only — route handlers
   are unaffected by it either way.)
2. **Route accounting (named artifacts + commands):**
   - `node -e 'console.log(Object.keys(require("./.next/prerender-manifest.json").routes).length)'`
     → **24** today, **must stay 24** after M1 (API routes must never
     prerender — the executable form of §3.3);
   - `node -e 'console.log(Object.keys(require("./.next/app-path-routes-manifest.json")).length)'`
     → **6** today → **9** after M1 (3 API routes);
   - `.next/server/functions-config-manifest.json` (note: under `server/`)
     → stays exactly **1** entry, `/_middleware` (the proxy).

### 10.2 Backend smoke (curl, against `http://127.0.0.1:<port>`)
1. Status: live flips with `ollama serve` killed/restarted (no rebuild);
   `OLLAMA_HOST=http://127.0.0.1:1` → row 2's honest "can't reach";
   `OLLAMA_BIN_PATHS=` → row 1. Prerender manifest still has no `/api/*`.
2. Chat (note the mandatory header — without it the guard correctly 400s):
   `curl -N -i -X POST -H 'Content-Type: application/json' \
    -d '{"model":"llama3.1:8b","messages":[{"role":"user","content":"hi"}]}' \
    http://127.0.0.1:<port>/api/ollama/chat` streams NDJSON; measure
   time-to-first-byte (`no-transform` already excludes gzip — if > ~200 ms,
   suspect Ollama TTFB, then consider server-wide `compress: false`).
3. Pull: `llama3.2:1b` end-to-end; **validly-shaped nonexistent tag**
   `no-such-model:1b` → `{"error"}` line (regex-level rejections —
   `../../etc`, uppercase — are already covered by the 400 in step 4).
4. Guards: foreign `Origin` → 403; `Origin: null` → 403; foreign `Host`
   (rebinding-style, e.g. `-H 'Host: evil.test'`) → 403 **on GET and POST**;
   non-JSON content-type → 400; 2 MiB body → 413 (curl may exit 18
   `transfer closed with outstanding read data` — judge by the status line,
   not the exit code); Origin-absent curl → accepted.
5. Abort: `curl -N … &` then kill it mid-stream → generation stops
   (`ollama ps` idles within the unload window), server log has no
   unhandled rejection.

### 10.3 Unit tests (vitest)
`vitest` devDependency + `"test": "vitest run"`; `vitest.config.ts` must map
the `@/` alias (same as `tsconfig.json`); CI gains a **Test** step between
Lint and Build. Pure functions only — no e2e runner (§10.5's manual matrix
covers integration; proportionate for a never-in-production tool). **Per
milestone:** M1 → `isValidTag`; M2 → NDJSON line buffer; M3 →
`matchInstalled` + data integrity; M4 → `filterSessions` + history prune.

- `isValidTag`: accept/reject table — `../../etc` ✗, `llama3:8B` ✗
  (lowercase rule), empty ✗, overlong ✗, `no-such-model:1b` ✓ (shape-valid;
  existence is Ollama's job).
- NDJSON line buffer: chunk splits mid-line, mid-multibyte char, CRLF, blank
  lines, `{error}` line, `done` line, malformed line (row 29).
- `filterSessions(sessions, query)` — pure search behavior.
- `matchInstalled(tags, guides)` — **fixture inputs given** (round 3):
  `llama3.2:latest`→`"3.2B"` ⇒ 1B–3B guide only; `llama3.1:8b`→`"8.0B"` ⇒
  8B guide (exact); `llama3.1:70b`→`"70B"` ⇒ 70B guide, **not** the 8B
  guide; `llama3.1:405b`→`"405B"` ⇒ 405B guide; `mistral:7b`→`"7.6B"` ⇒
  none; `qwen2.5:7b`→`"7.6B"` ⇒ none; `llama3.2-vision:latest`→`"10.7B"` ⇒
  vision guide only (rule 2 — a 3.2B fixture would wrongly fail);
  `llama2:13b`→`"13B"` ⇒ 7b-13b guide; `codellama:70b`→`"70B"` ⇒ 34b-70b
  guide; `llama4:scout`→`"109B"` ⇒ scout guide.
- Data integrity: every `ollamaTag` guide has `pullSize` **and**
  `paramsBillions`; no duplicate tags; **pullSize value table asserted**
  (§6's sizes + Oct-2026 capture note; provenance: registry manifests for
  sizes, `catalog.rs` + published model specs for `paramsBillions` — this is
  the locking mechanism round 2 demanded).
- History prune: 21 sessions → 20 (oldest evicted); 101 messages → 100
  (oldest dropped).

### 10.4 Forbidden-string sweep (scoped so it can pass)
- **List B — source:** scope `app/ components/ data/ lib/ README.md` plus
  root `*.json`/`*.yaml` (**excluding `node_modules/` and `.next/`**, this
  plan excluded): `CANNED_REPLY|canned|UI-only demo|demo nonsense|no
  backend|TODO|FIXME` — zero matches (source gate at **M2**; README at
  **M4** — its `:41-42` "no backend/canned" die then). Also a **positive
  check:** `grep -rni ollama app components data lib` — every hit must be a
  code identifier, URL, command, or this plan (catches `layout.tsx:18`'s
  metadata and any `.ts` string, not just JSX text).
- **List A — built HTML + RSC payloads of `/` `/llama` `/llama/<slug>`:**
  `guy hawkins|invite|command d+|slack|zoom|upwork|centra` — zero matches.
  The bare token `query` is **dropped** (it's the plan's own parameter name;
  legitimate model copy contains it).

### 10.5 Manual matrix + accessibility
- Every §7 row rendered at **1920×1080, 1440×768, 768×1024, 375×812** —
  per-milestone subsets (aligned with §7's Milestone column):
  - **M1** → 1, 2, 2b, 3, 4, 5, 6, 18, 26, 33
  - **M2** → 5–12, 23–25, 28–30, 32, 33, 38
  - **M3** → 13–17, 3 (Pull-starter leg), 18 (re-verify), 27, 31
  - **M4** → 19–21, 26 (full, incl. welcome), 34–37
- **QA recipes for otherwise-unrenderable rows** (round 3):
  - row 1 (not installed): `OLLAMA_BIN_PATHS= pnpm exec next dev -H 127.0.0.1`
  - row 2b (not on PATH): run with a stripped `PATH` (e.g.
    `PATH=/usr/bin:/bin`) so the fallback lookup is what finds it
  - row 2 (can't reach): `OLLAMA_HOST=http://127.0.0.1:1`
  - row 3 (0 models): serve with an empty models dir
    (`OLLAMA_MODELS=<empty dir> ollama serve`) or fixture-level unit check
- **Space pass criterion (1440×768):** with 20 sessions and AI History open,
  the OLLAMA header + pill and the `＋ New chat` control remain reachable
  without scrolling past the fold — or the row list scrolls internally
  (its `max-height` cap), in which case the section itself still fits.
- A11y rows: status pill = dot **+ text** with `aria-live="polite"`; pull bar
  = `role="progressbar"` + `aria-valuenow/min/max` + label; disabled inputs
  have `aria-disabled` + visible reason (rows 32/36/38); every icon button
  has an `aria-label` (incl. `＋ New chat`); focus ring visible on
  Pull/Send/Stop/Re-check/session rows; keyboard-only pass: expand-status →
  picker → chat → pull → history.

### 10.6 Regressions + visual references
1. 19 slugs 200, bogus slug 404, `/` + `/llama` 200, all internal links 200.
2. **Visual diff — manual, explicit:** committed reference screenshots under
   `crates/web/qa/baselines/` (home/guide/directory ×
   **1920×1080 / 768×1024 / 375×812** + **1440×768** sidebar-expanded),
   captured with `npx playwright screenshot` run locally by the implementer
   at M4 (not in CI — CI has no browser and §10.3 forbids an e2e runner).
   Diffing is a human side-by-side recorded in `crates/web/qa/README.md`
   (which screenshot, what changed, why intentional).
3. `bazel build //...` unaffected (`.bazelignore`); CI green (web job =
   lint + test + build).
4. `git status`: only intended files — allowed outside `crates/web/` at M4:
   `.github/workflows/ci.yml` (test step), root `README.md` (if commands
   changed); `docs/` + `models/` stay untracked.

---

## 11. Decisions (round-3 answers, folded in — no open questions remain)

1. **`paramsBillions` provenance + parse:** parse = leading `[0-9.]` run +
   `parseFloat` (port of `catalog.rs:186-195`, live-verified: `"8.0B"`,
   `"3.2B"`). Values: the 5 tags overlapping the CLI catalog come from
   `catalog.rs`; the other 10 from published model specs (registry manifests
   carry no `parameter_size` — round-3 correction). ±25 % absorbs reporting
   drift (`llama4:maverick` reports 402B vs nominal 400 — 0.5 %). Recorded
   in §10.3's assertion table. **Closed.**
2. **`.histrow` space:** capped at `min(40vh, 300px)` with internal scroll;
   §5.1's math restated; §10.5 gained an explicit pass criterion. **Closed.**
3. **Provider shape:** **one** provider (no up-front split), value built with
   `useMemo` + value-compare before committing `status` so a stable poll
   causes zero re-renders; split `StatusContext`/`ChatContext` only if M2
   profiling shows churn. Written into §5.2 so the implementer doesn't
   re-litigate it. (Round-3 technical auditor preferred a split up front;
   product auditor preferred one with memoization — resolution: memoized
   single provider with a measured contingency, which satisfies both
   concerns without speculative structure.) **Closed.**
