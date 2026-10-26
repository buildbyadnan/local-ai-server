"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { modelsInTier, tiers } from "@/data/models";
import { useOllama } from "@/components/ModelProvider";

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

  /** Pick from the menu: silent when the chat is empty, confirmed otherwise. */
  function pick(name: string) {
    setMenuOpen(false);
    if (name === selected) return;
    if (chatEmpty) {
      select(name);
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
              <p className="mempty">No models on this machine yet.</p>
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

      {pending && (
        <div className="switchbox">
          <span>
            Switch to {pending}? This starts a new chat — the current one
            won&apos;t be saved.
          </span>
          <span className="row">
            <button
              type="button"
              className="btn"
              onClick={() => {
                select(pending);
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
        Open a folder to browse the family, then click any model for a plain-English
        guide. Models installed on this machine are in the picker above.
      </p>

      <div className="ph">Models</div>

      <div className="tree">
        {tiers.map((tier) => {
          const models = modelsInTier(tier.id);
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
                <span className="cnt">{models.length}</span>
              </button>
              {isOpen && (
                <ul className="sub">
                  {models.map((m) => (
                    <li key={m.slug}>
                      <Link href={`/llama/${m.slug}`} prefetch>
                        {m.name}
                      </Link>
                    </li>
                  ))}
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
