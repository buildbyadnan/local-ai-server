"use client";

/**
 * The sidebar's OLLAMA section (directly below the Plugins nav item,
 * CONNECTIVITY_PLAN §5.1): a collapsed header row with a dot+word status
 * pill, expanding to install / start guidance for the detected OS or a
 * jump to the model picker. Presentation only — status comes from
 * ModelProvider; this component just calls `refresh()`.
 *
 * OS detection is a `useSyncExternalStore` read of the user agent: it does
 * not exist during prerender, so the server snapshot is `null` (all three
 * systems shown equally) until hydration swaps in the detected OS.
 */
import { useState, useSyncExternalStore } from "react";
import { useOllama } from "@/components/ModelProvider";

type Os = "macos" | "linux" | "windows";

interface OsCopy {
  label: string;
  /** Terminal installer ("" when the OS ships a GUI installer only). */
  install: string;
  /** How to start the server. */
  start: string;
}

const OS_COPY: Record<Os, OsCopy> = {
  macos: { label: "macOS", install: "", start: "open -a Ollama" },
  linux: {
    label: "Linux",
    install: "curl -fsSL https://ollama.com/install.sh | sh",
    start: "ollama serve",
  },
  windows: { label: "Windows", install: "", start: "ollama serve" },
};

const OS_ORDER: Os[] = ["linux", "macos", "windows"];

function detectOs(): Os | null {
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "windows";
  if (/Mac OS X/i.test(ua)) return "macos";
  if (/Linux/i.test(ua)) return "linux";
  return null;
}

/**
 * The user agent never changes during a session, so a no-op subscription
 * plus a value-stable snapshot is enough — and hydration starts from the
 * server snapshot (`null`) before switching to the detected OS, keeping
 * SSR and client markup identical on the first render.
 */
function subscribeOs() {
  return () => {};
}
function osSnapshot(): Os | null {
  return typeof navigator === "undefined" ? null : detectOs();
}
function osServerSnapshot(): Os | null {
  return null;
}

/** Strip the scheme so copy reads `127.0.0.1:11434`, not a URL. */
function hostLabel(host: string): string {
  return host.replace(/^https?:\/\//, "");
}

export default function OllamaStatus() {
  const { phase, status, refresh } = useOllama();
  const [open, setOpen] = useState(false);
  /** Which "other system" row is expanded, if any. */
  const [other, setOther] = useState<Os | null>(null);
  const os = useSyncExternalStore(subscribeOs, osSnapshot, osServerSnapshot);

  const state =
    phase === "checking" || status === null
      ? "checking"
      : status.running
        ? "up"
        : status.installed
          ? "stopped"
          : "down";

  const word =
    state === "up"
      ? "Connected"
      : state === "stopped"
        ? "Not running"
        : state === "down"
          ? "Not installed"
          : "Checking…";

  /** Jump to and focus the model picker in the right panel. */
  function jumpToPicker() {
    const picker = document.getElementById("model-picker");
    picker?.scrollIntoView({ block: "nearest" });
    picker?.focus();
  }

  /** Detected OS first; `null` until the effect resolves. */
  const lead = os === null ? null : os;
  const others = OS_ORDER.filter((item) => item !== lead);

  return (
    <>
      <button
        type="button"
        className="histbtn"
        id="ollama-section"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        OLLAMA
        <span className="obar">
          <span className={`pill pill-${state}`} aria-live="polite">
            <i aria-hidden="true" />
            {word}
          </span>
          <span className="chev" aria-hidden="true">
            {open ? "︿" : "﹀"}
          </span>
        </span>
      </button>

      {open && (
        <div className="osecbody">
          {state === "checking" && <p>Checking for Ollama on this machine…</p>}

          {state === "down" && (
            <>
              <p>
                Install Ollama to chat with local models — it&apos;s free and runs on your
                machine. Install it, then press Re-check.
              </p>
              <code className="ocmd">
                {lead && OS_COPY[lead].install
                  ? OS_COPY[lead].install
                  : OS_COPY.linux.install}
              </code>
              <p className="oothers">
                Other systems:{" "}
                {others.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="olink"
                    aria-expanded={other === item}
                    onClick={() => setOther((v) => (v === item ? null : item))}
                  >
                    {OS_COPY[item].label}
                  </button>
                ))}
              </p>
              {other && (
                <code className="ocmd">
                  {OS_COPY[other].install || `download from ollama.com/download`}
                </code>
              )}
              <p className="odim">
                Or download it:{" "}
                <a href="https://ollama.com/download" target="_blank" rel="noreferrer">
                  ollama.com/download
                </a>
              </p>
            </>
          )}

          {state === "stopped" && status && (
            <>
              <p>
                Can&apos;t reach Ollama at {hostLabel(status.host)}. Start it on your
                system, then press Re-check — or set OLLAMA_HOST if it lives elsewhere.
              </p>
              <code className="ocmd">
                {lead ? `${OS_COPY[lead].label}: ${OS_COPY[lead].start}` : OS_COPY.linux.start}
              </code>
              <p className="oothers">
                Other systems:{" "}
                {others.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="olink"
                    aria-expanded={other === item}
                    onClick={() => setOther((v) => (v === item ? null : item))}
                  >
                    {OS_COPY[item].label}
                  </button>
                ))}
              </p>
              {other && (
                <code className="ocmd">
                  {OS_COPY[other].label}: {OS_COPY[other].start}
                </code>
              )}
              {!status.onPath && (
                <p className="odim">
                  Ollama is installed but not on your PATH — the status check used its
                  default location.
                </p>
              )}
            </>
          )}

          {state === "up" && status && (
            <>
              <p>
                {status.models.length} local model
                {status.models.length === 1 ? "" : "s"} on this machine
              </p>
              <div className="omodels">
                {status.models.length === 0 ? (
                  <span className="odim">None yet — pick a model from the tree on the right.</span>
                ) : (
                  status.models.map((model) => (
                    <span key={model.name} className="omodel">
                      {model.name}
                    </span>
                  ))
                )}
              </div>
              {status.models.length > 0 && (
                <button type="button" className="olink" onClick={jumpToPicker}>
                  → jump to picker
                </button>
              )}
            </>
          )}

          <div className="oact">
            <button type="button" className="btn" onClick={refresh}>
              Re-check
            </button>
          </div>
        </div>
      )}
    </>
  );
}
