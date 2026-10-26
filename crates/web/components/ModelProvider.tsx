"use client";

/**
 * Single client-side owner of Ollama state for the whole home screen:
 * the status poll (mount + 5 s visibility-gated + focus + Re-check), the
 * selected model, and the "model vanished" notice. Sidebar, AiModule and
 * CenterChat are consumers only — no prop drilling through the server page.
 *
 * Re-render discipline (CONNECTIVITY_PLAN §11.3): the context value is
 * memoized, and a fresh status snapshot is committed **only when it differs
 * by value** — an unchanged 5 s poll causes zero re-renders. Conversation
 * text itself stays inside CenterChat so per-token updates never re-render
 * the sidebar or the model tree; the provider only carries the flags other
 * components need (streaming, chat-empty, an active pull). Pull progress is
 * committed at most every 100 ms because Ollama emits a line per layer
 * chunk — far faster than anyone can read a percentage. M4 adds the
 * session store here; nothing unused ships before then.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
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

/** Live progress of the one pull allowed at a time (§5.4). */
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
  /** row 13 — Ollama's own failure message */
  | "error"
  /** row 14 — the user cancelled */
  | "stopped"
  /** row 16 — finished while the chat was busy */
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
  /** Previously-selected model that vanished from this machine (row 18). */
  removed: string | null;
  /** User-initiated pick: sets selection, persists it, clears `removed`. */
  select: (name: string) => void;
  /** Re-run the status poll now (Re-check button, after pulls). */
  refresh: () => void;
  /** True while a reply streams — consumers gate input on it (rows 32/38). */
  streaming: boolean;
  setStreaming: (value: boolean) => void;
  /** True while the open chat has no messages — gates the switch confirm. */
  chatEmpty: boolean;
  setChatEmpty: (value: boolean) => void;
  /** The single in-flight pull, or null (one at a time — row 17). */
  pulling: PullProgress | null;
  /** Outcome of the last finished pull (red error / stop / ready line). */
  pullNote: PullNote | null;
  /** Start pulling `tag`; `pullSize` is the guide's estimate (§5.4). */
  startPull: (tag: string, pullSize: string) => void;
  /** Abort the pull fetch — Ollama keeps whatever layers it already wrote. */
  cancelPull: () => void;
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
  const [streaming, setStreaming] = useState(false);
  const [chatEmpty, setChatEmptyState] = useState(true);
  const [pulling, setPulling] = useState<PullProgress | null>(null);
  const [pullNote, setPullNote] = useState<PullNote | null>(null);

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
      })
      .catch((error: unknown) => {
        // Aborted/superseded polls are silent. A real failure keeps the last
        // known status and simply retries on the next tick — if we have
        // never succeeded, the pill honestly stays on "Checking…".
        if (error instanceof DOMException && error.name === "AbortError") return;
      });
  }, []);

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
    const names = status.models.map((model) => model.name);
    const current = selectedRef.current;

    if (current && names.includes(current)) return; // still installed (rows 5/6)
    if (!status.running) return; // unreachable — don't guess (rows 5/6)

    // Running and the current selection is gone → row 18 notice.
    if (current !== null) setRemoved(current);

    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(SELECTED_KEY);
    } catch {
      stored = null; // storage unavailable (private mode) — fall back silently
    }
    const next = stored !== null && names.includes(stored) ? stored : names[0] ?? null;
    selectedRef.current = next;
    setSelected(next);
    if (next !== null) {
      try {
        window.localStorage.setItem(SELECTED_KEY, next);
      } catch {
        // Selection persistence is best-effort; the session keeps working.
      }
    }
  }, [status]);

  const select = useCallback((name: string) => {
    selectedRef.current = name;
    setSelected(name);
    setRemoved(null);
    try {
      window.localStorage.setItem(SELECTED_KEY, name);
    } catch {
      // best-effort
    }
  }, []);

  /** Mirror for `chatEmpty` — the pull callback reads the live value. */
  const setChatEmpty = useCallback((value: boolean) => {
    chatEmptyRef.current = value;
    setChatEmptyState(value);
  }, []);

  const cancelPull = useCallback(() => {
    pullRef.current?.abort(); // §3.5 — aborts the proxy, which aborts Ollama
  }, []);

  /**
   * Pull `tag` (§5.4): one at a time, aggregated progress across layers,
   * terminal outcome as an inline note on that guide's row. Success
   * refreshes the model list and auto-selects only when the chat is empty.
   */
  const startPull = useCallback(
    (tag: string, pullSize: string) => {
      if (pullRef.current) return; // row 17 — one pull at a time
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
          // No totals yet → null: the bar renders indeterminate (§5.4).
          percent: total > 0 ? Math.min(100, (completed / total) * 100) : null,
        };
      };

      const commit = (force = false) => {
        const now = Date.now();
        if (!force && now - lastCommit < 100) return;
        lastCommit = now;
        setPulling(snapshot());
      };

      /** One pull line → failure text (row 13), or null to keep reading. */
      const handleLine = (line: string): string | null => {
        const parsed = parseJsonLine<PullLine>(line);
        if (!parsed) return null; // blank or damaged line: never fatal (row 29)
        if (typeof parsed.error === "string") return parsed.error;
        if (typeof parsed.status === "string") {
          if (parsed.status === "success") sawSuccess = true;
          // The bar carries digests; the status word stays human-readable.
          statusText =
            parsed.status.replace(/\s*sha256:[0-9a-f]+\b.*/, "").trim() ||
            parsed.status;
        }
        // Last write wins per digest (§5.4).
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
                  // Row 14 + §8 — the layers already written stay on disk.
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
          // (row 31), never a silent "it worked".
          note = { tag, kind: "error", text: CONNECTION_LOST };
        }
        if (note !== null) {
          setPullNote(note);
          return;
        }

        // Success (§5.4): re-read tags, then auto-select only if the chat
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
    }),
    [
      phase,
      status,
      selected,
      removed,
      select,
      refresh,
      streaming,
      chatEmpty,
      setChatEmpty,
      pulling,
      pullNote,
      startPull,
      cancelPull,
    ],
  );

  return <OllamaContext.Provider value={value}>{children}</OllamaContext.Provider>;
}
