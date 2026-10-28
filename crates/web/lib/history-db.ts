/**
 * Server-side chat history (M7): one SQLite file via
 * `node:sqlite` — zero new dependencies, a single self-contained file that
 * every Chrome profile on this machine talks to through the API.
 *
 * Why SQLite over the previous `localStorage` blob:
 * - **cross-profile**: all browsers on this box share one file instead of
 *   each profile holding its own isolated `localStorage`;
 * - **no quota cliff**: the old eviction dance existed only because
 *   localStorage is a 5 MB shared quota — the DB doesn't have one;
 * - **single source of truth**: the server validates and stamps every
 *   write, so tabs/profiles can't disagree about `updated_at`.
 *
 * Concurrency: `DatabaseSync` calls are synchronous, so within this Node
 * process every write is naturally serialized (single-writer). Across
 * processes (the QA fleet runs several servers), WAL + `busy_timeout`
 * serialize writers at the file level.
 *
 * Validation: nothing from the client is trusted — ids, models, messages
 * and timestamps are re-checked here even though the route validated them
 * already (defence in depth; this module is the last thing before disk).
 */
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, statSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import {
  MAX_MESSAGES,
  MAX_SESSIONS,
  titleFrom,
  type ChatMessage,
  type ChatSession,
} from "@/lib/history";

/**
 * M12 — the change feed. Every write here notifies in-process subscribers;
 * `GET /api/history/stream` turns those notifications into Server-Sent
 * Events for every open tab on this machine.
 *
 * Why the server has to carry it: a `BroadcastChannel` message only reaches
 * tabs in the *same* Chrome profile — a second profile (another window, a
 * guest profile, another user on this box) shares the SQLite file but never
 * the channel. The SSE connection is the bridge across that boundary, and
 * the in-process emitter is what feeds it without polling the disk.
 */
type ChangeListener = () => void;
const changeListeners = new Set<ChangeListener>();

/** Subscribe to writes; returns the unsubscribe function. */
export function onHistoryChange(listener: ChangeListener): () => void {
  changeListeners.add(listener);
  return () => {
    changeListeners.delete(listener);
  };
}

/** Notify subscribers — a throwing listener must never fail the write. */
function emitHistoryChange(): void {
  for (const listener of [...changeListeners]) {
    try {
      listener();
    } catch {
      // one broken subscriber must not take down the rest
    }
  }
}

/** Where this server keeps its history file (QA fleet overrides per port). */
export function historyDbFile(): string {
  const fromEnv = process.env.HISTORY_DB_PATH?.trim();
  if (fromEnv) return isAbsolute(fromEnv) ? fromEnv : join(process.cwd(), fromEnv);
  return join(process.cwd(), ".data", "history.db");
}

let db: DatabaseSync | null = null;

function open(): DatabaseSync {
  const file = historyDbFile();
  mkdirSync(dirname(file), { recursive: true });
  const next = new DatabaseSync(file);
  next.exec("PRAGMA journal_mode = WAL;");
  next.exec("PRAGMA busy_timeout = 5000;");
  next.exec(`
    CREATE TABLE IF NOT EXISTS sessions(
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      model TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      message_count INTEGER NOT NULL,
      messages TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_updated ON sessions(updated_at DESC);
  `);
  return next;
}

function conn(): DatabaseSync {
  db ??= open();
  return db;
}

/** Close the handle (tests; nothing in the app ever closes mid-flight). */
export function closeHistoryDb(): void {
  db?.close();
  db = null;
}

