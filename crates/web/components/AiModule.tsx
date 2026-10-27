"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { allModels, modelsInTier, tiers } from "@/data/models";
import { useOllama } from "@/components/ModelProvider";
import { isTextOnlyChat, matchInstalled } from "@/lib/match";
import { PullButton, PullNote, PullStatus, StarterCta } from "@/components/Pull";

const FOLDER_ICON = (
  <svg viewBox="0 0 24 24">
    <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
);

/** Bytes → human size for the picker ("4.9 GB", "1.9 GB", "512 MB"). */
function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${Math.round(bytes / 1e6)} MB`;
  return `${Math.max(1, Math.round(bytes / 1e3))} KB`;
}

export default function AiModule() {
  const {
    phase,
    status,
    selected,
    removed,
    removedSessionModel,
    select,
    streaming,
    chatEmpty,
  } = useOllama();
  const [menuOpen, setMenuOpen] = useState(false);
  /** Model awaiting confirmation before it replaces a chat with messages. */
  const [pending, setPending] = useState<string | null>(null);
  const [openTiers, setOpenTiers] = useState<string[]>(["30-70b"]);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Installed models this machine can actually chat with, by name.
  const models = status
    ? [...status.models].sort((a, b) => a.name.localeCompare(b.name))
    : [];
  const loaded = status?.loaded ?? [];
  // Guides this machine satisfies (§6 rules 1–3): chips, select-on-click
  // rows, and which guides offer a Pull button all key off it.
  const matches = useMemo(
    () => matchInstalled(status?.models ?? [], allModels),
    [status],
  );

  /** Pick from the menu: silent when the chat is empty, confirmed otherwise.
   *  Both paths restart — §5.5's model-change reset — and the messages are
   *  already written by the save points, so nothing is lost (§5.2).
   *
   *  Row 36 exception: while the open session's model is gone, re-picking
   *  the *already selected* model must not be a no-op — it is the "choose a
   *  model" the read-only composer waits for, and it has to work even when
   *  it's the only model on this machine. */
  function pick(name: string) {
    setMenuOpen(false);
    if (name === selected && removedSessionModel === null) return;
    if (chatEmpty && removedSessionModel === null) {
      select(name, { restart: true });
      return;
    }
    setPending(name);
  }

  // Close the model menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function toggleTier(id: string) {
    setOpenTiers((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  return (
    <aside className="panel rp" aria-label="AI module">
      <h2>AI Module</h2>

      <div className="modelwrap" ref={wrapRef}>
        <button
          type="button"
          className="model"
          id="model-picker"
          aria-expanded={menuOpen}
          aria-haspopup="listbox"
          disabled={phase === "checking" || streaming}
          title={streaming ? "Stop the reply first" : undefined}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {phase === "checking"
            ? "Checking…"
            : (selected ?? "No model selected")}{" "}
          <span aria-hidden="true">⌄</span>
        </button>
        {menuOpen && (
          <div className="modelmenu" role="listbox" aria-label="Model">
            {models.length === 0 && (
              <StarterCta onPullStart={() => setMenuOpen(false)} />
            )}
            {models.map((model) => (
              <button
                key={model.name}
                type="button"
                role="option"
                aria-selected={model.name === selected}
                onClick={() => pick(model.name)}
              >
                <span className="ck" aria-hidden="true">
                  {model.name === selected ? "✓" : null}
                </span>
                {model.name}
                <span className="meta">
                  {formatSize(model.size)}
                  {loaded.includes(model.name) ? " · loaded" : ""}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <PullStatus />

      {pending && (
        <div className="switchbox">
          <span>
            Switch to {pending}? Your current chat stays as its own session.
          </span>
          <span className="row">
            <button
              type="button"
              className="btn"
              onClick={() => {
                select(pending, { restart: true });
                setPending(null);
              }}
            >
              Switch
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setPending(null)}
            >
              Cancel
            </button>
          </span>
        </div>
      )}

      {removed && (
        <p className="oremove">
          {removed} was removed — pick another model.
        </p>
      )}

      <p className="desc">
        Browse the Llama family below. Models you&apos;ve installed show ✓ and
        can be selected; the rest can be pulled in one click.
      </p>

      <div className="ph">Models</div>

      <div className="tree">
        {tiers.map((tier) => {
          const guides = modelsInTier(tier.id);
          const isOpen = openTiers.includes(tier.id);
          return (
            <div key={tier.id}>
              <button
                type="button"
                className={`f${isOpen ? " on" : ""}`}
                aria-expanded={isOpen}
                onClick={() => toggleTier(tier.id)}
              >
                {FOLDER_ICON}
                {tier.label}
                <span className="cnt">{guides.length}</span>
              </button>
              {isOpen && (
                <ul className="sub">
                  {guides.map((m) => {
                    const matched = matches.get(m.slug);
                    return (
                      <li key={m.slug} className="trow">
                        {matched ? (
                          // Installed → the row itself starts a chat with it
                          // (confirm first when the current one has messages).
                          <button
                            type="button"
                            className="tname sel"
                            disabled={streaming}
                            aria-disabled={streaming}
                            title={
                              streaming
                                ? "Stop the reply first"
                                : `Chat with ${matched[0]}`
                            }
                            onClick={() => pick(matched[0])}
                          >
                            {m.name}
                          </button>
                        ) : (
                          <Link className="tname" href={`/llama/${m.slug}`} prefetch>
                            {m.name}
                          </Link>
                        )}
                        {matched && (
                          <span className="chip">
                            ✓ installed
                            {isTextOnlyChat(m) ? " (text chat)" : ""}
                          </span>
                        )}
                        {matched ? (
                          // The guide stays reachable next to the chip.
                          <Link
                            className="guide"
                            href={`/llama/${m.slug}`}
                            title="Open the guide"
                            aria-label={`Guide for ${m.name}`}
                          >
                            ↗
                          </Link>
                        ) : m.ollamaTag ? (
                          <PullButton guide={m} />
                        ) : null}
                        <PullNote tag={m.ollamaTag} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <p className="desc">
        Not sure where to start?{" "}
        <Link href="/llama" style={{ color: "var(--g)" }}>
          Open the full directory →
        </Link>
      </p>
    </aside>
  );
}
