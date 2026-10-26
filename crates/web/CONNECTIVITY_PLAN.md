# Plan — Local AI Server: UI ↔ Ollama / `llama` CLI connectivity

Status: **draft for audit** (3 review rounds before any implementation).
Scope: turn the static web UI into a working local chat product: detect
Ollama, guide installation, show the models already on this machine, let the
user select and chat with them (real streaming), and pull new models from the
catalog — all local, nothing shipped to production.

---

## 1. Product thinking

**Who it's for.** Someone who installed this repo and wants a GUI over the
same local stack the `llama` CLI drives. The CLI already proves the product:
a thin client to a local Ollama server. The UI becomes the second client.

**Principles (carried over from v1):**
- Local-only: no cloud, no accounts, no telemetry; data stays in the browser.
- Honest states: never pretend a model answered when nothing ran.
- Plain language: install/status/pull copy for humans, not operators.
- No unnecessary code: every file earns its place (enforced in the audit of
  the static build; the same bar applies here).

**The user journey this plan delivers:**
1. Open the UI on a machine with **no Ollama** → a section under the sidebar's
   Features list (below *Plugins*) explains exactly how to install it, with a
   live status and a Retry button.
2. Ollama **installed but not running** → told to start it (`ollama serve`).
3. Ollama **running** → the models already on this machine appear in the AI
   Module dropdown (this machine first — before any catalog/pull UI).
4. User **selects a model and chats** → real token streaming, stop button,
   sessions saved locally.
5. User wants a model they **don't have** → Pull from the guide tree with
   live progress → auto-select → chat.

**What we deliberately do NOT build:** remote servers, auth/multi-user,
model deletion UI, parameter tuning, TLS, deployment. The `llama` CLI keeps
its role as the terminal client; no Rust changes are required for v1.

---

## 2. Ground truth (verified on this machine, Oct 2026)

- Ollama **0.40.8** installed (`/usr/local/bin/ollama`), `ollama serve`
  running, models present: **llama3.1:8b** (4.9 GB), **llama3.2:latest**
  (2.0 GB); nothing loaded (`/api/ps` → empty).
- The `llama` CLI is a thin HTTP client over `http://127.0.0.1:11434`
  (host via `--host` / `OLLAMA_HOST`) using exactly:
  `GET /api/tags` (ping + list), `POST /api/generate`, `POST /api/chat`
  (NDJSON streams: `{message:{content}, done, error}`).
- Its `catalog.rs` is the ≤30B recommender; every entry carries the exact
  Ollama tag to pull (`llama3.1:8b`, `codellama:7b`, …).
- Ollama pull API (docs.ollama.com, v0.40.8): `POST /api/pull`
  `{"model": "<tag>"}` streams NDJSON:
  `{"status":"pulling manifest"}` → `{"status":"downloading <digest>",
  "digest", "total", "completed"}` → `{"status":"success"}`; failures arrive
  as `{"error": "..."}` lines. Stream content type is `application/x-ndjson`.
- The web's 19-model guide registry (`data/models/`) has **no** Ollama tags
  today — the mapping must be added (§6).

---

## 3. Architecture

```
┌────────────────────────────── browser ──────────────────────────────┐
│ Sidebar (status + install)   AI Module (picker + tree)   Chat (SSE) │
└───────────────┬───────────────────────┬─────────────────────────────┘
                │ same-origin fetch()   │ (no CORS — server-side proxy)
┌───────────────▼───────────────────────▼─────────────────────────────┐
│ Next.js route handlers  app/api/ollama/*   (part of crates/web)     │
│  · base URL ONLY from OLLAMA_HOST env (same convention as the CLI)  │
│  · fixed paths — client can never choose the target (no SSRF)       │
│  · NDJSON from Ollama piped through byte-for-byte                   │
└───────────────┬─────────────────────────────────────────────────────┘
                │ plain HTTP 127.0.0.1:11434
        ┌───────▼────────┐          ┌──────────────────┐
        │  ollama serve   │ ◄─────── │  llama CLI        │ (sibling client,
        └────────────────┘          │  same API, same   │  unchanged)
                                    │  host convention  │
                                    └──────────────────┘
```