/** A message is well-formed when role/content/at are the right types. */
function parseMessage(raw: unknown): ChatMessage | null {
  if (typeof raw !== "object" || raw === null) return null;
  const m = raw as Record<string, unknown>;
  if (m.role !== "user" && m.role !== "assistant") return null;
  if (typeof m.content !== "string" || typeof m.at !== "string") return null;
  // M11: optional per-message model stamp — bounded, junk dropped, never a
  // reason to reject the message (pre-M11 rows simply have no stamp).
  const model =
    typeof m.model === "string" && m.model.length > 0 && m.model.length <= 200
      ? m.model
      : undefined;
  if (m.content.length > 1_000_000) {
    // Truncate, never reject: a runaway generation must not cost the user
    // the rest of the conversation (1M chars ≈ 2 MB, far past any reply).
    return {
      role: m.role,
      content: m.content.slice(0, 1_000_000),
      at: m.at.slice(0, 64),
      model,
    };
  }
  return { role: m.role, content: m.content, at: m.at.slice(0, 64), model };
}

/** Valid `ses_*`-style id: our charset, bounded length (no path/SQL junk). */
function isValidId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(id);
}

/**
 * Validate a save draft (route → 400 on `null`, and `saveSession` re-runs
 * it as the last runtime gate before disk). Strict: one bad message
 * rejects the whole draft, so a client bug surfaces as an honest 400
 * instead of a silently mangled conversation. Only the newest
 * `MAX_MESSAGES` are kept *and* validated — older overflow is dropped by
 * cap policy before it matters.
 */
export function parseSaveDraft(raw: unknown): {
  id: string;
  model: string;
  messages: ChatMessage[];
} | null {
  if (typeof raw !== "object" || raw === null) return null;
  const e = raw as Record<string, unknown>;
  if (!isValidId(e.id)) return null;
  if (typeof e.model !== "string" || e.model.length === 0 || e.model.length > 200) {
    return null;
  }
  if (!Array.isArray(e.messages) || e.messages.length === 0) return null;
  const kept = e.messages.slice(-MAX_MESSAGES);
  const messages: ChatMessage[] = [];
  for (const entry of kept) {
    const message = parseMessage(entry);
    if (message === null || message.at.length === 0) return null;
    messages.push(message);
  }
  return { id: e.id, model: e.model, messages };
}

interface Row {
  id: string;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  messages: string;
}

function rowToSession(row: Row): ChatSession | null {
  let messages: ChatMessage[] | null = null;
  try {
    const parsed: unknown = JSON.parse(row.messages);
    if (!Array.isArray(parsed)) return null;
    messages = parsed.map(parseMessage).filter((m): m is ChatMessage => m !== null);
  } catch {
    return null;
  }
  return {
    id: row.id,
    title: row.title,
    model: row.model,
    created_at: row.created_at,
    updated_at: row.updated_at,
    message_count: messages.length,
    messages,
  };
}

const SELECT_ALL =
  "SELECT id, title, model, created_at, updated_at, message_count, messages FROM sessions " +
  "ORDER BY updated_at DESC, message_count DESC, id DESC";

/** Every session, newest first — the exact shape `GET /api/history` sends. */
export function listSessions(): ChatSession[] {
  const rows = conn().prepare(SELECT_ALL).all() as unknown as Row[];
  return rows.map(rowToSession).filter((s): s is ChatSession => s !== null);
}

/** Session caps in the DB: keep the newest MAX_SESSIONS by (updated_at). */
function enforceSessionCap(): void {
  conn()
    .prepare(
      `DELETE FROM sessions WHERE id NOT IN (
         SELECT id FROM sessions
         ORDER BY updated_at DESC, message_count DESC, id DESC
         LIMIT ?
       )`,
    )
    .run(MAX_SESSIONS);
}

/**
 * One history write (create on first send, update after). The server owns
 * `updated_at`; `title` and `created_at` are computed once and then frozen
 * — re-posts of the same id can never rename or backdate a conversation.
 */
