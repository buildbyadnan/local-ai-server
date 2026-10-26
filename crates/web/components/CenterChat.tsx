"use client";

import { useOllama } from "@/components/ModelProvider";

/**
 * The chat pane. M1 scope (CONNECTIVITY_PLAN §9): the canned reply is gone
 * and the composer is disabled with an honest placeholder — real streaming
 * lands in M2, so there is deliberately no send path and no message list
 * yet; both arrive with the streaming pipeline.
 */
export default function CenterChat() {
  const { phase } = useOllama();

  return (
    <main className="main">
      <h1>Chat with local models</h1>
      <p>
        A private chat that runs entirely on your own machine — no cloud, no
        accounts, no data leaves this device.
      </p>

      <section className="chat" aria-label="Conversation">
        <div className="empty">
          <span className="ring" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#7dff91">
              <path d="M12 3 2 21h6l4-7 4 7h6z" />
            </svg>
          </span>
          <b>No messages yet</b>
          <p>
            Your messages stay on this computer. The models installed on this
            machine are listed in the model picker.
          </p>
        </div>

        <form className="in" onSubmit={(e) => e.preventDefault()}>
          <input
            placeholder={
              phase === "checking"
                ? "Checking Ollama…"
                : "Chat lands next — pick a model to get ready."
            }
            aria-label="Message"
            aria-disabled="true"
            disabled
          />
          <button
            className="send"
            aria-label="Send"
            aria-disabled="true"
            type="submit"
            disabled
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff">
              <path d="M3 3l18 8-8 3-3 8z" />
            </svg>
          </button>
        </form>

        <p className="note">
          Local AI Server runs fully offline. Responses come from models you
          installed yourself with Ollama.
        </p>
      </section>
    </main>
  );
}
