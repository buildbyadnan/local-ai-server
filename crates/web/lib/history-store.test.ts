import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The M7 store over `/api/history`: synchronous cache first paint, server
 * truth on refresh, the one-time migration (with its marker), optimistic
 * writes through the FIFO queue, honest saveError, and the stale-response
 * guard that keeps a local mutation from being clobbered by an old GET.
 *
 * Node test env: `window.localStorage` and `fetch` are stubbed per test;
 * `vi.resetModules()` gives each test a fresh module (module-level store
 * state must not leak between tests).
 */

type StoreModule = typeof import("@/lib/history");
type StoreApi = StoreModule["historyStore"];
type Session = import("@/lib/history").ChatSession;

interface ServerState {
  sessions: Session[];
  posts: Array<{ import?: unknown; draft?: unknown }>;
  deletes: string[];
  /** Make POST respond 500 (save-failure path). */
  failSaves: boolean;
  /** Hold GET responses until released (stale-race test). */
  holdGet: boolean;
  releaseGet: (() => void) | null;
}

function session(id: string, title = `t ${id}`): Session {
  return {
    id,
    title,
    model: "llama3.1:8b",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    message_count: 1,
    messages: [{ role: "user", content: `hello ${id}`, at: "2026-01-01T00:00:00.000Z" }],
  };
}

function jsonResponse(value: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => value,
  } as unknown as Response;
}

let ls: Map<string, string>;
let server: ServerState;
let fetchMock: ReturnType<typeof vi.fn>;
let unsubscribe: (() => void) | null = null;
function fakeLocalStorage() {
  const map = ls;
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

async function loadStore(): Promise<StoreApi> {
  vi.resetModules();
  const mod: StoreModule = await import("@/lib/history");
  return mod.historyStore;
}

/** Subscribe (starts the store) and wait for its queued work to settle. */
async function settle(current: StoreApi): Promise<void> {
  unsubscribe ??= current.subscribe(() => {});
  await current.refresh(); // queued behind anything the subscribe started
  await current.refresh(); // second pass: migration → GET chains two ops
}

beforeEach(() => {
  ls = new Map();
  server = { sessions: [], posts: [], deletes: [], failSaves: false, holdGet: false, releaseGet: null };
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    if (method === "GET") {
      if (server.holdGet) {
        await new Promise<void>((resolve) => {
          server.releaseGet = resolve;
        });
      }
      return jsonResponse({ sessions: server.sessions });
    }
    const body = init?.body ? (JSON.parse(init.body as string) as Record<string, unknown>) : {};
    if (method === "POST") {
      if (server.failSaves && !("import" in body)) {
        return jsonResponse({ error: "boom" }, 500);
      }
      if ("import" in body) {
        server.posts.push({ import: body.import });
        // The real server upserts the import; mirror that so GET sees it.
        const rows = body.import as Session[];
        server.sessions = [
          ...rows,
          ...server.sessions.filter((s) => !rows.some((r) => r.id === s.id)),
        ];
        return jsonResponse({ imported: rows.length });
      }
      server.posts.push({ draft: body });
      const saved = session(body.id as string);
      // Mirror the server: upsert by id so the next GET includes it.
      server.sessions = [saved, ...server.sessions.filter((s) => s.id !== saved.id)];
      return jsonResponse({ session: saved });
    }
    if (method === "DELETE") {
      server.deletes.push(String(url));
      if (String(url).includes("all=1")) {
        server.sessions = [];
      } else {
        const id = new URL(String(url), "http://x").searchParams.get("id");
        if (id !== null) server.sessions = server.sessions.filter((s) => s.id !== id);
      }
      return jsonResponse({ deleted: 1 });
    }
    return jsonResponse({ error: "nope" }, 404);
  });
  vi.stubGlobal("window", { localStorage: fakeLocalStorage() });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  unsubscribe?.();
  unsubscribe = null;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("first paint", () => {
  it("server snapshot is null (hydration skeleton), cache read is sync", async () => {
    ls.set("las.sessions.v1", JSON.stringify([session("ses_cached")]));
    const current = await loadStore();
    expect(current.getServerSnapshot()).toBeNull(); // row 37 SSR shape
    const snap = current.getSnapshot();
    expect(snap).not.toBeNull();
    expect(snap?.[0].id).toBe("ses_cached"); // before any fetch resolved
    expect(fetchMock).not.toHaveBeenCalled(); // getSnapshot never fetches
  });

  it("corrupt cache resets to [] without throwing (row 20)", async () => {
    ls.set("las.sessions.v1", "{not json");
    const current = await loadStore();
    expect(current.getSnapshot()).toEqual([]);
    expect(ls.has("las.sessions.v1")).toBe(false);
  });
});

describe("refresh", () => {
  it("applies server truth and mirrors it into the cache", async () => {
    server.sessions = [session("ses_server")];
    const current = await loadStore();
    await settle(current);
    expect(current.getSnapshot()?.map((s) => s.id)).toEqual(["ses_server"]);
    expect(JSON.parse(ls.get("las.sessions.v1") ?? "[]")).toHaveLength(1);
  });

  it("keeps the cache on screen when the server is unreachable", async () => {
    ls.set("las.sessions.v1", JSON.stringify([session("ses_cache")]));
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const current = await loadStore();
    await current.refresh();
    expect(current.getSnapshot()?.[0].id).toBe("ses_cache");
    expect(current.getSaveError()).toBe(false); // a failed read isn't a save error
  });
});

describe("one-time migration", () => {
  it("POSTs legacy localStorage rows once, then defers to the server", async () => {
    ls.set("las.sessions.v1", JSON.stringify([session("ses_legacy", "old chat")]));
    const current = await loadStore();
    await settle(current);
    const imports = server.posts.filter((p) => "import" in p);
    expect(imports).toHaveLength(1);
    expect((imports[0].import as Session[])[0].id).toBe("ses_legacy");
    expect(ls.get("las.migrated.v1")).toBe("1");
    expect(current.getSnapshot()?.some((s) => s.id === "ses_legacy")).toBe(true);

    // Later refreshes must never re-import (upsert would hide a wipe).
    await current.refresh();
    await current.refresh();
    expect(server.posts.filter((p) => "import" in p)).toHaveLength(1);
  });

  it("sets the marker without a POST when there is nothing to migrate", async () => {
    const current = await loadStore();
    await settle(current);
    expect(server.posts).toHaveLength(0);
    expect(ls.get("las.migrated.v1")).toBe("1");
  });

  it("skips migration entirely when the marker is already set", async () => {
    ls.set("las.sessions.v1", JSON.stringify([session("ses_legacy")]));
    ls.set("las.migrated.v1", "1");
    server.sessions = [session("ses_server")];
    const current = await loadStore();
    await settle(current);
    expect(server.posts).toHaveLength(0);
    expect(current.getSnapshot()?.map((s) => s.id)).toEqual(["ses_server"]);
  });
});

describe("saveSession", () => {
  it("applies optimistically, then POSTs the draft", async () => {
    const current = await loadStore();
    await settle(current);
    fetchMock.mockClear();

    const saved = current.saveSession({
      id: "ses_new",
      model: "llama3.1:8b",
      messages: [{ role: "user", content: "hi there", at: "2026-03-01T00:00:00.000Z" }],
    });
    expect(saved.title).toBe("hi there");
    expect(current.getSnapshot()?.[0].id).toBe("ses_new"); // before any await

    await current.refresh(); // queued behind the POST → settles it
    const drafts = server.posts.filter((p) => "draft" in p);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].draft).toMatchObject({ id: "ses_new", model: "llama3.1:8b" });
    expect(current.getSaveError()).toBe(false);
  });

  it("keeps messages on screen and flips saveError when the server refuses", async () => {
    const current = await loadStore();
    await settle(current);
    server.failSaves = true;

    current.saveSession({
      id: "ses_fail",
      model: "llama3.1:8b",
      messages: [{ role: "user", content: "do not lose me", at: "2026-03-01T00:00:00.000Z" }],
    });
    await current.refresh(); // lets the failed POST settle
    expect(current.getSaveError()).toBe(true);
    // Server truth wins after a rejected save: the row isn't history yet,
    // and the notice says so — CenterChat's own state keeps the messages
    // on screen (the store never feeds the bubbles).
    expect(current.getSnapshot()).toEqual([]);

    server.failSaves = false;
    current.saveSession({
      id: "ses_fail",
      model: "llama3.1:8b",
      messages: [{ role: "user", content: "retry", at: "2026-03-01T00:00:01.000Z" }],
    });
    await current.refresh();
    expect(current.getSaveError()).toBe(false); // honest both directions
  });
});

