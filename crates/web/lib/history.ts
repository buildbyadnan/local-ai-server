/**
 * Chat history (M7).
 *
 * Two halves, both pure enough to unit-test:
 * - the **types + helpers** the UI shares (`titleFrom`, `filterSessions`,
 *   `formatRelative`, `mergeSessions`, `capSessions`, `sanitizeSessions`);
 * - a tiny **external store** over the server's `/api/history` SQLite DB,
 *   subscribed to with `useSyncExternalStore`.
 *
 * Why the store now talks to the server instead of owning a
 * `localStorage` blob (§9 M7):
 * - **cross-profile truth**: every Chrome profile on this machine shares
 *   one history file through the API; localStorage is demoted to a *read
 *   cache* so first paint is still synchronous and flicker-free;
 * - **cross-tab truth**: mutations broadcast on `las.history` and the
 *   other tabs refetch — the server's row is the union, so row 19's
 *   "merge two divergent blobs" dance is no longer needed;
 * - **no quota cliff**: row 21's eviction ladder existed only because
 *   localStorage caps at ~5 MB; the cache now *drops itself* on quota
 *   instead of dropping sessions, because the sessions live on disk.
 *
 * Store shape (unchanged contract for the components):
 * - server snapshot `null` → row 37's hydration skeleton; first client
 *   snapshot reads the cache synchronously (never in an effect —
 *   `react-hooks/set-state-in-effect` forbids an effect-based read);
 * - `saveSession` applies optimistically, then POSTs through a single
 *   FIFO queue so writes can't interleave; the server's stamp replaces
 *   the optimistic row only when nothing newer happened meanwhile;
 * - a failed write flips the honest `saveError` notice; a failed *read*
 *   keeps the cache (offline tolerance, not an error);
 * - migration: a profile that still holds pre-server sessions POSTs them
 *   once (`las.migrated.v1`), then always defers to server truth.
 */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /** ISO timestamp stamped when the message is written (§5.5 write point b). */
  at: string;
  /**
   * M11 — the model this message was produced under (stamped at write
   * time). Absent on pre-M11 rows; consumers fall back to `session.model`.
   */
  model?: string;
}

export interface ChatSession {
  id: string;
  /** First user message, hard-cut (§5.5) — frozen once created. */
  title: string;
  /** Model that answered — stamped on every save, never a claim of one. */
  model: string;
  /** Frozen at creation; `updated_at` moves on every save. */
  created_at: string;
  updated_at: string;
  message_count: number;
  messages: ChatMessage[];
}

/** The localStorage key — now a **read cache** of the server's rows (M7). */
export const SESSIONS_KEY = "las.sessions.v1";
/** One-time-per-profile migration marker (M7). */
export const MIGRATED_KEY = "las.migrated.v1";
/** Cross-tab signal: "history changed on the server, please refetch". */
export const HISTORY_CHANNEL = "las.history";
/** §5.5 caps — enforced server-side, mirrored when caching (M7). */
export const MAX_SESSIONS = 20;
export const MAX_MESSAGES = 100;

const TITLE_CUT = 60;

/** First user message, whitespace collapsed, hard-cut at 60 chars. */
export function titleFrom(firstUserMessage: string): string {
  return firstUserMessage.replace(/\s+/g, " ").trim().slice(0, TITLE_CUT);
}

/** Session row's relative date: "just now" / "5 minutes ago" / "2026-10-01". */
export function formatRelative(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const minutes = Math.floor(Math.max(0, Date.now() - then) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return iso.slice(0, 10);
}

/** Case-insensitive search over the `.histrow` list (§5.5). */
export function filterSessions(
  sessions: ChatSession[],
  query: string,
): ChatSession[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return sessions;
  return sessions.filter(
    (session) =>
      session.title.toLowerCase().includes(needle) ||
      session.model.toLowerCase().includes(needle) ||
      session.messages.some((message) =>
        message.content.toLowerCase().includes(needle),
      ),
  );
}

/** Newest first; ties: more messages, then lexicographic id (§5.5 merge). */
function newer(a: ChatSession, b: ChatSession): number {
  if (a.updated_at !== b.updated_at) return a.updated_at > b.updated_at ? -1 : 1;
  if (a.messages.length !== b.messages.length) {
    return b.messages.length - a.messages.length;
  }
  return b.id.localeCompare(a.id);
}

/** Union two lists by id — newest copy wins (still used for optimistic folds). */
export function mergeSessions(
  a: ChatSession[],
  b: ChatSession[],
): ChatSession[] {
  const byId = new Map<string, ChatSession>();
  for (const session of [...a, ...b]) {
    const current = byId.get(session.id);
    if (!current || newer(session, current) < 0) byId.set(session.id, session);
  }
  return [...byId.values()].sort(newer);
}

/**
 * §5.5 caps in one pure place (cache writes and imports share it): keep
 * the newest 20 sessions, drop the oldest messages past 100 per session,
 * recompute `message_count`, and return the list newest-first.
 */
export function capSessions(sessions: ChatSession[]): ChatSession[] {
  return sessions
    .map((session) => {
      const messages = session.messages.slice(-MAX_MESSAGES);
      return { ...session, message_count: messages.length, messages };
    })
    .sort(newer)
    .slice(0, MAX_SESSIONS);
}

/**
 * Shape-validate a session array (cache reads and API responses share it);
 * any bad field treats the whole blob as corrupt — the server is trusted
 * to send well-formed rows, and stale cache junk must not render half a UI.
 */
export function sanitizeSessions(raw: unknown): ChatSession[] | null {
  if (!Array.isArray(raw)) return null;
  const sessions: ChatSession[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) return null;
    const e = entry as Record<string, unknown>;
    if (
      typeof e.id !== "string" ||
      typeof e.title !== "string" ||
      typeof e.model !== "string" ||
      typeof e.created_at !== "string" ||
      !Array.isArray(e.messages)
    ) {
      return null;
    }
    const messages: ChatMessage[] = [];
    for (const message of e.messages) {
      if (typeof message !== "object" || message === null) return null;
      const m = message as Record<string, unknown>;
      if (
        (m.role !== "user" && m.role !== "assistant") ||
        typeof m.content !== "string" ||
        typeof m.at !== "string"
      ) {
        return null;
      }
      const model =
        typeof m.model === "string" && m.model.length > 0 && m.model.length <= 200
          ? m.model
          : undefined;
      messages.push({ role: m.role, content: m.content, at: m.at, model });
    }
    const created_at = e.created_at;
    const updated_at = typeof e.updated_at === "string" ? e.updated_at : created_at;
    sessions.push({
      id: e.id,
      title: e.title,
      model: e.model,
      created_at,
      updated_at,
      message_count: messages.length,
      messages,
    });
  }
  return capSessions(sessions);
}

