"use client";

/**
 * Single client-side owner of Ollama state for the whole home screen:
 * the status poll (mount + 5 s visibility-gated + focus + Re-check), the
 * selected model, and the "model vanished" notice. Sidebar, AiModule and
 * CenterChat are consumers only — no prop drilling through the server page.
 *
 * Re-render discipline (CONNECTIVITY_PLAN §11.3): the context value is
 * memoized, and a fresh status snapshot is committed **only when it differs
 * by value** — an unchanged 5 s poll causes zero re-renders.
 * Fields are added here as later milestones need them (pull state at M3,
 * sessions at M4); nothing unused ships before then.
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
import type { OllamaStatus } from "@/lib/ollama-types";

const SELECTED_KEY = "las.selected.v1";

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

  // Poll bookkeeping: `seq` ensures only the latest response is applied,
  // the controller lets a new poll supersede an in-flight one.
  const seqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const serializedRef = useRef<string>("");
  const selectedRef = useRef<string | null>(null);

  const refresh = useCallback(() => {
    const seq = ++seqRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    fetch("/api/ollama/status", { cache: "no-store", signal: controller.signal })
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

  const value = useMemo<OllamaContext>(
    () => ({ phase, status, selected, removed, select, refresh }),
    [phase, status, selected, removed, select, refresh],
  );

  return <OllamaContext.Provider value={value}>{children}</OllamaContext.Provider>;
}