export function saveSession(draft: {
  id: string;
  model: string;
  messages: ChatMessage[];
}): ChatSession {
  // Last runtime gate before disk (route validated first; re-check anyway).
  const checked = parseSaveDraft(draft);
  if (checked === null) throw new Error("invalid save draft");
  const connection = conn();
  const existing = connection
    .prepare("SELECT title, created_at FROM sessions WHERE id = ?")
    .get(draft.id) as { title: string; created_at: string } | undefined;

  const messages = checked.messages;
  const now = new Date().toISOString();
  const title =
    existing?.title ??
    titleFrom(checked.messages.find((m) => m.role === "user")?.content ?? "");
  const session: ChatSession = {
    id: draft.id,
    title,
    model: draft.model,
    created_at: existing?.created_at ?? now,
    updated_at: now,
    message_count: messages.length,
    messages,
  };
  connection
    .prepare(
      `INSERT INTO sessions(id, title, model, created_at, updated_at, message_count, messages)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         model = excluded.model,
         updated_at = excluded.updated_at,
         message_count = excluded.message_count,
         messages = excluded.messages`,
    )
    .run(
      session.id,
      session.title,
      session.model,
      session.created_at,
      session.updated_at,
      session.message_count,
      JSON.stringify(session.messages),
    );
  enforceSessionCap();
  emitHistoryChange();
  return session;
}

/**
 * One-time migration import (M7): full rows with their *own* timestamps —
 * this is the only path that may set `created_at`/`updated_at`, because a
 * migrated chat must keep the history it actually has. Malformed rows are
 * skipped individually (a half-corrupt localStorage shouldn't cost the
 * good sessions); returns how many landed.
 */
export function importSessions(raw: unknown): number {
  if (!Array.isArray(raw)) return 0;
  const connection = conn();
  const insert = connection.prepare(
    `INSERT INTO sessions(id, title, model, created_at, updated_at, message_count, messages)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       model = excluded.model,
       updated_at = excluded.updated_at,
       message_count = excluded.message_count,
       messages = excluded.messages`,
  );
  let imported = 0;
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const e = entry as Record<string, unknown>;
    if (!isValidId(e.id) || typeof e.model !== "string" || e.model.length === 0) continue;
    if (!Array.isArray(e.messages)) continue;
    const messages = e.messages
      .slice(-MAX_MESSAGES)
      .map(parseMessage)
      .filter((m): m is ChatMessage => m !== null);
    if (messages.length === 0 && e.messages.length > 0) continue; // all-bad payload
    const created = typeof e.created_at === "string" && !Number.isNaN(Date.parse(e.created_at))
      ? e.created_at
      : new Date().toISOString();
    const updated = typeof e.updated_at === "string" && !Number.isNaN(Date.parse(e.updated_at))
      ? e.updated_at
      : created;
    const title =
      typeof e.title === "string" && e.title.trim()
        ? e.title.slice(0, 200)
        : titleFrom(messages.find((m) => m.role === "user")?.content ?? "");
    insert.run(
      e.id,
      title,
      e.model.slice(0, 200),
      created,
      updated,
      messages.length,
      JSON.stringify(messages),
    );
    imported += 1;
  }
  enforceSessionCap();
  if (imported > 0) emitHistoryChange();
  return imported;
}

/** Delete one session; `false` when the id was never there. */
export function deleteSession(id: string): boolean {
  const result = conn().prepare("DELETE FROM sessions WHERE id = ?").run(id);
  const deleted = Number(result.changes) > 0;
  if (deleted) emitHistoryChange();
  return deleted;
}

/** Delete everything (the typed-confirm "Delete all history" path). */
export function deleteAll(): number {
  const result = conn().prepare("DELETE FROM sessions").run();
  const deleted = Number(result.changes);
  if (deleted > 0) emitHistoryChange();
  return deleted;
}

/** For the System-info dialog: what the history file actually holds. */
export function historyStats(): {
  sessions: number;
  messages: number;
  bytes: number;
  file: string;
} {
  const totals = conn()
    .prepare("SELECT COUNT(*) AS sessions, COALESCE(SUM(message_count), 0) AS messages FROM sessions")
    .get() as { sessions: number; messages: number };
  let bytes = 0;
  try {
    bytes = statSync(historyDbFile()).size;
  } catch {
    bytes = 0; // not created yet (fresh install, nothing saved)
  }
  return { sessions: Number(totals.sessions), messages: Number(totals.messages), bytes, file: historyDbFile() };
}