**Why proxy through route handlers instead of calling Ollama from the
browser:** (a) zero dependence on Ollama's `OLLAMA_ORIGINS` CORS defaults,
(b) the base URL is server-fixed via env — a malicious page can't aim our
handler at an arbitrary host, (c) one place maps Ollama errors to honest UI
states, (d) NDJSON piping is trivial server-side.

**CLI relationship:** both clients speak the identical API and share
conventions (`OLLAMA_HOST`, model tags from the same registry). The web
re-implements ~3 endpoints in TypeScript rather than shelling the binary —
`llama chat` is an interactive TTY unsuitable for a server process, and
`llama models` prints human text. v1 = zero Rust changes. Optional later
milestone: `llama catalog --json` so both clients read one catalog source.

**Runtime constraint (verify during build):** `cacheComponents` is enabled —
route handlers must be request-time. Use the documented mechanism for the
Next 16 version in tree (`connection()` / request APIs; `route.md` documents
`ReadableStream` responses). Acceptance: `GET /api/ollama/status` reflects
live Ollama state, never a build-time snapshot.

---

## 4. Backend surface (new: `app/api/ollama/*`)

Shared helper `lib/ollama.ts` (server-only):
- `base()` → `process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434"` (trimmed;
  identical fallback to the CLI).
- `ollamaFetch(path, init, { timeoutMs })` — AbortSignal timeouts (2 s for
  status, none for streams).
- `execOllamaVersion()` — `execFile("ollama", ["--version"], { timeout:
  2000 })`, catch → `unknown` (detects *installed vs not* for the guide).
- `ndjsonPipe(ollamaRes, res)` — copy NDJSON chunks through to the client.

| Route | In | Out | Behavior |
| --- | --- | --- | --- |
| `GET /api/ollama/status` | – | `{installed, running, host, models[], loaded[]}` | ping `GET /api/tags` (running?), `execFile ollama --version` (installed?), `GET /api/ps` (loaded models). Every field has `unknown`/`[]` fallbacks. |
| `POST /api/ollama/chat` | `{model, messages:[{role,content}]}` | NDJSON stream (passthrough) | Validates shape (max 100 messages, ≤ 32 000 chars each, role ∈ user/assistant/system), forwards `{model, messages, stream: true}`. Ollama not running → `503 {error}` before streaming starts. |
| `POST /api/ollama/pull` | `{model}` (tag charset-validated) | NDJSON progress (passthrough) | Forwards `{"model", "stream": true}`. Cancel = client aborts fetch (Ollama resumes later). |

Payload caps exist to bound memory in a tool that has no auth — they are
guard rails, not security theater (localhost only).

**Serving locally:** document `pnpm dev` (localhost:3000) and, for the
production build, `pnpm start -- -H 127.0.0.1` so the proxy is never exposed
off-machine.

---

## 5. UI changes, section by section

### 5.1 Sidebar — new "OLLAMA" section (directly below the Features list / *Plugins*)

Layout (mirrors the existing `.lbl` + block pattern, styles in globals.css):

```
OLLAMA                              ● Connected   ← pill, 3 states
┌──────────────────────────────────────────────┐
│ not installed:                               │
│   Install Ollama, then reload this page.     │
│   macOS    brew install ollama               │
│   Linux    curl -fsSL https://ollama.com/…   │
│   Windows  winget install Ollama.Ollama      │
│   (or download: ollama.com/download)         │
│   [Re-check]                                 │
│ installed-not-running:                       │
│   Ollama is installed but not running.       │
│   Start it:  ollama serve                    │
│   [Re-check]                                 │
│ running:                                     │
│   2 local models · llama3.1:8b, llama3.2…    │   ← links to picker
└──────────────────────────────────────────────┘
```

- New component `components/OllamaStatus.tsx` (client); fetch on mount +
  Retry; `checking | down | stopped | up` states; compact commands are
  selectable text (no copy buttons in v1).
- Status pills: `--g` green / `--y` yellow / `--dim` grey, matching tokens.

### 5.2 AI Module (right panel) — this machine first

