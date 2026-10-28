import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * The M7 history DB against a real (temporary) file: creation, the server's
 * stamp rules, both session caps, deletes, and the migration import that is
 * the only path allowed to keep old timestamps.
 *
 * Each test gets a fresh module instance + file: the DB handle is cached
 * per module, so `vi.resetModules()` plus a new HISTORY_DB_PATH isolates
 * them (no shared state, no ordering games).
 */
let dir: string;
let db: typeof import("@/lib/history-db");

function msg(content = "hi", role: "user" | "assistant" = "user") {
  return { role, content, at: "2026-01-01T00:00:00.000Z" };
}

beforeEach(async () => {
  vi.resetModules();
  dir = mkdtempSync(join(tmpdir(), "las-hist-"));
  process.env.HISTORY_DB_PATH = join(dir, "history.db");
  db = await import("@/lib/history-db");
});

afterEach(() => {
  db.closeHistoryDb();
  rmSync(dir, { recursive: true, force: true });
  delete process.env.HISTORY_DB_PATH;
});

describe("saveSession", () => {
  it("creates with a title from the first user message", () => {
    const saved = db.saveSession({
      id: "ses_a",
      model: "llama3.1:8b",
      messages: [msg("why does my dough collapse?"), msg("because", "assistant")],
    });
    expect(saved.title).toBe("why does my dough collapse?");
    expect(saved.message_count).toBe(2);
    expect(db.listSessions()).toHaveLength(1);
    expect(db.listSessions()[0].id).toBe("ses_a");
  });

  it("freezes title + created_at, moves updated_at (server stamps)", () => {
    vi.useFakeTimers();
    vi.setSystemTime("2026-02-01T10:00:00.000Z");
    const first = db.saveSession({ id: "ses_b", model: "llama3.1:8b", messages: [msg("one")] });
    vi.setSystemTime("2026-02-01T11:00:00.000Z");
    // A later save with a *different* first message must not rename it.
    const second = db.saveSession({
      id: "ses_b",
      model: "llama3.2:latest",
      messages: [msg("one"), msg("two", "assistant")],
    });
    vi.useRealTimers();
    expect(second.title).toBe(first.title);
    expect(second.created_at).toBe(first.created_at);
    expect(second.updated_at > first.updated_at).toBe(true);
    expect(second.model).toBe("llama3.2:latest");
    expect(db.listSessions()).toHaveLength(1);
  });

  it("keeps only the newest MAX_SESSIONS rows", () => {
    vi.useFakeTimers();
    try {
      for (let i = 0; i < 25; i++) {
        vi.setSystemTime(Date.UTC(2026, 0, 1, 0, 0, i));
        db.saveSession({
          id: `ses_${i}`,
          model: "llama3.1:8b",
          messages: [msg(`m${i}`)],
        });
      }
    } finally {
      vi.useRealTimers();
    }
    const rows = db.listSessions();
    expect(rows).toHaveLength(20);
    // The oldest created in this loop (ses_0) is the one that fell off.
    expect(rows.some((s) => s.id === "ses_0")).toBe(false);
    expect(rows.some((s) => s.id === "ses_24")).toBe(true);
  });

  it("keeps only the newest MAX_MESSAGES messages per session", () => {
    const many = Array.from({ length: 130 }, (_, i) => msg(`m${i}`));
    const saved = db.saveSession({ id: "ses_long", model: "llama3.1:8b", messages: many });
    expect(saved.message_count).toBe(100);
    expect(saved.messages[0].content).toBe("m30"); // first 30 dropped
    expect(saved.messages[99].content).toBe("m129");
  });

  it("round-trips a session exactly (messages JSON column)", () => {
    const messages = [msg("question"), msg("answer", "assistant")];
    db.saveSession({ id: "ses_rt", model: "llama3.2:latest", messages });
    const [loaded] = db.listSessions();
    expect(loaded.messages).toEqual(messages);
  });
});

