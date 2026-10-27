"use client";

/**
 * The sidebar's OLLAMA section (CONNECTIVITY_PLAN §5.1 / §9 M5): a
 * collapsed header row with a dot+word status pill, expanding into
 * state-driven actions —
 *
 *   not installed → Install… (copyable, per-OS) + Re-check
 *   not running   → Start (only for a stock local server) + Show models +
 *                   Update + Re-install + Re-check
 *   running       → Show models + Update + Re-install + Re-check
 *
 * and four dialogs sharing the focus-trapped `Modal`: install commands,
 * every installed model (copy tag / confirmed delete), the update check,
 * and re-install. Nothing here ever executes an installer — commands are
 * shown for the user to run (decisions §2.4), and the only command the
 * server will run for us is the allowlisted `ollama rm <tag>` behind the
 * delete confirm.
 *
 * Status comes from ModelProvider; this component just calls `refresh()`.
 * OS detection is a `useSyncExternalStore` read of the user agent: it does
 * not exist during prerender, so the server snapshot is `null` (all three
 * systems shown equally) until hydration swaps in the detected OS.
 */
import { useState, useSyncExternalStore } from "react";
import { useOllama } from "@/components/ModelProvider";
import Modal from "@/components/Modal";
import { formatBytes } from "@/lib/format";
import { isLlamaModel } from "@/lib/family";
import { isStockLocalHost } from "@/lib/host";

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

/** One dialog at a time — `null` means closed. */
type Dialog = "install" | "models" | "update" | "reinstall";

/** Answer of `GET /api/ollama/update` (mirrors the route's shape). */
interface UpdateReport {
  current: string | null;
  checked: boolean;
  latest: string | null;
  updateAvailable: boolean | null;
  error: string | null;
}

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

/** A copyable command block with a Copy button and honest feedback. */
function Cmd({
  cmdKey,
  text,
  copied,
  onCopy,
}: {
  cmdKey: string;
  text: string;
  copied: string | null;
  onCopy: (key: string, text: string) => void;
}) {
  return (
    <div className="cmdrow">
      <code className="ocmd">{text}</code>
      <button
        type="button"
        className="btn copybtn"
        onClick={() => onCopy(cmdKey, text)}
      >
        {copied === cmdKey ? "Copied ✓" : copied === "failed" ? "Couldn't copy" : "Copy"}
      </button>
    </div>
  );
}