/** Fresh id for a brand-new conversation (＋ New chat, model switch). */
export function newSessionId(): string {
  return `ses_${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`}`;
}

/* ───────────────────────── store over /api/history ───────────────────── */

type Listener = () => void;
type Json = Record<string, unknown>;

const API = "/api/history";

let snapshot: ChatSession[] | null = null; // null until the cache is read once
let saveError = false;
/** Bumped by every local mutation; stale async results check against it. */
let version = 0;
/** FIFO of API mutations — writes can never interleave (single-writer story). */
let queue: Promise<void> = Promise.resolve();
let channel: BroadcastChannel | null = null;
const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) listener();
}

function storage(): Storage | null {
  try {
    return window.localStorage; // null only where storage is unavailable
  } catch {
    return null;
  }
}

/** Read the cache once: empty → `[]`, corrupt → reset (row 20). */
function readCache(): ChatSession[] {
  const store = storage();
  if (store === null) return [];
  let stored: string | null = null;
  try {
    stored = store.getItem(SESSIONS_KEY);
  } catch {
    return [];
  }
  if (stored === null) return [];
  let sessions: ChatSession[] | null = null;
  try {
    sessions = sanitizeSessions(JSON.parse(stored));
  } catch {
    sessions = null;
  }
  if (sessions !== null) return sessions;
  try {
    store.removeItem(SESSIONS_KEY); // row 20: corrupt → welcome state
  } catch {
    // nothing to reset if storage is unavailable
  }
  return [];
}

/**
 * Mirror the snapshot into the cache (best-effort). On quota the cache
 * deletes *itself* rather than evicting sessions — sessions live in the
 * DB now, and the next load refetches them (row 21's ladder is retired).
 */
function writeCache(sessions: ChatSession[]): void {
  const store = storage();
  if (store === null) return;
  try {
    store.setItem(SESSIONS_KEY, JSON.stringify(capSessions(sessions)));
  } catch {
    try {
      store.removeItem(SESSIONS_KEY);
    } catch {
      // storage unavailable entirely — reads will just refetch
    }
  }
}

function migratedFlag(): boolean {
  try {
    return storage()?.getItem(MIGRATED_KEY) === "1";
  } catch {
    return true; // can't record a marker → skip migration (refetch still works)
  }
}

function setMigratedFlag(): void {
  try {
    storage()?.setItem(MIGRATED_KEY, "1");
  } catch {
    // best-effort: a lost flag re-imports idempotently (upsert by id)
  }
}

/** Apply a local mutation: bump version, update snapshot+cache, notify. */
function applyLocal(next: ChatSession[]): void {
  version += 1;
  snapshot = capSessions(next);
  writeCache(snapshot);
  emit();
}

/** Run one API mutation in FIFO order; the queue itself never rejects. */
function enqueue<T>(op: () => Promise<T>): Promise<T> {
  const run = queue.then(op);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** Tell the other tabs the server moved — they refetch on receipt. */
function notifyOthers(): void {
  try {
    channel?.postMessage({ t: "history" });
  } catch {
    // channel closed mid-flight: nobody to tell
  }
}

function setSaveError(value: boolean): void {
  if (saveError === value) return;
  saveError = value;
  emit();
}

async function apiJson(
  path: string,
  init?: RequestInit,
): Promise<Json | unknown | null> {
  const response = await fetch(path, { cache: "no-store", ...init });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as Json | unknown | null;
}

/**
 * Reconcile with the server: one-time migration first (this profile's
 * legacy localStorage rows, preserving their real timestamps), then GET.
 * A stale response — a local mutation happened while we waited — is
 * discarded; the optimistic snapshot is newer than any server echo.
 */
async function refresh(): Promise<void> {
  const stamp = version;
  try {
    if (!migratedFlag()) {
      const legacy = readCache();
      if (legacy.length > 0) {
        await enqueue(async () => {
          // Re-check *inside* the queue: two refreshes can both see the
          // unset flag, but only the first to run may POST the import.
          if (migratedFlag()) return;
          const result = await apiJson(API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ import: legacy }),
          });
          const imported = (result as { imported?: unknown } | null)?.imported;
          if (typeof imported === "number") setMigratedFlag();
        });
      } else {
        setMigratedFlag(); // nothing to move — remember we checked
      }
    }
    const body = await enqueue(async () => apiJson(API));
    const list = sanitizeSessions(
      Array.isArray(body) ? body : (body as Json | null)?.sessions,
    );
    if (list === null) throw new Error("malformed history payload");
    if (stamp !== version) return; // a local write won the race — keep it
    version += 1;
    snapshot = list;
    writeCache(list);
    emit();
  } catch {
    // Server unreachable/broken: the cache stays on screen (read caches
    // exist for exactly this). Write failures surface via saveError.
  }
}

/** One §5.5 write: optimistic locally, authoritative on the server. */
function saveSession(draft: {
  id: string;
  model: string;
  messages: ChatMessage[];
}): ChatSession {
  const current = getSnapshot() ?? [];
  const now = new Date().toISOString();
  const previous = current.find((session) => session.id === draft.id) ?? null;
  const messages = draft.messages.slice(-MAX_MESSAGES);
  const optimistic: ChatSession = {
    id: draft.id,
    // (a) title from the first user message; created_at/title frozen after.
    title:
      previous?.title ??
      titleFrom(draft.messages.find((m) => m.role === "user")?.content ?? ""),
    model: draft.model,
    created_at: previous?.created_at ?? now,
    updated_at: now,
    message_count: messages.length,
    messages,
  };
  applyLocal([optimistic, ...current.filter((s) => s.id !== draft.id)]);

  const stamp = version;
  void enqueue(async () => {
    try {
      const body = (await apiJson(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: draft.id, model: draft.model, messages }),
      })) as { session?: unknown } | null;
      const saved = sanitizeSessions([body?.session])?.[0];
      if (saved && stamp === version) {
        // Server's row (its updated_at/title freeze) replaces ours — but
        // only when nothing local happened after this save was queued.
        version += 1;
        snapshot = mergeSessions(snapshot ?? [], [saved]);
        writeCache(snapshot);
        emit();
      }
      setSaveError(false);
    } catch {
      setSaveError(true); // honest notice; messages stay on screen
    } finally {
      notifyOthers();
    }
  });
  return optimistic;
}

/** Delete one session: optimistic now, server-confirmed, refetch on error. */
function deleteSession(id: string): void {
  const current = getSnapshot() ?? [];
  if (!current.some((session) => session.id === id)) return;
  applyLocal(current.filter((session) => session.id !== id));
  void enqueue(async () => {
    try {
      await apiJson(`${API}?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setSaveError(false);
    } catch {
      setSaveError(true);
      await refresh(); // server still has it — show the truth again
    } finally {
      notifyOthers();
    }
  });
}

