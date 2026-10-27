/**
 * Browser-persisted chat history (CONNECTIVITY_PLAN §5.5).
 *
 * Two halves, both pure enough to unit-test:
 * - the **types + helpers** the UI shares (`titleFrom`, `filterSessions`,
 *   `formatRelative`, `mergeSessions`, `capSessions`),
 * - a tiny **external store** over `localStorage["las.sessions.v1"]` that
 *   components subscribe to with `useSyncExternalStore`.
 *
 * The store shape is what makes the §5.5 rules fall out for free:
 * - server snapshot `null` → row 37's hydration skeleton, and the first
 *   client render matches SSR exactly;
 * - the storage read happens once inside `getSnapshot` (client-only — the
 *   server snapshot returns before touching `window`), never in an effect,
 *   because `react-hooks/set-state-in-effect` forbids the setState an
 *   effect-based read would need;
 * - a `storage` event from another tab **merges in place and never writes
 *   back** (row 19's no-loop rule; removals are not back-propagated — the
 *   documented limitation of that rule);
 * - corrupt JSON resets to `[]` + the welcome state (row 20);
 * - a quota failure evicts the oldest sessions down to a floor of 5, and
 *   only if that still fails flips the honest `saveError` notice (row 21).
 */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /** ISO timestamp stamped when the message is written (§5.5 write point b). */
  at: string;
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

export const SESSIONS_KEY = "las.sessions.v1";
/** §5.5 caps — re-applied on load and on every local save. */
export const MAX_SESSIONS = 20;
export const MAX_MESSAGES = 100;

const TITLE_CUT = 60;
/** Row 21 — below this many sessions, quota eviction gives up and says so. */
const QUOTA_FLOOR = 5;

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

/** Union two lists by id (multi-tab `storage` event) — newest copy wins. */
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
 * §5.5 caps in one pure place (load and save share it): keep the newest
 * 20 sessions, drop the oldest messages past 100 per session, recompute
 * `message_count`, and return the list newest-first.
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

/** Shape-validate stored JSON; any bad field treats the whole blob as corrupt. */
function sanitize(raw: unknown): ChatSession[] | null {
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
      messages.push({ role: m.role, content: m.content, at: m.at });
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

type Listener = () => void;

let snapshot: ChatSession[] | null = null; // null until storage is read once
let saveError = false;
const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) listener();
}

/** First (client) read: empty storage → `[]`, corrupt storage → reset. */
function readStorage(): ChatSession[] {
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(SESSIONS_KEY);
  } catch {
    return []; // storage unavailable — the app still works, nothing persists
  }
  if (stored === null) return [];
  let sessions: ChatSession[] | null = null;
  try {
    sessions = sanitize(JSON.parse(stored));
  } catch {
    sessions = null;
  }
  if (sessions !== null) return sessions;
  // Row 20: corrupt JSON resets to the welcome state.
  try {
    window.localStorage.removeItem(SESSIONS_KEY);
  } catch {
    // nothing to reset if storage is unavailable
  }
  return [];
}

/**
 * Persist, evicting the oldest sessions on quota failure (row 21). Returns
 * the list that actually landed on disk — eviction may have trimmed it —
 * and whether anything landed at all.
 */
function write(capped: ChatSession[]): { sessions: ChatSession[]; saved: boolean } {
  let candidate = capped;
  for (;;) {
    try {
      window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(candidate));
      return { sessions: candidate, saved: true };
    } catch {
      if (candidate.length <= QUOTA_FLOOR) return { sessions: capped, saved: false };
      candidate = candidate.slice(0, -1); // drop the oldest and retry
    }
  }
}

/** Local save: caps re-applied, quota guarded, subscribers notified. */
function save(next: ChatSession[]): void {
  const result = write(capSessions(next));
  snapshot = result.sessions;
  saveError = !result.saved;
  emit();
}

/** One §5.5 write: create the session on first send, otherwise update it. */
function saveSession(draft: {
  id: string;
  model: string;
  messages: ChatMessage[];
}): ChatSession {
  const current = getSnapshot() ?? [];
  const now = new Date().toISOString();
  const previous = current.find((session) => session.id === draft.id) ?? null;
  const messages = draft.messages.slice(-MAX_MESSAGES);
  const session: ChatSession = {
    id: draft.id,
    // (a) title from the first user message; created_at/title frozen after.
    title:
      previous?.title ??
      titleFrom(draft.messages.find((m) => m.role === "user")?.content ?? ""),
    model: draft.model,
    created_at: previous?.created_at ?? now,
    updated_at: now, // (b) stamped on every save
    message_count: messages.length,
    messages,
  };
  save([session, ...current.filter((s) => s.id !== draft.id)]);
  return session;
}

/** Another tab wrote the list: merge in place, never write back (row 19). */
function onStorage(event: StorageEvent): void {
  if (event.key !== SESSIONS_KEY || event.newValue === null) return;
  let incoming: ChatSession[] | null = null;
  try {
    incoming = sanitize(JSON.parse(event.newValue));
  } catch {
    incoming = null;
  }
  if (incoming === null) return; // corrupt from elsewhere: keep what we have
  snapshot = mergeSessions(snapshot ?? [], incoming);
  emit();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): ChatSession[] | null {
  if (typeof window === "undefined") return null; // never touch storage in SSR
  if (snapshot === null) snapshot = readStorage();
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
};
