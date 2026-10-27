"use client";

/**
 * The SYSTEM INFO row (CONNECTIVITY_PLAN §9 M5) — sits directly above
 * OLLAMA in the sidebar and opens a dialog with everything this machine
 * can honestly report: OS, CPU, memory, disk, Ollama, and the runtime
 * this server is running on.
 *
 * The data is fetched on open (and on Refresh), never prerendered: none of
 * it exists at build time, and the dialog must show the current truth — a
 * model pulled five seconds ago changes the numbers.
 */
import { useCallback, useState } from "react";
import Modal from "@/components/Modal";
import { formatBytes, formatDuration } from "@/lib/format";
import type { SystemReport } from "@/lib/system";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="sysrow">
      <span className="syslabel">{label}</span>
      <span className="sysvalue">{value}</span>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="syscard">
      <h4>{title}</h4>
      {children}
    </section>
  );
}

export default function SystemInfo() {
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<SystemReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/system", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setReport((await response.json()) as SystemReport);
    } catch {
      setError("Couldn't read this machine's details — try again.");
    } finally {
      setBusy(false);
    }
  }, []);

  /** Opening the dialog is an event, so the fetch starts there — no effect. */
  const openDialog = () => {
    setOpen(true);
    void load();
  };

  const used = report ? report.memory.totalBytes - report.memory.freeBytes : 0;
  const usedPct =
    report && report.memory.totalBytes > 0
      ? Math.round((used / report.memory.totalBytes) * 100)
      : 0;

  const ollamaState = !report
    ? "…"
    : !report.ollama.installed
      ? "Not installed"
      : report.ollama.running
        ? "Running"
        : "Not running";

  return (
    <>
      <button
        type="button"
        className="histbtn"
        id="system-section"
        onClick={openDialog}
      >
        SYSTEM INFO
        <span className="chev" aria-hidden="true">
          ›
        </span>
      </button>

      {open && (
        <Modal title="System info" onClose={() => setOpen(false)}>
          {error && <p className="syserror">{error}</p>}
          {!report && !error && <p className="odim">Reading this machine…</p>}

          {report && (
            <div className="sysgrid">
              <Card title="This machine">
                <Row label="System" value={report.os.distro ?? `${report.os.platform} ${report.os.release}`} />
                <Row label="Kernel" value={report.os.release} />
                <Row label="Architecture" value={report.os.arch} />
              </Card>

              <Card title="Processor">
                <Row label="Model" value={report.cpu.model} />
                <Row label="Cores" value={String(report.cpu.cores)} />
                <Row
                  label="Load average"
                  value={report.cpu.load.map((n) => n.toFixed(2)).join(" · ")}
                />
              </Card>

              <Card title="Memory">
                <Row label="In use" value={`${formatBytes(used)} (${usedPct}%)`} />
                <Row label="Total" value={formatBytes(report.memory.totalBytes)} />
                <Row label="Free" value={formatBytes(report.memory.freeBytes)} />
              </Card>

              <Card title="Storage">
                {report.disks.length === 0 && <Row label="Disk" value="—" />}
                {report.disks.map((disk, index) => (
                  <Row
                    key={disk.path}
                    label={index === 0 ? "App folder" : index === 1 ? "Home" : disk.path}
                    value={`${formatBytes(disk.freeBytes)} free of ${formatBytes(disk.totalBytes)}`}
                  />
                ))}
              </Card>

              <Card title="Ollama">
                <Row label="Status" value={ollamaState} />
                <Row label="Version" value={report.ollama.version ?? "—"} />
                <Row label="Host" value={report.ollama.host} />
                <Row
                  label="Parallel chats"
                  value={
                    report.ollama.numParallelSource === "default"
                      ? `${report.ollama.numParallel} (Ollama default)`
                      : `${report.ollama.numParallel} (OLLAMA_NUM_PARALLEL)`
                  }
                />
                <p className="sysnote">
                  {report.ollama.numParallel === 1
                    ? "One reply at a time per model: a chat started while another is streaming waits in Ollama's queue — the composer says \"Waiting for the model — another chat may be using it\". To stream two at once, set OLLAMA_NUM_PARALLEL=2 where ollama serve runs and restart it (RAM/VRAM scales with the count × context length)."
                    : `Up to ${report.ollama.numParallel} replies stream at once per model; beyond that they queue (OLLAMA_MAX_QUEUE, default 512).`}
                </p>
                <Row
                  label="Installed models"
                  value={
                    report.ollama.models.length === 0
                      ? "None"
                      : `${report.ollama.models.length} · ${formatBytes(report.ollama.modelsBytes)}`
                  }
                />
                {report.ollama.models.some((model) => model.residentBytes !== null) && (
                  <Row
                    label="Loaded now"
                    value={report.ollama.models
                      .filter((model) => model.residentBytes !== null)
                      .map(
                        (model) =>
                          `${model.name} (${formatBytes(model.residentBytes ?? 0)})`,
                      )
                      .join(", ")}
                  />
                )}
              </Card>

              <Card title="App">
                <Row label="Node.js" value={report.runtime.node} />
                <Row label="Next.js" value={report.runtime.next || "—"} />
                <Row label="Server up for" value={formatDuration(report.runtime.uptimeSeconds)} />
              </Card>

              <Card title="History">
                {report.history === null && <Row label="Database" value="—" />}
                {report.history && (
                  <>
                    <Row
                      label="Saved chats"
                      value={String(report.history.sessions)}
                    />
                    <Row
                      label="Messages"
                      value={String(report.history.messages)}
                    />
                    <Row label="Size" value={formatBytes(report.history.bytes)} />
                  </>
                )}
              </Card>
            </div>
          )}

          <div className="oact sysact">
            <button type="button" className="btn" onClick={() => void load()} disabled={busy}>
              {busy ? "Reading…" : "Refresh"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