export default function OllamaStatus() {
  const { phase, status, refresh } = useOllama();
  const [open, setOpen] = useState(false);
  /** Which "other system" row is expanded, if any. */
  const [other, setOther] = useState<Os | null>(null);
  const os = useSyncExternalStore(subscribeOs, osSnapshot, osServerSnapshot);

  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const [starting, setStarting] = useState(false);
  const [startNote, setStartNote] = useState<{ ok: boolean; text: string } | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [update, setUpdate] = useState<UpdateReport | null>(null);
  const [updateBusy, setUpdateBusy] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

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

  /** Detected OS first; `null` until the effect resolves. */
  const lead = os === null ? null : os;
  const others = OS_ORDER.filter((item) => item !== lead);
  /** Install one-liner for the detected OS (falls back to Linux's). */
  const primaryInstall = lead && OS_COPY[lead].install ? OS_COPY[lead].install : OS_COPY.linux.install;
  /** Only a stock local server can be started by us and would flip status. */
  const canStart = state === "stopped" && status !== null && isStockLocalHost(status.host);

  /** Jump to and focus the model picker in the right panel. */
  function jumpToPicker() {
    const picker = document.getElementById("model-picker");
    picker?.scrollIntoView({ block: "nearest" });
    picker?.focus();
  }

  /** Copy to the clipboard; say so briefly (or honestly admit failure). */
  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1600);
    } catch {
      setCopied("failed");
      window.setTimeout(() => setCopied((current) => (current === "failed" ? null : current)), 2400);
    }
  }

  /**
   * Start: ask the server to spawn `ollama serve`, then poll the status
   * ourselves until it's honestly up (or honestly isn't — a port clash or
   * missing GPU exits immediately and we say so rather than spinning).
   */
  async function start() {
    setStarting(true);
    setStartNote(null);
    try {
      const response = await fetch("/api/ollama/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setStartNote({ ok: false, text: body?.error ?? `Couldn't start Ollama (HTTP ${response.status}).` });
        return;
      }
      for (let attempt = 0; attempt < 10; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 700));
        const snapshot = await fetch("/api/ollama/status", { cache: "no-store" })
          .then((res) => (res.ok ? (res.json() as Promise<{ running: boolean }>) : null))
          .catch(() => null);
        if (snapshot?.running) {
          setStartNote({ ok: true, text: "Ollama is running." });
          await refresh();
          return;
        }
      }
      setStartNote({
        ok: false,
        text: "Ollama didn't come up — run “ollama serve” in a terminal to see why.",
      });
    } finally {
      setStarting(false);
    }
  }

  /** Delete one model (allowlisted `ollama rm <tag>` on the server). */
  async function deleteModel() {
    const tag = confirmDelete;
    if (!tag) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const response = await fetch("/api/ollama/rm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: tag }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setDeleteError(body?.error ?? `Couldn't delete ${tag}.`);
        return;
      }
      setConfirmDelete(null);
      await refresh(); // the model list (and possibly the selection) updates
    } finally {
      setDeleteBusy(false);
    }
  }

  /** Version check: fast local read first, GitHub lookup on demand. */
  async function loadUpdate(checkLatest: boolean) {
    setUpdateBusy(true);
    setUpdateError(null);
    try {
      const response = await fetch(
        `/api/ollama/update${checkLatest ? "?check=1" : ""}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setUpdate((await response.json()) as UpdateReport);
    } catch {
      setUpdateError("Couldn't read the version right now — try again.");
    } finally {
      setUpdateBusy(false);
    }
  }

  // The Update dialog reads this machine's version from its own open
  // handler (an event, not an effect) and resets its state on close.
  const openDialog = (next: Dialog) => {
    setDialog(next);
    if (next !== "update") {
      setUpdate(null);
      setUpdateError(null);
    }
    if (next === "update") void loadUpdate(false);
  };

  const closeDialog = () => {
    setDialog(null);
    setUpdate(null);
    setUpdateError(null);
    setConfirmDelete(null);
    setDeleteError(null);
  };

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
              <code className="ocmd">{primaryInstall}</code>
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
                    <span
                      key={model.name}
                      /* M6: still listed — OLLAMA is the machine's truth —
                         but visibly not a chat model of this app. */
                      className={`omodel${isLlamaModel(model.name, model.families) ? "" : " other"}`}
                      title={
                        isLlamaModel(model.name, model.families)
                          ? undefined
                          : "Not used by this app"
                      }
                    >
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

          {startNote && (
            <p className={startNote.ok ? "ostart ok" : "ostart bad"} role="status">
              {startNote.text}
            </p>
          )}

          <div className="oact">
            {state === "down" && (
              <button type="button" className="btn" onClick={() => openDialog("install")}>
                Install…
              </button>
            )}
            {canStart && (
              <button type="button" className="btn" onClick={() => void start()} disabled={starting}>
                {starting ? "Starting…" : "Start"}
              </button>
            )}
            {state !== "checking" && status?.installed && (
              <button type="button" className="btn" onClick={() => openDialog("models")}>
                Show models
              </button>
            )}
            {state !== "checking" && status?.installed && (
              <button type="button" className="btn" onClick={() => openDialog("update")}>
                Update
              </button>
            )}
            {state !== "checking" && status?.installed && (
              <button type="button" className="btn" onClick={() => openDialog("reinstall")}>
                Re-install
              </button>
            )}
            <button
              type="button"
              className="btn"
              onClick={() => {
                setStartNote(null);
                void refresh();
              }}
              disabled={phase === "checking"}
            >
              Re-check
            </button>
          </div>
        </div>
      )}

      {/* ── Install: copyable commands, never executed by the app ── */}
      {dialog === "install" && (
        <Modal title="Install Ollama" onClose={closeDialog}>
          <p className="omodal-p">
            Install it from your own terminal — this app never runs installers for you.
            Come back and press Re-check afterwards.
          </p>
          <div className="ocmds">
            {(lead ? [lead, ...others] : OS_ORDER).map((item) => (
              <div key={item} className="ocmdblock">
                <div className="ocmdlabel">{OS_COPY[item].label}</div>
                {OS_COPY[item].install ? (
                  <Cmd
                    cmdKey={`install-${item}`}
                    text={OS_COPY[item].install}
                    copied={copied}
                    onCopy={(key, text) => void copy(key, text)}
                  />
                ) : (
                  <p className="odim">
                    Download the installer from{" "}
                    <a href="https://ollama.com/download" target="_blank" rel="noreferrer">
                      ollama.com/download
                    </a>
                    .
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="oact">
            <button
              type="button"
              className="btn"
              onClick={() => {
                closeDialog();
                void refresh();
              }}
            >
              I&apos;ve installed it — Re-check
            </button>
          </div>
        </Modal>
      )}

      {/* ── Show models: everything installed, with copy + confirmed rm ── */}
      {dialog === "models" && status && (
        <Modal title="Models on this computer" onClose={closeDialog}>
          {!status.running && (
            <p className="omodal-p">
              Ollama isn&apos;t running at {hostLabel(status.host)}, so its model list
              isn&apos;t available — start it, then press Re-check.
            </p>
          )}
          {status.running && status.models.length === 0 && (
            <p className="omodal-p">No models yet — pull one from the tree on the right.</p>
          )}
          {status.running && status.models.length > 0 && (
            <ul className="mrows">
              {status.models.map((model) => (
                <li key={model.name} className="mrow">
                  <div className="mmain">
                    <span className="mname">
                      {model.name}
                      {status.loaded.includes(model.name) && (
                        <span className="mloaded">loaded</span>
                      )}
                    </span>
                    <span className="mmeta">
                      {formatBytes(model.size)}
                      {model.parameterSize ? ` · ${model.parameterSize} parameters` : ""}
                      {!isLlamaModel(model.name, model.families)
                        ? " · not used by this app"
                        : ""}
                    </span>
                  </div>
                  <div className="macts">
                    <button
                      type="button"
                      className="btn"
                      onClick={() => void copy(`tag-${model.name}`, model.name)}
                    >
                      {copied === `tag-${model.name}` ? "Copied ✓" : "Copy tag"}
                    </button>
                    {/* Deleting runs the real `ollama rm` on THIS machine —
                        only offer it when we're actually talking to that
                        server, never against a stand-in or remote host. */}
                    {isStockLocalHost(status.host) &&
                      (confirmDelete === model.name ? (
                        <span className="mconfirm">
                          <button
                            type="button"
                            className="btn danger"
                            onClick={() => void deleteModel()}
                            disabled={deleteBusy}
                          >
                            {deleteBusy ? "Deleting…" : `Yes, delete ${model.name}`}
                          </button>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => setConfirmDelete(null)}
                            disabled={deleteBusy}
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="btn danger"
                          onClick={() => {
                            setDeleteError(null);
                            setConfirmDelete(model.name);
                          }}
                        >
                          Delete
                        </button>
                      ))}
                  </div>
                  {confirmDelete === model.name && (
                    <p className="mwarn">
                      This removes the model&apos;s files from disk. Your chats stay; the
                      model has to be downloaded again to use it.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
          {status.running && status.models.length > 0 && !isStockLocalHost(status.host) && (
            <p className="odim">
              This app is pointed at {hostLabel(status.host)}, not your local Ollama —
              model deletion is only offered against 127.0.0.1:11434.
            </p>
          )}
          {deleteError && (
            <p className="saveerr" role="alert">
              {deleteError}
            </p>
          )}
          <div className="oact">
            <button
              type="button"
              className="btn"
              onClick={() => {
                closeDialog();
                void refresh();
              }}
            >
              Re-check
            </button>
          </div>
        </Modal>
      )}

      {/* ── Update: this machine's version + an honest latest check ── */}
      {dialog === "update" && (
        <Modal title="Update Ollama" onClose={closeDialog}>
          <p className="omodal-p">
            Installed version:{" "}
            <strong>{update?.current ?? (updateBusy ? "…" : "—")}</strong>
          </p>
          {updateError && (
            <p className="saveerr" role="alert">
              {updateError}
            </p>
          )}
          {update?.error && !updateBusy && (
            <p className="saveerr" role="alert">
              {update.error}
            </p>
          )}
          {update?.checked && update.latest && update.updateAvailable === false && (
            <p className="ostart ok">You&apos;re on the latest version ({update.latest}).</p>
          )}
          {update?.checked && update.updateAvailable === true && (
            <p className="ostart ok">
              Version {update.latest} is available (you have {update.current}).
            </p>
          )}
          <p className="omodal-p">
            Ollama updates by re-running the installer — this app won&apos;t run it for
            you. Your downloaded models stay where they are.
          </p>
          <div className="ocmds">
            <div className="ocmdblock">
              <div className="ocmdlabel">{lead ? OS_COPY[lead].label : "Linux"}</div>
              {(lead ? OS_COPY[lead].install : OS_COPY.linux.install) ? (
                <Cmd
                  cmdKey="update-cmd"
                  text={(lead ? OS_COPY[lead].install : OS_COPY.linux.install) || ""}
                  copied={copied}
                  onCopy={(key, text) => void copy(key, text)}
                />
              ) : (
                <p className="odim">
                  Download the newest installer from{" "}
                  <a href="https://ollama.com/download" target="_blank" rel="noreferrer">
                    ollama.com/download
                  </a>
                  .
                </p>
              )}
            </div>
          </div>
          <div className="oact">
            <button
              type="button"
              className="btn"
              onClick={() => void loadUpdate(true)}
              disabled={updateBusy}
            >
              {updateBusy ? "Checking…" : "Check for update"}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                closeDialog();
                void refresh();
              }}
            >
              Re-check
            </button>
          </div>
        </Modal>
      )}

      {/* ── Re-install: same installer, with the "models survive" promise ── */}
      {dialog === "reinstall" && (
        <Modal title="Re-install Ollama" onClose={closeDialog}>
          <p className="omodal-p">
            Re-running the installer replaces the program — your downloaded models and
            settings stay in <code className="oinline">~/.ollama</code>. If Ollama is
            running, quit it first.
          </p>
          <div className="ocmds">
            <div className="ocmdblock">
              <div className="ocmdlabel">{lead ? OS_COPY[lead].label : "Linux"}</div>
              <Cmd
                cmdKey="reinstall-cmd"
                text={primaryInstall}
                copied={copied}
                onCopy={(key, text) => void copy(key, text)}
              />
            </div>
          </div>
          <p className="odim">
            Then press Re-check to confirm the new version is what&apos;s running.
          </p>
          <div className="oact">
            <button
              type="button"
              className="btn"
              onClick={() => {
                closeDialog();
                void refresh();
              }}
            >
              Re-check
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
