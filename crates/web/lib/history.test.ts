import { describe, expect, it } from "vitest";
import {
  MAX_MESSAGES,
  MAX_SESSIONS,
  capSessions,
  filterSessions,
  mergeSessions,
  sanitizeSessions,
  titleFrom,
  type ChatSession,
} from "@/lib/history";

/** Minimal session fixture — `updated` orders, `count` sizes the messages. */
function session(id: string, updated: string, count = 0): ChatSession {
  return {
    id,
    title: `title ${id}`,
    model: "llama3.1:8b",
    created_at: updated,
    updated_at: updated,
    message_count: count,
    messages: Array.from({ length: count }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `m${i} of ${id}`,
      at: updated,
    })),
  };
}

describe("titleFrom", () => {
  it("hard-cuts the first user message at 60 chars", () => {
    expect(titleFrom("x".repeat(61))).toHaveLength(60);
    expect(titleFrom("y".repeat(60))).toBe("y".repeat(60));
  });

  it("collapses whitespace so a multi-line message stays one line", () => {
    expect(titleFrom("why does\n  my dough  collapse?")).toBe(
      "why does my dough collapse?",
    );
  });
});

describe("filterSessions", () => {
  const sessions = [
    session("a", "2026-10-26T10:00:00Z", 2),
    { ...session("b", "2026-10-26T09:00:00Z"), title: "Sourdough tips", model: "llama3.2:1b" },
  ];

  it("returns the list untouched for an empty or whitespace query", () => {
    expect(filterSessions(sessions, "")).toBe(sessions);
    expect(filterSessions(sessions, "   ")).toBe(sessions);
  });

  it("matches title, model and message content, case-insensitively", () => {
    expect(filterSessions(sessions, "sourdough").map((s) => s.id)).toEqual(["b"]);
    expect(filterSessions(sessions, "LLAMA3.2").map((s) => s.id)).toEqual(["b"]);
    expect(filterSessions(sessions, "m0 of a").map((s) => s.id)).toEqual(["a"]);
  });

  it("returns nothing when no session matches", () => {
    expect(filterSessions(sessions, "nope")).toEqual([]);
  });
});

describe("capSessions (session prune)", () => {
  it("evicts the oldest session past 20", () => {
    const list = Array.from({ length: 21 }, (_, i) =>
      session(`s${String(i).padStart(2, "0")}`, `2026-10-26T10:${String(i).padStart(2, "0")}:00Z`),
    );
    const capped = capSessions(list);
    expect(capped).toHaveLength(MAX_SESSIONS);
    expect(capped.map((s) => s.id)).not.toContain("s00"); // oldest is gone
    expect(capped[0].id).toBe("s20"); // newest first
  });

  it("drops the oldest messages past 100 and recounts", () => {
    const over = session("a", "2026-10-26T10:00:00Z", MAX_MESSAGES + 1);
    const [capped] = capSessions([over]);
    expect(capped.messages).toHaveLength(MAX_MESSAGES);
    expect(capped.message_count).toBe(MAX_MESSAGES);
    expect(capped.messages[0].content).toBe("m1 of a"); // m0 (oldest) dropped
  });
});

describe("mergeSessions (union)", () => {
  const a = [session("shared", "2026-10-26T10:00:00Z", 2), session("only-a", "2026-10-26T09:00:00Z")];

  it("unions by id and sorts newest first", () => {
    const b = [session("only-b", "2026-10-26T11:00:00Z")];
    const merged = mergeSessions(a, b);
    expect(merged.map((s) => s.id)).toEqual(["only-b", "shared", "only-a"]);
  });

  it("newer updated_at wins for a shared id", () => {
    const b = [{ ...session("shared", "2026-10-26T10:30:00Z", 5), title: "newer" }];
    expect(mergeSessions(a, b)[0].title).toBe("newer");
    expect(mergeSessions(b, a)[0].title).toBe("newer"); // order-independent
  });

  it("tie-breaks by message count, then lexicographic id", () => {
    const base = "2026-10-26T10:00:00Z";
    const long = session("same", base, 4);
    const short = { ...session("same", base, 2), title: "short" };
    expect(mergeSessions([short], [long])[0].message_count).toBe(4);

    const t1 = { ...session("zzz", base, 1), title: "t1" };
    const t2 = { ...session("aaa", base, 1), title: "t2" };
    expect(mergeSessions([t1], [t2])[0].id).toBe("zzz"); // greater id wins
  });
});

describe("sanitizeSessions — per-message model stamp (M11)", () => {
  const row = {
    id: "ses_m",
    title: "t",
    model: "llama3.2:latest",
    created_at: "2026-10-27T10:00:00Z",
    updated_at: "2026-10-27T10:00:00Z",
    messages: [
      { role: "user", content: "hi", at: "2026-10-27T10:00:00Z", model: "llama3.2:latest" },
      { role: "assistant", content: "yo", at: "2026-10-27T10:00:01Z", model: "llama3.1:8b" },
    ],
  };

  it("keeps a valid stamp on each message", () => {
    const [s] = sanitizeSessions([row]) ?? [];
    expect(s?.messages[0].model).toBe("llama3.2:latest");
    expect(s?.messages[1].model).toBe("llama3.1:8b");
  });

  it("keeps pre-M11 rows without a stamp (no model field)", () => {
    const legacy = { ...row, messages: [{ role: "assistant", content: "old", at: row.created_at }] };
    const [s] = sanitizeSessions([legacy]) ?? [];
    expect(s).toBeTruthy();
    expect(s?.messages[0].model).toBeUndefined();
  });

  it("drops junk stamps but keeps the message", () => {
    const junk = { ...row, messages: [{ role: "user", content: "hi", at: row.created_at, model: 42 }] };
    const [s] = sanitizeSessions([junk]) ?? [];
    expect(s?.messages[0].content).toBe("hi");
    expect(s?.messages[0].model).toBeUndefined();
  });

  it("bounds an oversize stamp", () => {
    const big = { ...row, messages: [{ role: "user", content: "hi", at: row.created_at, model: "x".repeat(500) }] };
    const [s] = sanitizeSessions([big]) ?? [];
    expect(s?.messages[0].model).toBeUndefined();
  });
});