/** Delete everything (the typed-confirm path). */
function deleteAll(): void {
  applyLocal([]);
  void enqueue(async () => {
    try {
      await apiJson(`${API}?all=1`, { method: "DELETE" });
      setSaveError(false);
    } catch {
      setSaveError(true);
      await refresh();
    } finally {
      notifyOthers();
    }
  });
}

/** Another tab's mutation landed: reconcile with the server. */
function onMessage(): void {
  void refresh();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    try {
      channel = new BroadcastChannel(HISTORY_CHANNEL);
      channel.onmessage = onMessage;
    } catch {
      channel = null; // no cross-tab channel (very old browser) — still works
    }
    void refresh(); // first subscriber owns the initial server read
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      try {
        channel?.close();
      } catch {
        // already closed
      }
      channel = null;
    }
  };
}

function getSnapshot(): ChatSession[] | null {
  if (typeof window === "undefined") return null; // never touch storage in SSR
  if (snapshot === null) snapshot = readCache(); // synchronous first paint
  return snapshot;
}

/** The store's API — consumed with `useSyncExternalStore` in the provider. */
export const historyStore = {
  subscribe,
  getSnapshot,
  /** Stable `null` for server render + hydration (row 37 skeleton). */
  getServerSnapshot: (): ChatSession[] | null => null,
  getSaveError: (): boolean => saveError,
  getSaveErrorServerSnapshot: (): boolean => false,
  saveSession,
  deleteSession,
  deleteAll,
  /** Exposed for tests and the export button's "refresh first" option. */
  refresh,
};
