"use client";

/**
 * Single client-side owner of Ollama state for the whole home screen:
 * the status poll (mount + 5 s visibility-gated + focus + Re-check), the
 * selected model, the "model vanished" notice, and — since M4 — the
 * session store's subscription (which conversation is open, the search
 * query, the quota notice). Sidebar, AiModule and CenterChat are consumers
 * only — no prop drilling through the server page.
 *
 * Re-render discipline: the context value is
 * memoized, and a fresh status snapshot is committed **only when it differs
 * by value** — an unchanged 5 s poll causes zero re-renders. Conversation
 * text itself stays inside CenterChat so per-token updates never re-render
 * the sidebar or the model tree; the provider only carries the flags other
 * components need (streaming, chat-empty, an active pull). Pull progress is
 * committed at most every 100 ms because Ollama emits a line per layer
 * chunk — far faster than anyone can read a percentage. Session data lives
 * in `lib/history.ts`'s external store; this provider subscribes once and
 * derives the open-conversation id from it.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { historyStore, newSessionId, type ChatSession } from "@/lib/history";
import { isLlamaModel } from "@/lib/family";
import { feedChunk, parseJsonLine } from "@/lib/ndjson";
import type { OllamaStatus } from "@/lib/ollama-types";

const SELECTED_KEY = "las.selected.v1";

/** One `{"status", "digest", "total", "completed", "error"}` pull line. */
interface PullLine {
  status?: unknown;
  digest?: unknown;
  total?: unknown;
  completed?: unknown;
  error?: unknown;
}

/** Row 31 — the pull stream ended before Ollama finished the download. */
const CONNECTION_LOST =
  "Connection lost mid-download — Ollama will finish it next time you pull.";

/** Live progress of the one pull allowed at a time. */
export interface PullProgress {
  /** Tag being downloaded — the tree row and chat note key off it. */
  tag: string;
  /** 0–100 once Ollama reports layer totals, null while it hasn't. */
  percent: number | null;
  /** Ollama's own status word ("pulling manifest", "downloading", …). */
  status: string;
  /** The guide's size estimate — the only number shown before totals land. */
  pullSize: string;
}

export type PullNoteKind =
  /** Ollama's own failure message */
  | "error"
  /** the user cancelled */
  | "stopped"
  /** finished while the chat was busy */
  | "ready";

/** Terminal outcome of the last pull, rendered inline in its tree row. */
export interface PullNote {
  tag: string;
  kind: PullNoteKind;
  text: string;
}

export interface OllamaContext {
  /** `checking` until the first status response resolves. */
  phase: "checking" | "ready";
  /** Latest status; null only before the first response arrives. */
  status: OllamaStatus | null;
  /** Tag of the model that will answer, or null when none is installed. */
  selected: string | null;
  /** Previously-selected model that vanished from this machine. */
  removed: string | null;
  /**
   * M6 — a non-Llama model was offered as the selection (persisted pick or
   * an open session's model) and was refused: the name to explain in the
   * UI until the user picks a Llama model.
   */
  nonLlama: string | null;
  /**
   * Selection: user picks pass `{ restart: true }` to also mint a fresh
   * conversation (the model-change reset); programmatic switches —
   * session restore, pull auto-select — keep the open conversation.
   */
  select: (name: string, opts?: { restart?: boolean }) => void;
  /** Re-run the status poll now (Re-check button, after pulls). */
  refresh: () => void;
  /** True while a reply streams — consumers gate input on it (rows 32/38). */
  streaming: boolean;
  setStreaming: (value: boolean) => void;
  /** True while the open chat has no messages — gates the switch confirm. */
  chatEmpty: boolean;
  setChatEmpty: (value: boolean) => void;
  /** The single in-flight pull, or null (one at a time). */
  pulling: PullProgress | null;
  /** Outcome of the last finished pull (red error / stop / ready line). */
  pullNote: PullNote | null;
  /** Start pulling `tag`; `pullSize` is the guide's estimate. */
  startPull: (tag: string, pullSize: string) => void;
  /** Abort the pull fetch — Ollama keeps whatever layers it already wrote. */
  cancelPull: () => void;
  /** Persisted sessions; `null` until browser storage is read. */
  sessions: ChatSession[] | null;
  /** Which conversation is open — the latest session, or a specific id. */
  sessionChoice: "latest" | string;
  /** Id of the session the open conversation edits (derived from the store). */
  activeSessionId: string | null;
  /**
   * Row 36 — the open session's model is no longer on this machine: the
   * conversation stays readable but the composer waits for a model pick.
   * Single source of truth, so CenterChat's read-only state and the
   * picker's "any pick counts as the choice" rule can't drift apart.
   */
  removedSessionModel: string | null;
  /** Row click: open that session, adopting its model if still installed. */
  openSession: (id: string) => void;
  /** ＋ New chat / "Start new chat": a fresh, not-yet-saved conversation. */
  startNewChat: () => void;
  /** Sidebar search, filtering the `.histrow` list. */
  query: string;
  setQuery: (value: string) => void;
  /** The last save hit storage quota even after eviction. */
  saveError: boolean;
}