describe("delete", () => {
  it("removes one row and reports whether it existed", () => {
    db.saveSession({ id: "ses_x", model: "m", messages: [msg()] });
    expect(db.deleteSession("ses_x")).toBe(true);
    expect(db.deleteSession("ses_x")).toBe(false);
    expect(db.listSessions()).toHaveLength(0);
  });

  it("wipes everything with deleteAll", () => {
    db.saveSession({ id: "ses_1", model: "m", messages: [msg()] });
    db.saveSession({ id: "ses_2", model: "m", messages: [msg()] });
    expect(db.deleteAll()).toBe(2);
    expect(db.listSessions()).toHaveLength(0);
    expect(db.deleteAll()).toBe(0);
  });
});

describe("importSessions (one-time migration)", () => {
  it("preserves original timestamps and title", () => {
    const legacy = [
      {
        id: "ses_old",
        title: "My old chat",
        model: "llama3.1:8b",
        created_at: "2025-06-01T00:00:00.000Z",
        updated_at: "2025-06-02T12:34:56.000Z",
        message_count: 1,
        messages: [msg("hello from last year")],
      },
    ];
    expect(db.importSessions(legacy)).toBe(1);
    const [loaded] = db.listSessions();
    expect(loaded.created_at).toBe("2025-06-01T00:00:00.000Z");
    expect(loaded.updated_at).toBe("2025-06-02T12:34:56.000Z");
    expect(loaded.title).toBe("My old chat");
  });

  it("skips malformed rows but keeps the good ones", () => {
    const count = db.importSessions([
      { id: "bad id with spaces", model: "m", messages: [msg()] }, // junk id
      { id: "ses_no_msgs", model: "m", messages: "not-an-array" },
      "just a string",
      {
        id: "ses_good",
        model: "m",
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-01T00:00:00.000Z",
        title: "",
        messages: [msg("kept")],
      },
    ]);
    expect(count).toBe(1);
    expect(db.listSessions()[0].id).toBe("ses_good");
  });

  it("is idempotent (upsert by id) so a lost flag can't duplicate rows", () => {
    const legacy = [
      {
        id: "ses_dup",
        title: "t",
        model: "m",
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-01T00:00:00.000Z",
        message_count: 1,
        messages: [msg()],
      },
    ];
    db.importSessions(legacy);
    db.importSessions(legacy);
    expect(db.listSessions()).toHaveLength(1);
  });

  it("rejects non-arrays outright", () => {
    expect(db.importSessions(null)).toBe(0);
    expect(db.importSessions({ id: "ses_x" })).toBe(0);
  });
});

describe("parseSaveDraft (the 400 gate)", () => {
  const good = { id: "ses_ok", model: "llama3.1:8b", messages: [msg()] };

  it("accepts a well-formed draft", () => {
    expect(db.parseSaveDraft(good)).toEqual(good);
  });

  const badDrafts: Array<[unknown, string]> = [
    [null, "null body"],
    [{ ...good, id: "../../etc/passwd" }, "path junk id"],
    [{ ...good, id: 42 }, "non-string id"],
    [{ ...good, model: "" }, "empty model"],
    [{ ...good, model: "x".repeat(201) }, "runaway model"],
    [{ ...good, messages: [] }, "no messages"],
    [{ ...good, messages: [{}] }, "malformed message"],
    [{ ...good, messages: [{ role: "system", content: "x", at: "t" }] }, "unknown role"],
  ];
  it.each(badDrafts)("rejects %j (%s)", (payload) => {
    expect(db.parseSaveDraft(payload)).toBeNull();
  });

  it("drops overflow before validating (cap policy, not an error)", () => {
    const many = Array.from({ length: 150 }, (_, i) => msg(`m${i}`));
    const parsed = db.parseSaveDraft({ ...good, messages: many });
    expect(parsed?.messages).toHaveLength(100);
    expect(parsed?.messages[0].content).toBe("m50");
  });
});

