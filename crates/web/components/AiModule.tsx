"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { modelsInTier, tiers } from "@/data/models";

const FOLDER_ICON = (
  <svg viewBox="0 0 24 24">
    <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
);

export default function AiModule() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openTiers, setOpenTiers] = useState<string[]>(["30-70b"]);
  const wrapRef = useRef<HTMLDivElement>(null);

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
          aria-expanded={menuOpen}
          aria-haspopup="listbox"
          onClick={() => setMenuOpen((v) => !v)}
        >
          ⚡ llama <span aria-hidden="true">⌄</span>
        </button>
        {menuOpen && (
          <div className="modelmenu" role="listbox" aria-label="Model">
            <button
              type="button"
              role="option"
              aria-selected="true"
              onClick={() => setMenuOpen(false)}
            >
              <span className="ck" aria-hidden="true">
                ✓
              </span>
              llama
              <span className="meta">local</span>
            </button>
          </div>
        )}
      </div>

      <p className="desc">
        Every model below runs on this machine through ollama. Open a folder to
        browse the family, then click any model for a plain-English guide.
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