const OllamaContext = createContext<OllamaContext | null>(null);

export function useOllama(): OllamaContext {
  const value = useContext(OllamaContext);
  if (!value) {
    throw new Error("useOllama() must be used inside <ModelProvider>");
  }
  return value;
}

export default function ModelProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<"checking" | "ready">("checking");
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [removed, setRemoved] = useState<string | null>(null);
  const [nonLlama, setNonLlama] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [chatEmpty, setChatEmptyState] = useState(true);
  const [pulling, setPulling] = useState<PullProgress | null>(null);
  const [pullNote, setPullNote] = useState<PullNote | null>(null);

  // The session store: one subscription feeds the sidebar, CenterChat's
  // seed and the restore rule; `saveError` is the storage-quota notice.
  const sessions = useSyncExternalStore(
    historyStore.subscribe,
    historyStore.getSnapshot,
    historyStore.getServerSnapshot,
  );
  const saveError = useSyncExternalStore(
    historyStore.subscribe,
    historyStore.getSaveError,
    historyStore.getSaveErrorServerSnapshot,
  );
  const [query, setQuery] = useState("");
  /** "latest" until the user opens a row or starts a new chat. */
  const [sessionChoice, setSessionChoice] = useState<"latest" | string>(
    "latest",
  );
  /**
   * The session the open conversation edits. "latest" resolves against the
   * store (most recently updated first), so the id follows saves without a
   * remount; a chosen id may be newer than the store — the fresh-chat case.
   */
  const activeSessionId = useMemo(
    () =>
      sessionChoice !== "latest" ? sessionChoice : (sessions?.[0]?.id ?? null),
    [sessionChoice, sessions],
  );

  /**
   * Row 36, derived where both consumers can see it: the open session's
   * model is gone once status is known. `null` while storage or status is
   * still loading (nothing can be judged missing yet).
   */
  const removedSessionModel = useMemo(() => {
    if (sessions === null || status === null) return null;
    const seed = sessions.find((session) => session.id === activeSessionId);
    if (!seed) return null;
    return status.models.some((model) => model.name === seed.model)
      ? null
      : seed.model;
  }, [sessions, status, activeSessionId]);

  // Poll bookkeeping: `seq` ensures only the latest response is applied,
  // the controller lets a new poll supersede an in-flight one.
  const seqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const serializedRef = useRef<string>("");
  const selectedRef = useRef<string | null>(null);
  /** Mirrors `chatEmpty` for the pull callback without re-subscribing it. */
  const chatEmptyRef = useRef(true);
  /** The in-flight pull's controller — the provider's one-at-a-time lock. */
  const pullRef = useRef<AbortController | null>(null);
  /** Model-on-restore applies on the first status, never again. */
  const restoreRef = useRef(false);
  /** M6: a non-Llama pick was refused — don't silently auto-pick after it. */
  const blockedRef = useRef(false);

  /**
   * Selection core: mirror the ref, commit, clear the row-18 notice and
   * the M6 refusal, un-block auto-picking, and persist to
   * `las.selected.v1` in **sessionStorage** (M8: per-tab — two tabs may
   * hold different models; `localStorage` is only read as the legacy
   * fallback during restore).
   */
  const applySelection = useCallback((name: string) => {
    selectedRef.current = name;
    setSelected(name);
    setRemoved(null);
    setNonLlama(null);
    blockedRef.current = false;
    try {
      window.sessionStorage.setItem(SELECTED_KEY, name);
    } catch {
      // Selection persistence is best-effort; the session keeps working.
    }
  }, []);

  const refresh = useCallback((): Promise<void> => {
    const seq = ++seqRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    return fetch("/api/ollama/status", { cache: "no-store", signal: controller.signal })
      .then((response) =>
        response.ok
          ? (response.json() as Promise<OllamaStatus>)
          : Promise.reject(new Error(`status ${response.status}`)),
      )
      .then((next) => {
        if (seq !== seqRef.current) return; // a newer poll superseded us
        const serialized = JSON.stringify(next);
        if (serialized !== serializedRef.current) {
          serializedRef.current = serialized;
          setStatus(next);
        }
        setPhase("ready");
        // Model-on-restore, once: the newest session's model answers
        // the conversation restored with it — silently, if still installed
        // *and* usable for chat here (M6: a gemma session must not smuggle
        // gemma back into the selection — it gets the refusal notice).
        if (next.running && !restoreRef.current) {
          restoreRef.current = true;
          const model = historyStore.getSnapshot()?.[0]?.model;
          const restored =
            model === undefined
              ? undefined
              : next.models.find((m) => m.name === model);
          if (restored && isLlamaModel(restored.name, restored.families)) {
            applySelection(restored.name);
          } else if (restored) {
            setNonLlama(restored.name);
            blockedRef.current = true;
          }
        }
      })
      .catch((error: unknown) => {
        // Aborted/superseded polls are silent. A real failure keeps the last
        // known status and simply retries on the next tick — if we have
        // never succeeded, the pill honestly stays on "Checking…".
        if (error instanceof DOMException && error.name === "AbortError") return;
      });
  }, [applySelection]);

  // Mount + 5 s visibility-gated interval + window focus (returning from a
  // terminal where Ollama was started/stopped).
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") refresh();
    };
    refresh();
    const timer = window.setInterval(tick, 5000);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", refresh);
      abortRef.current?.abort();
    };
  }, [refresh]);

  // Selection reconciliation. Runs only when the status value changes.
  useEffect(() => {
    if (!status) return;
    // Models this app may chat with (M6) — the picker and every auto-pick
    // draw from this list, never from the raw machine inventory.
    const chatNames = status.models
      .filter((model) => isLlamaModel(model.name, model.families))
      .map((model) => model.name);
    const current = selectedRef.current;

    if (current !== null && chatNames.includes(current)) return; // rows 5/6
    if (!status.running) return; // unreachable — don't guess (rows 5/6)

    // M6: installed, but not a chat model for this app — refuse it, say so
    // by name, forget the persisted pick (both the tab's sessionStorage and
    // any legacy localStorage copy), and stay unselected until the
    // user chooses a chat model themselves.
    if (current !== null && status.models.some((m) => m.name === current)) {
      selectedRef.current = null;
      setSelected(null);
      setRemoved(null);
      setNonLlama(current);
      blockedRef.current = true;
      try {
        window.sessionStorage.removeItem(SELECTED_KEY);
        window.localStorage.removeItem(SELECTED_KEY);
      } catch {
        // Storage is best-effort; the in-memory refusal is what matters.
      }
      return;
    }

    // Running and the current selection is gone → the vanished-model notice.
    if (current !== null) setRemoved(current);

    // A deliberate refusal stays visible instead of being papered over by
    // the next auto-pick (M6): the user decides what replaces it.
    if (blockedRef.current) return;

    // M8: this tab's own pick survives reload but is never broadcast — two
    // tabs may hold different models. A pre-M8 profile's localStorage value
    // is adopted once as the legacy fallback (so an existing user's pick
    // isn't silently lost by the upgrade).
    let stored: string | null = null;
    try {
      stored = window.sessionStorage.getItem(SELECTED_KEY);
      if (stored === null) {
        stored = window.localStorage.getItem(SELECTED_KEY);
        if (stored !== null) {
          window.sessionStorage.setItem(SELECTED_KEY, stored);
        }
      }
    } catch {
      stored = null; // storage unavailable (private mode) — fall back silently
    }

    // M6: the persisted pick names a real model that isn't chat-usable
    // here — say so and forget it, rather than silently swapping it for
    // something else (the user should know their pick wasn't honored).
    if (
      stored !== null &&
      !chatNames.includes(stored) &&
      status.models.some((m) => m.name === stored)
    ) {
      setNonLlama(stored);
      blockedRef.current = true;
      try {
        window.sessionStorage.removeItem(SELECTED_KEY);
        window.localStorage.removeItem(SELECTED_KEY);
      } catch {
        // best-effort; the in-memory refusal is what the user sees
      }
      return;
    }

    const next =
      stored !== null && chatNames.includes(stored) ? stored : chatNames[0] ?? null;
    selectedRef.current = next;
    setSelected(next);
    if (next !== null) {
      try {
        window.sessionStorage.setItem(SELECTED_KEY, next);
      } catch {
        // Selection persistence is best-effort; the session keeps working.
      }
    }
  }, [status]);

  // M8 removed the row-19 cross-tab `storage` listener here: selection is
  // per-tab now (sessionStorage), so a pick in another tab must neither be
  // adopted nor echoed back. Tabs still share *history* via BroadcastChannel.

  const select = useCallback(
    (name: string, opts?: { restart?: boolean }) => {
      // M6's central guarantee: no call site — picker, guide row, session
      // restore, pull auto-select — can land a non-Llama model in the
      // selection. Refuse loudly instead of silently doing nothing.
      const installed = status?.models.find((m) => m.name === name);
      const usable =
        status === null
          ? isLlamaModel(name, null)
          : installed
            ? isLlamaModel(installed.name, installed.families)
            : isLlamaModel(name, null);
      if (!usable) {
        setNonLlama(name);
        blockedRef.current = true;
        return;
      }
      applySelection(name);
      // Reset rule: a user pick starts a fresh conversation — its
      // messages are already written by the save points. Programmatic
      // switches (restore, pull auto-select) pass nothing and keep it.
      if (opts?.restart) setSessionChoice(newSessionId());
    },
    [applySelection, status],
  );

  /** Row click: open that session, adopting its model if still installed. */
  const openSession = useCallback(
    (id: string) => {
      setSessionChoice(id);
      const session = historyStore.getSnapshot()?.find((s) => s.id === id);
      if (session && status?.models.some((m) => m.name === session.model)) {
        select(session.model); // silent programmatic pick — never a confirm
      }
    },
    [status, select],
  );

  const startNewChat = useCallback(
    () => setSessionChoice(newSessionId()),
    [],
  );

  /** Mirror for `chatEmpty` — the pull callback reads the live value. */
  const setChatEmpty = useCallback((value: boolean) => {
    chatEmptyRef.current = value;
    setChatEmptyState(value);
  }, []);

  const cancelPull = useCallback(() => {
    pullRef.current?.abort(); // aborts the proxy, which aborts Ollama
  }, []);

  /**
   * Pull `tag`: one at a time, aggregated progress across layers,
   * terminal outcome as an inline note on that guide's row. Success
   * refreshes the model list and auto-selects only when the chat is empty.
   */
  const startPull = useCallback(
    (tag: string, pullSize: string) => {
      if (pullRef.current) return; // one pull at a time
      const controller = new AbortController();
      pullRef.current = controller;
      setPullNote(null);
      setPulling({ tag, percent: null, status: "starting", pullSize });

      // Ollama reports one line per layer chunk (far faster than a human
      // reads a percentage), so commits are time-gated to every 100 ms.
      const layers = new Map<string, { total: number; completed: number }>();
      let statusText = "starting";
      let lastCommit = 0;
      /** Ollama ends every finished pull with {"status":"success"}. */
      let sawSuccess = false;

      const snapshot = (): PullProgress => {
        let total = 0;
        let completed = 0;
        for (const layer of layers.values()) {
          total += layer.total;
          completed += layer.completed;
        }
        return {
          tag,
          status: statusText,
          pullSize,
          // No totals yet → null: the bar renders indeterminate.
          percent: total > 0 ? Math.min(100, (completed / total) * 100) : null,
        };
      };

      const commit = (force = false) => {
        const now = Date.now();
        if (!force && now - lastCommit < 100) return;
        lastCommit = now;
        setPulling(snapshot());
      };

      /** One pull line → failure text, or null to keep reading. */
      const handleLine = (line: string): string | null => {
        const parsed = parseJsonLine<PullLine>(line);
        if (!parsed) return null; // blank or damaged line: never fatal
        if (typeof parsed.error === "string") return parsed.error;
        if (typeof parsed.status === "string") {
          if (parsed.status === "success") sawSuccess = true;
          // The bar carries digests; the status word stays human-readable.
          statusText =
            parsed.status.replace(/\s*sha256:[0-9a-f]+\b.*/, "").trim() ||
            parsed.status;
        }
        // Last write wins per digest.
        if (
          typeof parsed.digest === "string" &&
          typeof parsed.total === "number" &&
          typeof parsed.completed === "number"
        ) {
          layers.set(parsed.digest, {
            total: parsed.total,
            completed: parsed.completed,
          });
        }
        commit();
        return null;
      };

      void (async () => {
        let note: PullNote | null = null;
        let failure: string | null = null;
        try {
          const response = await fetch("/api/ollama/pull", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: tag, stream: true }),
            signal: controller.signal,
          });
          if (!response.ok) {
            // Ollama reports pull failures as {error} (404 for a tag that
            // doesn't exist, 500 for a broken registry answer).
            const body = (await response.json().catch(() => null)) as {
              error?: string;
            } | null;
            failure = body?.error ?? `Ollama refused the pull (HTTP ${response.status}).`;
          } else {
            const reader = response.body?.getReader();
            if (!reader) {
              failure = "the download stream was empty";
            } else {
              const decoder = new TextDecoder();
              let buffer = "";
              const drain = (lines: string[]): boolean => {
                for (const line of lines) {
                  const error = handleLine(line);
                  if (error !== null) {
                    failure = error;
                    return false;
                  }
                }
                return true;
              };
              read: for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                const fed = feedChunk(buffer, decoder.decode(value, { stream: true }));
                buffer = fed.rest;
                if (!drain(fed.lines)) break read;
              }
              if (failure) {
                await reader.cancel().catch(() => undefined);
              } else {
                const flush = feedChunk(buffer, decoder.decode());
                drain([...flush.lines, flush.rest]);
              }
            }
          }
        } catch (err) {
          note =
            err instanceof DOMException && err.name === "AbortError"
              ? {
                  // The layers already written stay on disk.
                  tag,
                  kind: "stopped",
                  text: "Download stopped. Ollama may pick it back up next time.",
                }
              : {
                  // Row 31 — transport drop, not Ollama's own failure.
                  tag,
                  kind: "error",
                  text: CONNECTION_LOST,
                };
        } finally {
          pullRef.current = null;
          setPulling(null);
        }

        if (note === null && failure !== null) {
          note = { tag, kind: "error", text: `Pull failed: ${failure}` };
        }
        if (note === null && !sawSuccess) {
          // The body ended without Ollama's success line — a stream that
          // stopped early is the same honest outcome as a dropped socket
          // a dropped socket, never a silent "it worked".
          note = { tag, kind: "error", text: CONNECTION_LOST };
        }
        if (note !== null) {
          setPullNote(note);
          return;
        }

        // Success: re-read tags, then auto-select only if the chat
        // is empty — otherwise offer the switch instead of hijacking it.
        void refresh().then(() => {
          if (chatEmptyRef.current) {
            select(tag);
          } else {
            setPullNote({
              tag,
              kind: "ready",
              text: "Ready — switch models from the picker.",
            });
          }
        });
      })();
    },
    [refresh, select],
  );

  const value = useMemo<OllamaContext>(
    () => ({
      phase,
      status,
      selected,
      removed,
      nonLlama,
      select,
      refresh,
      streaming,
      setStreaming,
      chatEmpty,
      setChatEmpty,
      pulling,
      pullNote,
      startPull,
      cancelPull,
      sessions,
      sessionChoice,
      activeSessionId,
      removedSessionModel,
      openSession,
      startNewChat,
      query,
      setQuery,
      saveError,
    }),
    [
      phase,
      status,
      selected,
      removed,
      nonLlama,
      select,
      refresh,
      streaming,
      chatEmpty,
      setChatEmpty,
      pulling,
      pullNote,
      startPull,
      cancelPull,
      sessions,
      sessionChoice,
      activeSessionId,
      removedSessionModel,
      openSession,
      startNewChat,
      query,
      saveError,
    ],
  );

  return <OllamaContext.Provider value={value}>{children}</OllamaContext.Provider>;
}