describe("delete", () => {
  it("removes one session locally and asks the server", async () => {
    server.sessions = [session("ses_1"), session("ses_2")];
    const current = await loadStore();
    await settle(current);
    fetchMock.mockClear();

    current.deleteSession("ses_1");
    expect(current.getSnapshot()?.map((s) => s.id)).toEqual(["ses_2"]); // optimistic
    await current.refresh();
    expect(server.deletes.some((u) => u.includes("id=ses_1"))).toBe(true);
  });

  it("wipes locally, clears the cache, and calls ?all=1", async () => {
    server.sessions = [session("ses_1"), session("ses_2")];
    const current = await loadStore();
    await settle(current);
    fetchMock.mockClear();

    current.deleteAll();
    expect(current.getSnapshot()).toEqual([]);
    await current.refresh();
    expect(server.deletes.some((u) => u.includes("all=1"))).toBe(true);
    expect(JSON.parse(ls.get("las.sessions.v1") ?? "[]")).toEqual([]);
  });
});

describe("stale-response guard", () => {
  it("discards a GET that was overtaken by a local write", async () => {
    const current = await loadStore();
    await settle(current);

    // Hold the next GET, mutate locally, then let the old answer arrive.
    server.holdGet = true;
    const pending = current.refresh();
    await vi.waitFor(() => expect(server.releaseGet).not.toBeNull());
    current.saveSession({
      id: "ses_fresh",
      model: "llama3.1:8b",
      messages: [{ role: "user", content: "mine", at: "2026-03-01T00:00:00.000Z" }],
    });
    server.sessions = [session("ses_stale")]; // what the held GET will return
    server.holdGet = false;
    server.releaseGet?.();
    await pending;

    expect(current.getSnapshot()?.some((s) => s.id === "ses_fresh")).toBe(true);
    expect(current.getSnapshot()?.some((s) => s.id === "ses_stale")).toBe(false);
  });
});