describe("historyStats", () => {
  it("counts sessions + messages and grows a real file", () => {
    const empty = db.historyStats();
    expect(empty.sessions).toBe(0);
    expect(empty.messages).toBe(0);
    expect(empty.bytes).toBeGreaterThan(0); // SQLite pre-allocates a page
    db.saveSession({ id: "ses_1", model: "m", messages: [msg(), msg("b", "assistant")] });
    db.saveSession({ id: "ses_2", model: "m", messages: [msg()] });
    const stats = db.historyStats();
    expect(stats.sessions).toBe(2);
    expect(stats.messages).toBe(3);
    expect(stats.bytes).toBeGreaterThanOrEqual(empty.bytes);
    expect(stats.file).toContain("history.db");
  });
});

describe("per-message model stamp (M11)", () => {
  it("round-trips a valid stamp through save + list", () => {
    const saved = db.saveSession({
      id: "ses_stamp",
      model: "llama3.2:latest",
      messages: [
        { role: "user", content: "hi", at: "2026-01-01T00:00:00.000Z", model: "llama3.2:latest" },
        { role: "assistant", content: "hello", at: "2026-01-01T00:00:01.000Z", model: "llama3.1:8b" },
      ],
    });
    expect(saved.messages[0].model).toBe("llama3.2:latest");
    expect(saved.messages[1].model).toBe("llama3.1:8b");
    expect(db.listSessions()[0].messages[1].model).toBe("llama3.1:8b");
  });

  it("accepts rows with no stamp (pre-M11) unchanged", () => {
    const saved = db.saveSession({
      id: "ses_legacy",
      model: "llama3.1:8b",
      messages: [msg("old")],
    });
    expect(saved.messages[0].model).toBeUndefined();
  });

  it("drops a junk stamp instead of rejecting the message", () => {
    const saved = db.saveSession({
      id: "ses_junk_stamp",
      model: "llama3.1:8b",
      messages: [
        { role: "user", content: "hi", at: "2026-01-01T00:00:00.000Z", model: 7 as unknown as string },
        { role: "assistant", content: "ok", at: "2026-01-01T00:00:01.000Z", model: "m".repeat(400) },
      ],
    });
    expect(saved.messages).toHaveLength(2);
    expect(saved.messages[0].model).toBeUndefined();
    expect(saved.messages[1].model).toBeUndefined();
    expect(saved.messages[1].content).toBe("ok");
  });
});

describe("onHistoryChange (M12 change feed)", () => {
  it("notifies on every write: save, import, delete, wipe", () => {
    let seen = 0;
    const off = db.onHistoryChange(() => {
      seen += 1;
    });

    db.saveSession({ id: "ses_a", model: "llama3.1:8b", messages: [msg("hi")] });
    expect(seen).toBe(1);

    db.saveSession({ id: "ses_a", model: "llama3.1:8b", messages: [msg("hi"), msg("ok", "assistant")] });
    expect(seen).toBe(2);

    db.importSessions([{ id: "ses_b", model: "llama3.2:latest", messages: [msg("imported")] }]);
    expect(seen).toBe(3);

    expect(db.deleteSession("ses_a")).toBe(true);
    expect(seen).toBe(4);

    expect(db.deleteAll()).toBe(1);
    expect(seen).toBe(5);

    off();
  });

  it("stays quiet when nothing changed (no false refetches)", () => {
    let seen = 0;
    const off = db.onHistoryChange(() => {
      seen += 1;
    });
    expect(db.deleteSession("never-existed")).toBe(false);
    expect(db.deleteAll()).toBe(0); // empty table
    expect(db.importSessions([])).toBe(0);
    expect(seen).toBe(0);
    off();
  });

  it("unsubscribes cleanly and isolates a throwing listener", () => {
    const seen: string[] = [];
    const offBad = db.onHistoryChange(() => {
      throw new Error("broken subscriber");
    });
    const offGood = db.onHistoryChange(() => {
      seen.push("good");
    });

    // the write still lands and the healthy listener still fires
    db.saveSession({ id: "ses_a", model: "llama3.1:8b", messages: [msg("hi")] });
    expect(db.listSessions()).toHaveLength(1);
    expect(seen).toEqual(["good"]);

    offBad();
    offGood();
    db.saveSession({ id: "ses_b", model: "llama3.1:8b", messages: [msg("again")] });
    expect(seen).toEqual(["good"]); // unsubscribed: no more calls
  });
});
