"use client";

import { useState } from "react";
import Link from "next/link";
import {
  filterSessions,
  formatRelative,
  historyStore,
  type ChatSession,
} from "@/lib/history";
import { useOllama } from "@/components/ModelProvider";
import Modal from "@/components/Modal";
import OllamaStatus from "@/components/OllamaStatus";
import SystemInfo from "@/components/SystemInfo";

/**
 * Sidebar navigation. Deliberately short: every entry must lead somewhere
 * that exists. The original four-item list shipped two doors to rooms the
 * app doesn't have ("Dashboard", "Plugins") and a "Library" that did
 * nothing when clicked — dead nav is worse than no nav, so only the two
 * real destinations stay: this chat page and the model library at /llama.
 */
const NAV_ITEMS: {
  label: string;
  href: string;
  current?: boolean;
  svg: React.ReactNode;
}[] = [
  {
    label: "AI Chat",
    href: "/",
    current: true,
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-5 4V5a1 1 0 0 1 0-1z" />
      </svg>
    ),
  },
  {
    label: "Library",
    href: "/llama",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const {
    sessions,
    activeSessionId,
    openSession,
    startNewChat,
    query,
    setQuery,
    streaming,
    saveError,
  } = useOllama();
  const [open, setOpen] = useState(false);
  /** Which row is waiting for its inline delete confirmation, if any. */
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  /** The typed-confirm wipe dialog (M7). */
  const [wipeOpen, setWipeOpen] = useState(false);
  const [wipeWord, setWipeWord] = useState("");

  // Typing in the search box auto-opens the session list.
  const effectiveOpen = open || query.trim().length > 0;

  const hydrated = sessions !== null;
  const matches = filterSessions(sessions ?? [], query);

  /** Download the current history as readable JSON (M7). */
  function exportHistory() {
    const blob = new Blob([JSON.stringify(sessions ?? [], null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chat-history-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** Row ✕ → inline confirm. Deleting the open chat starts a fresh one. */
  function confirmDelete(session: ChatSession) {
    setPendingDelete(null);
    const wasActive = session.id === activeSessionId;
    historyStore.deleteSession(session.id);
    // The open conversation would keep its messages on screen and re-save
    // them at the next write point — a fresh chat is the honest outcome.
    if (wasActive) startNewChat();
  }

  /** Typed-confirm wipe: clear the DB and start a fresh chat. */
  function confirmWipe() {
    historyStore.deleteAll();
    startNewChat();
    setWipeOpen(false);
    setWipeWord("");
  }

  function closeWipe() {
    setWipeOpen(false);
    setWipeWord("");
  }

  return (
    <aside className="panel side" aria-label="Sidebar">
      <div className="brand">
        <span className="logo">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff">
            <path d="M12 3 2 21h6l4-7 4 7h6z" opacity=".9" />
          </svg>
        </span>
        Local AI Server
      </div>

      <label className="search">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4-4" />
        </svg>
        <input
          placeholder="Search chat sessions…"
          aria-label="Search chat sessions"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      <div className="lbl">FEATURES</div>
      <nav className="nav" aria-label="Features">
        {NAV_ITEMS.map((item) =>
          item.current ? (
            <span
              key={item.label}
              className="item on"
              aria-current="page"
            >
              {item.svg}
              {item.label}
            </span>
          ) : (
            <Link key={item.label} href={item.href} className="item">
              {item.svg}
              {item.label}
            </Link>
          ),
        )}
      </nav>

      {/* System info sits directly above OLLAMA (§9 M5) — same row shape,
          a dialog instead of an inline expansion. */}
      <SystemInfo />

      <OllamaStatus />

      <div className="lbl">CHAT HISTORY</div>
      <button
        type="button"
        className="histbtn"
        aria-label="New chat"
        disabled={streaming}
        aria-disabled={streaming}
        title={streaming ? "Stop the reply first" : undefined}
        onClick={startNewChat}
      >
        ＋ New chat
      </button>
      <button
        type="button"
        className="histbtn"
        aria-expanded={effectiveOpen}
        onClick={() => setOpen((v) => !v)}
      >
        AI History
        <span className="chev" aria-hidden="true">
          {effectiveOpen ? "︿" : "﹀"}
        </span>
      </button>

      {effectiveOpen && (
        <>
          <p className="histnote">
            {!hydrated ? (
              "…"
            ) : query.trim() ? (
              <>
                <strong>
                  {matches.length} of {sessions.length}
                </strong>{" "}
                sessions matching &quot;{query.trim()}&quot;
              </>
            ) : (
              <>
                <strong>
                  {sessions.length} session{sessions.length === 1 ? "" : "s"}
                </strong>{" "}
                — saved on this machine
              </>
            )}
          </p>
          {saveError && (
            <p className="saveerr">
              Couldn&apos;t save that change to chat history — your messages
              stay on screen; it will be retried on the next save.
            </p>
          )}
          {hydrated && sessions.length === 0 && !query.trim() && (
            <p className="histnote">
              No chats yet — messages you send are saved on this machine.
            </p>
          )}
          {hydrated && matches.length === 0 && query.trim() && (
            <p className="histnote">
              No sessions match &quot;{query.trim()}&quot;.
            </p>
          )}
          {hydrated && matches.length > 0 && (
            <div className="histlist">
              {matches.map((session) => (
                <div
                  key={session.id}
                  className={`histrow${session.id === activeSessionId ? " on" : ""}`}
                >
                  <button
                    type="button"
                    className="histopen"
                    aria-current={
                      session.id === activeSessionId ? "true" : undefined
                    }
                    disabled={streaming}
                    aria-disabled={streaming}
                    title={streaming ? "Stop the reply first" : undefined}
                    onClick={() => openSession(session.id)}
                  >
                    <span className="htitle">{session.title}</span>
                    <span className="hmeta">
                      {session.model} · {formatRelative(session.updated_at)} ·{" "}
                      {session.message_count} message
                      {session.message_count === 1 ? "" : "s"}
                    </span>
                  </button>
                  {pendingDelete === session.id ? (
                    <span className="hconfirm">
                      <button
                        type="button"
                        className="btn danger"
                        onClick={() => confirmDelete(session)}
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setPendingDelete(null)}
                      >
                        Keep
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="hdel"
                      aria-label={`Delete chat “${session.title}”`}
                      title="Delete this chat"
                      disabled={streaming}
                      aria-disabled={streaming}
                      onClick={() => setPendingDelete(session.id)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {hydrated && sessions.length > 0 && (
            <div className="hactions">
              <button type="button" className="btn" onClick={exportHistory}>
                Export JSON
              </button>
              <button
                type="button"
                className="btn danger"
                disabled={streaming}
                aria-disabled={streaming}
                title={streaming ? "Stop the reply first" : undefined}
                onClick={() => setWipeOpen(true)}
              >
                Delete all
              </button>
            </div>
          )}
        </>
      )}

      {wipeOpen && (
        <Modal title="Delete all history" onClose={closeWipe}>
          <p className="omodal-p">
            Every saved chat on this machine will be deleted — this
            can&apos;t be undone. Export JSON first if you want a copy.
          </p>
          <p className="omodal-p">
            Type <strong>DELETE</strong> to confirm.
          </p>
          <input
            className="wipeinput"
            value={wipeWord}
            onChange={(event) => setWipeWord(event.target.value)}
            placeholder="DELETE"
            aria-label="Type DELETE to confirm"
            autoFocus
          />
          <div className="oact">
            <button
              type="button"
              className="btn danger"
              disabled={wipeWord !== "DELETE"}
              onClick={confirmWipe}
            >
              Delete everything
            </button>
            <button type="button" className="btn" onClick={closeWipe}>
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </aside>
  );
}
