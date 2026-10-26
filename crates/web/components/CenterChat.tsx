"use client";

import { useEffect, useRef, useState } from "react";

interface Bubble {
  role: "user" | "assistant";
  text: string;
}

const CANNED_REPLY =
  "This is a UI-only demo: no model is running and nothing left your machine. " +
  "In the full Local AI Server, this reply would stream from the llama model served by ollama.";

export default function CenterChat() {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Bubble[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view whenever the conversation grows.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", text },
      { role: "assistant", text: CANNED_REPLY },
    ]);
    setDraft("");
  }

  return (
    <main className="main">
      <h1>Chat with local models via ollama</h1>
      <p>
        A private chat that runs entirely on your own machine — no cloud, no
        accounts, no data leaves this device.
      </p>

      <section className="chat" aria-label="Conversation">
        {messages.length === 0 ? (
          <div className="empty">
            <span className="ring" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#7dff91">
                <path d="M12 3 2 21h6l4-7 4 7h6z" />
              </svg>
            </span>
            <b>No messages yet</b>
            <p>
              Ask anything below. Your messages stay on this computer, served by
              ollama — the dropdown on the right picks which local model answers.
            </p>
          </div>
        ) : (
          <div className="msgs" ref={scrollRef}>
            {messages.map((m, i) => (
              <div
                key={i}
                className={`bub${m.role === "user" ? " me" : ""}`}
              >
                <span className="who">{m.role === "user" ? "You" : "llama"}</span>
                {m.text}
              </div>
            ))}
          </div>
        )}

        <form className="in" onSubmit={send}>
          <input
            placeholder="Message the local model…"
            aria-label="Message"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button className="send" aria-label="Send" type="submit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff">
              <path d="M3 3l18 8-8 3-3 8z" />
            </svg>
          </button>
        </form>

        <p className="note">
          Local AI Server runs fully offline. Responses come from models you
          installed yourself with ollama.
        </p>
      </section>
    </main>
  );
}
