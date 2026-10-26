"use client";

import { useEffect, useRef, useState } from "react";
import { useOllama } from "@/components/ModelProvider";
import { StarterCta } from "@/components/Pull";
import { feedChunk, parseJsonLine } from "@/lib/ndjson";

interface Bubble {
  role: "user" | "assistant";
  text: string;
  /** Partial answer of a failed stream — kept on screen, never sent back. */
  failed?: boolean;
  /** Reply the user cut short with Stop — real text, shown as "stopped". */
  stopped?: boolean;
}

/** One NDJSON line from POST /api/ollama/chat (Ollama's streaming contract). */
interface StreamLine {
  message?: { content?: unknown };
  error?: unknown;
}

type ErrorKind =
  /** transport/validation failure before or during the stream */
  | "send"
  /** Ollama's own {"error"} line (bad tag, server-side failure) */
  | "stream"
  /** HTTP 413 — payload over the proxy's 1 MiB guard rail (row 30) */
  | "tooLong"
  /** context window exceeded — retrying the same payload fails again */
  | "overflow";

interface ChatError {
  kind: ErrorKind;
  text: string;
}

/** Ollama words context-length failures as {"error": "... context ..."} */
function isOverflow(text: string): boolean {
  return /context|too long|length|exceed/i.test(text);
}

/**
 * The chat pane's inner view: it owns the conversation and the streaming
 * pipeline (CONNECTIVITY_PLAN §5.3): guarded send, split-safe NDJSON
 * parsing via `lib/ndjson`, Stop via AbortController, warm-up line, and the
 * honest error states from the §7 matrix. The provider only carries the
 * coordination flags (streaming, chat-empty, an active pull) so other
 * panels can gate on them.
 *
 * `CenterChat` remounts this component with `key={selected}`, so changing
 * model starts a fresh conversation without a reset-effect (§5.5) — the
 * same signal also covers a model that vanished from the machine.
 */
