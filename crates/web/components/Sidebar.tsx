"use client";

import { useState } from "react";
import { filterSessions, formatRelative } from "@/lib/history";
import { useOllama } from "@/components/ModelProvider";
import OllamaStatus from "@/components/OllamaStatus";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
      </svg>
    ),
  },
  {
    label: "AI Chat",
    current: true,
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-5 4V5a1 1 0 0 1 0-1z" />
      </svg>
    ),
  },
  {
    label: "Library",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z" />
      </svg>
    ),
  },
  {
    label: "Plugins",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
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

  // Typing in the search box auto-opens the raw JSON view.
  const effectiveOpen = open || query.trim().length > 0;

  const hydrated = sessions !== null;
  const matches = filterSessions(sessions ?? [], query);

  // The <pre> is never search-scoped (§5.5): it shows the open session's
  // JSON, or the honest empty/zero-result/skeleton states (row 37). An
  // empty query returns every session, so zero matches implies a query.
  const json = !hydrated
    ? "…"
    : sessions.length === 0
      ? "// No chats yet — messages you send are saved in this browser only.\n[]"
      : matches.length === 0
        ? `// No sessions match "${query.trim()}".`
        : JSON.stringify(
            sessions.find((s) => s.id === activeSessionId) ?? sessions[0],
            null,
            2,
          );

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
        {NAV_ITEMS.map((item) => (
          <span
            key={item.label}
            className={`item${item.current ? " on" : ""}`}
            aria-current={item.current ? "page" : undefined}
          >
            {item.svg}
            {item.label}
          </span>
        ))}
      </nav>

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
          <p className="jsonmeta">
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
                — stored in this browser
              </>
            )}
          </p>
          {saveError && (
            <p className="saveerr">
              Couldn&apos;t save this chat (browser storage is full).
            </p>
          )}
          {hydrated && matches.length > 0 && (
            <div className="histlist">
              {matches.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  className={`histrow${session.id === activeSessionId ? " on" : ""}`}
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
                    {session.model} · {formatRelative(session.updated_at)}
                  </span>
                </button>
              ))}
            </div>
          )}
          <pre className="json" tabIndex={0} aria-label="Chat history as JSON">
            {json}
          </pre>
        </>
      )}
    </aside>
  );
}