- **Dropdown becomes the real picker.** Options = installed models from
  `/api/tags` (name, size, `loaded` badge when `/api/ps` reports it),
  auto-select the first on load, persist selection in the store. When zero
  models: empty state + "Pull a starter model" action (llama3.2:3b, ~2 GB,
  per the catalog's own default).
- **Tree gains install state** (via `ollamaTag` on guides, §6):
  - tag installed → `✓ installed` chip; clicking the model **selects it**
    for chat (guide link stays available via the ↗ / title area),
  - tag not installed → **Pull** button with progress (§5.4),
  - guide without a tag (e.g. Safety classifiers, LLaMA 1) → unchanged
    guide-only link.
- Selection state: new `components/ModelContext.tsx` — React context
  mounted in `app/page.tsx`, consumed by AiModule + CenterChat (siblings;
  no prop drilling through the layout).

### 5.3 Chat — real streaming (`components/CenterChat.tsx`)

- Replace `CANNED_REPLY` with `POST /api/ollama/chat`, reading the NDJSON
  stream (`ReadableStream` reader → line buffer → JSON.parse → append
  `message.content`) into the assistant bubble as it arrives; blinking
  cursor while streaming; **Stop** button (AbortController) replaces Send
  mid-stream.
- State matrix (each rendered inside the existing `.chat` frame):
  1. `ollama down` → notice: "Ollama isn't running — see the Ollama section
     in the sidebar", input disabled.
  2. `no models` → CTA "No models on this machine yet" + Pull starter.
  3. `ready` → normal send; first-token wait > 1.5 s shows a subtle
     "Warming up <model>…" line (covers the on-disk → RAM load).
  4. `stream error` → error line in the bubble + Retry.
- The empty-state copy updates: it currently promises the dropdown picks the
  model — now it's true.

### 5.4 Pull flow

- Trigger: Pull button in the tree, or the no-models CTA.
- Confirm inline in the row: model name + guide size hint ("~4.9 GB download")
  → `POST /api/ollama/pull`; per-layer `completed/total` aggregated into one
  percentage bar rendered in the row (`.pull` styles); success → refresh
  status, auto-select the new model, show "Ready — say hi"; `{"error"}` line
  → red inline message (bad tag, disk full, etc.).

### 5.5 AI History — real sessions (raw JSON stays)

- Session shape already exists (`ChatSession` in `data/chat-sessions.ts`):
  `id, title, model, created_at, messages[], message_count` — keep the shape,
  swap the source: `lib/history.ts` reads/writes
  `localStorage["las.sessions.v1"]` (title = first user message truncated,
  save on stream completion, cap 50 sessions / 200 messages each).
- Sidebar JSON block renders these real sessions; search filters them
  (existing `filterSessions` logic moves to `lib/history.ts`).
- **Delete** `data/chat-sessions.ts` (canned seed) — no demo nonsense in a
  real product; empty state renders `[]` with the existing meta line.
- Model change starts a new conversation (clears bubbles) so each session's
  `model` field stays truthful; a conversation with unsent text warns first.

---

## 6. Data model changes

`data/models/types.ts`:

```ts
export interface ModelGuide {
  // …existing fields…
  /** Exact `ollama pull` tag when this guide maps to a registry model. */
  ollamaTag?: string;   // e.g. llama-3-1-8b → "llama3.1:8b"
  /** Pull-size hint for the confirm step ("~4.9 GB"), if known. */
  pullSize?: string;
}
```

Mapping for the 19 guides (verify each tag exists against the registry during
build — `ollama show <tag>` / ollama.com/library):

| Guide | tag | | Guide | tag |
|---|---|---|---|---|
| llama-2-7b-13b | `llama2:7b` | | llama-2-70b | `llama2:70b` |
| codellama-7b-13b | `codellama:7b` | | codellama-34b-70b | `codellama:34b` |
| llama-3-8b | `llama3:8b` | | llama-3-70b | `llama3:70b` |
| llama-3-1-8b | `llama3.1:8b` | | llama-3-1-70b | `llama3.1:70b` |
| llama-3-2-1b-3b | `llama3.2:3b` | | llama-3-3-70b | `llama3.3:70b` |
| llama-3-2-vision-11b | `llama3.2:11b-vision` | | llama-3-2-vision-90b | `llama3.2:90b-vision` |
| llama-3-1-405b | `llama3.1:405b` | | llama-4-scout | `llama4:scout` |
| llama-4-maverick | `llama4:maverick` | | | |
| *(no tag — guide only)*: llama-1-6-7b-13b, safety-classifiers, llama-1-33b-65b, llama-4-behemoth | | | | |

**Installed-matching rule (v1):** exact tag equality between
`/api/tags[].name` and `ollamaTag`. Known edge: an install tagged `:latest`
(e.g. `llama3.2:latest` on this machine) does **not** badge a `:3b` guide —
it still appears and is selectable in the dropdown. A v1.1 may match on
`details.parameter_size`. (Flagging for the auditors.)

**Persistence:** `localStorage` only — no server DB (consistent with
local-only principle). Keys versioned (`v1`) for future migration.

---

## 7. Error / state matrix (must all render honestly)

| Condition | Detect | UI |
|---|---|---|
| Ollama not installed | `execFile` fails | Sidebar: full install guide + Re-check |
| Installed, not running | ping fails, exec ok | Sidebar: "start it: ollama serve" + Re-check |
| Running, 0 models | tags `[]` | Dropdown empty state + Pull starter CTA; chat CTA |
| Running, models | tags list | Auto-select first; tree badges |
| Chat while down | 503 from handler | Inline notice + disabled input (no fake reply) |
| Slow first token | >1.5 s no chunk | "Warming up …" line |
| Mid-stream failure | reader error / `error` line | Error in bubble + Retry |
| Pull failure | `{"error"}` line | Red inline row message |
| Pull cancel | user abort | Row returns to Pull button; partial download resumes later |
| Handler can't reach Ollama (wrong `OLLAMA_HOST`) | fetch reject | status → `down` with host shown in tooltip |

---

## 8. Milestones (each ends with the full QA gate in §9)

- **M1 — Status + local models.** `lib/ollama.ts`, all three route handlers,
  `OllamaStatus` sidebar section, ModelContext, real dropdown listing this
  machine's models. *Done when:* status pill flips correctly with
  `ollama serve` killed/restarted; dropdown shows `llama3.1:8b` +
  `llama3.2:latest` with sizes; install guide visible when down.
- **M2 — Real chat.** Streaming pipeline, state matrix, Stop, warm-up line,
  history auto-save. *Done when:* tokens stream into the bubble, Stop works,
  killing Ollama mid-conversation shows the honest notice (no canned text
  anywhere — `CANNED_REPLY` deleted).
- **M3 — Pull.** `ollamaTag` on guides, tree badges, progress bar, auto-
  select, starter CTA. *Done when:* pulling `llama3.2:1b` end-to-end shows
  progress → appears in dropdown → chat answers; a bad tag errors inline.
- **M4 — Real history + polish + full QA.** `lib/history.ts`, seed deleted,
  model-switch rule, copy passes, final audit (§9) + screenshot set.

Deferred (explicitly out of scope): model deletion, `llama catalog --json`
alignment, autostart, multi-remote servers, parameter tuning.

---

## 9. QA gate (run at every milestone; full set at M4)

1. `pnpm lint` clean; `pnpm build` — existing 25 routes **plus** the new
   `/api/ollama/*` routes, no insights in `--debug-prerender`.
2. Curl smoke: status up/down (override `OLLAMA_HOST` to a dead port),
   chat one-shot stream (`curl -N`), pull with a tiny tag.
3. Manual matrix: every row of §7 rendered at 1920 / 768 / 375.
4. Regressions: 19 slugs 200, bogus 404, 22 links 200, forbidden-string
   sweep, screenshot-diff of *untouched* areas vs the committed baselines.
5. `bazel build //...` unaffected; CI green (web job runs lint+build).
6. `git status`: only intended files; nothing outside `crates/web/`.

---

## 10. Risks & open questions (for the auditors)

1. **cacheComponents × route handlers** — must confirm the sanctioned
   request-time mechanism in the in-tree Next 16 docs before writing
   handlers (M1 spike, half-day worst case).
2. **Model-load latency** on first send (llama3.1:8b ≈ seconds) — heuristic
   warm-up line may be better as an explicit `/api/ps` poller; decide.
3. **`:latest` matching** (§6) — accept for v1 or implement
   `parameter_size` matching now?
4. **Pull bandwidth/disk** — size hints are guide-level approximations;
   actual `total` arrives only after the manifest. Confirm UX shows both.
5. **History privacy** — localStorage is origin-scoped; a note in the JSON
   meta line ("stored in this browser") may be worth it.
6. **Scope creep watch:** anything not serving the 5-step journey in §1
   (deletion UI, tuning, remote hosts) stays deferred.