function Conversation() {
  const {
    phase,
    status,
    selected,
    refresh,
    streaming,
    setStreaming,
    setChatEmpty,
    pulling,
  } = useOllama();
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Bubble[]>([]);
  const [error, setError] = useState<ChatError | null>(null);
  const [warming, setWarming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  /** Exactly what the last send transmitted — what Retry resends. */
  const payloadRef = useRef<Array<{ role: string; content: string }>>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const installed = status?.models.map((model) => model.name) ?? [];
  const canSend =
    phase === "ready" &&
    status !== null &&
    status.running &&
    selected !== null &&
    installed.includes(selected);

  // A conversation must never outlive its component: if the model changes
  // while a reply streams, the unmount cancels the read instead of letting
  // it write into state nobody renders.
  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  // Mirror the message count for other panels (switch confirm, rows 32/38).
  useEffect(() => {
    setChatEmpty(messages.length === 0);
  }, [messages.length, setChatEmpty]);

  // Keep the newest message in view whenever the conversation grows.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function append(content: string) {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === "assistant") {
        return [
          ...prev.slice(0, -1),
          { ...last, text: last.text + content, failed: false },
        ];
      }
      return [...prev, { role: "assistant", text: content }];
    });
  }

  function run(payload: Array<{ role: string; content: string }>) {
    const controller = new AbortController();
    abortRef.current = controller;
    payloadRef.current = payload;
    setStreaming(true);
    setError(null);
    const warm = selected !== null && !(status?.loaded ?? []).includes(selected);
    setWarming(warm);

    // Whether *this* run has appended reply text — Stop may only mark the
    // reply it actually cut short, never an earlier, completed one (row 28).
    let producedText = false;
    let loggedBadLine = false;

    const handleLine = (line: string) => {
      const parsed = parseJsonLine<StreamLine>(line);
      if (!parsed) {
        // Blank lines are normal framing; a damaged one is logged once per
        // stream and skipped — it must never kill the reply (row 29).
        if (line.trim().length > 0 && !loggedBadLine) {
          loggedBadLine = true;
          console.warn("CenterChat: skipping a malformed stream line");
        }
        return;
      }
      if (typeof parsed.error === "string") {
        setError(
          isOverflow(parsed.error)
            ? { kind: "overflow", text: parsed.error }
            : { kind: "stream", text: parsed.error },
        );
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === "assistant") {
            return [...prev.slice(0, -1), { ...last, failed: true }];
          }
          return prev;
        });
        return;
      }
      const content = parsed.message?.content;
      if (typeof content === "string" && content.length > 0) {
        producedText = true;
        setWarming(false);
        append(content);
      }
    };

    fetch("/api/ollama/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: selected, messages: payload }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          const text = body?.error ?? "Couldn't reach the model.";
          setError(
            response.status === 413
              ? { kind: "tooLong", text }
              : isOverflow(text)
                ? { kind: "overflow", text }
                : { kind: "send", text },
          );
          return;
        }
        const reader = response.body?.getReader();
        if (!reader) {
          setError({ kind: "stream", text: "The reply stream was empty." });
          return;
        }
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const fed = feedChunk(buffer, decoder.decode(value, { stream: true }));
          buffer = fed.rest;
          fed.lines.forEach(handleLine);
        }
        const flush = feedChunk(buffer, decoder.decode());
        [...flush.lines, flush.rest].forEach(handleLine);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") {
          // Row 28: Stop keeps the partial text, no error line, no Retry.
          // Stopped before the first token? Then this run wrote no bubble
          // and the previous reply must stay unmarked.
          if (producedText) {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === "assistant") {
                return [...prev.slice(0, -1), { ...last, stopped: true }];
              }
              return prev;
            });
          }
          return;
        }
        setError({ kind: "send", text: "The connection to Ollama was lost." });
      })
      .finally(() => {
        abortRef.current = null;
        setWarming(false);
        setStreaming(false);
        refresh(); // re-read /api/ps so the next send knows it is warm
      });
  }

  function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || streaming || !canSend) return; // rows 12/25
    const payload = [
      ...messages
        .filter((m) => !m.failed)
        .map((m) => ({ role: m.role, content: m.text })),
      { role: "user", content: text },
    ];
    setMessages((prev) => [...prev, { role: "user", text }]);
    setDraft("");
    run(payload);
  }

  function stop() {
    abortRef.current?.abort();
  }

  function startNewChat() {
    setMessages([]);
    setError(null);
    setWarming(false);
  }

  const noModels = status !== null && status.running && installed.length === 0;
  const down = status !== null && !status.running;

  /**
   * Expand + scroll to the sidebar's OLLAMA section (row 1, position-neutral).
   * Keyed by id — `.histbtn` is shared with the AI History toggle (and the
   * future "＋ New chat" control), so a class query would be order-dependent.
   */
  function goToOllama() {
    const header = document.getElementById("ollama-section");
    if (!(header instanceof HTMLButtonElement)) return;
    if (header.getAttribute("aria-expanded") !== "true") header.click();
    header.scrollIntoView({ block: "nearest" });
  }

  const placeholder =
    phase === "checking"
      ? "Checking Ollama…"
      : down
        ? "Ollama isn't running — start it from the Ollama section in the sidebar."
        : noModels
          ? "No models on this machine yet."
          : !canSend
            ? "Pick a model to chat."
            : "Message the local model…";

  const composerDisabled = phase !== "ready" || !canSend;

  return (
    <main className="main">
      <h1>Chat with local models</h1>
      <p>
        A private chat that runs entirely on your own machine — no cloud, no
        accounts, no data leaves this device.
      </p>

      <section className="chat" aria-label="Conversation">
        {down && (
          <button type="button" className="chatnotice" onClick={goToOllama}>
            Ollama isn&apos;t running — start it from the Ollama section in the
            sidebar.
          </button>
        )}

        {messages.length === 0 ? (
          <div className="empty">
            <span className="ring" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#7dff91">
                <path d="M12 3 2 21h6l4-7 4 7h6z" />
              </svg>
            </span>
            <b>No messages yet</b>
            {noModels ? (
              <StarterCta />
            ) : (
              <p>
                Pick a model and say hi — replies stream live from your
                machine.
              </p>
            )}
          </div>
        ) : (
          <div className="msgs" ref={scrollRef}>
            {messages.map((m, i) => (
              <div
                key={i}
                className={`bub${m.role === "user" ? " me" : ""}`}
              >
                <span className="who">
                  {m.role === "user"
                    ? "You"
                    : `${selected ?? "model"}${m.stopped ? " · stopped" : ""}`}
                </span>
                {m.text}
              </div>
            ))}
          </div>
        )}

        {pulling && (
          <p className="pullnote" role="status">
            A model is downloading in the background.
          </p>
        )}

        {warming && (
          <p className="warm" role="status">
            Warming up {selected} — the first reply takes a few seconds.
          </p>
        )}

        {error && (
          <div className="errbox" role="alert">
            <p>
              {error.kind === "overflow"
                ? "This chat is too long for the model's memory. Start a new chat."
                : error.kind === "tooLong"
                  ? "This chat is too long to send — start a new chat."
                  : error.text}
            </p>
            <div className="erracts">
              {error.kind === "send" || error.kind === "stream" ? (
                <button
                  type="button"
                  className="btn"
                  onClick={() => run(payloadRef.current)}
                >
                  Retry
                </button>
              ) : null}
              <button type="button" className="btn" onClick={startNewChat}>
                Start new chat
              </button>
            </div>
          </div>
        )}

        <form className="in" onSubmit={send}>
          <input
            placeholder={placeholder}
            aria-label="Message"
            aria-disabled={composerDisabled}
            disabled={composerDisabled}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          {streaming ? (
            <button
              className="send stop"
              aria-label="Stop"
              type="button"
              onClick={stop}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff">
                <rect x="5" y="5" width="14" height="14" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              className="send"
              aria-label="Send"
              type="submit"
              aria-disabled={composerDisabled}
              disabled={composerDisabled}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff">
                <path d="M3 3l18 8-8 3-3 8z" />
              </svg>
            </button>
          )}
        </form>

        <p className="note">
          Local AI Server runs fully offline. Responses come from models you
          installed yourself with Ollama.
        </p>
      </section>
    </main>
  );
}

/**
 * Keyed wrapper: picking another model mounts a brand-new conversation, so
 * the old one can never be written into (§5.5 — model change starts a new
 * conversation) and no reset-effect is needed.
 */
export default function CenterChat() {
  const { selected } = useOllama();
  return <Conversation key={selected ?? "no-model"} />;
}
