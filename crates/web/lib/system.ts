/**
 * Server-only collection behind `GET /api/system` — everything the
 * System-info dialog shows about this machine, gathered fresh per request
 * (every value can change while the app runs: a model gets pulled, memory
 * fills, Ollama starts).
 *
 * Everything is a value, never a throw: a missing /etc/os-release, an
 * unstatable disk or a silent Ollama just narrows the report, so the
 * dialog can render honestly instead of erroring wholesale.
 */
import { readFile, statfs } from "node:fs/promises";
import { dirname } from "node:path";
import os from "node:os";
import nextPkg from "next/package.json";
import { base, ollamaFetch, ollamaVersion, probeInstalled } from "@/lib/ollama";
import { historyStats } from "@/lib/history-db";

/** One installed-and-possibly-loaded model in the report. */
export interface SystemModel {
  name: string;
  sizeBytes: number;
  parameterSize: string;
  /** Bytes of RAM/VRAM it occupies right now, or null when not loaded. */
  residentBytes: number | null;
}

export interface SystemReport {
  os: {
    /** Human name ("Ubuntu 24.04.1 LTS") or null where unknown. */
    distro: string | null;
    platform: string;
    release: string;
    arch: string;
  };
  cpu: { model: string; cores: number; load: [number, number, number] };
  memory: { totalBytes: number; freeBytes: number };
  /** Free/total for the app's directory and the user's home, when readable. */
  disks: Array<{ path: string; totalBytes: number; freeBytes: number }>;
  ollama: {
    installed: boolean;
    onPath: boolean;
    running: boolean;
    host: string;
    /** Parsed from `ollama --version`, null when not installed. */
    version: string | null;
    /**
     * `OLLAMA_NUM_PARALLEL` this server would run with — the max parallel
     * requests *per model* (Ollama's default is 1: same-model chats
     * process one at a time, the rest queue behind `OLLAMA_MAX_QUEUE`).
     */
    numParallel: number;
    /** Whether that value came from the environment or is the default. */
    numParallelSource: "env" | "default";
    /** Where its models live, for the re-install reassurance copy. */
    modelDir: string | null;
    models: SystemModel[];
    /** Sum of installed model sizes. */
    modelsBytes: number;
  };
  runtime: {
    node: string;
    next: string;
    /** Seconds this server process has been up. */
    uptimeSeconds: number;
    /** Data directory of the history DB (M7) — null until it exists. */
    dataDir: string | null;
  };
  /** What the history DB holds (M7) — null when unreadable. */
  history: {
    sessions: number;
    messages: number;
    bytes: number;
    file: string;
  } | null;
}

/** `/etc/os-release` → its PRETTY_NAME, if present (pure). */
export function parseOsRelease(text: string): string | null {
  const match = /^PRETTY_NAME="?([^"\n]+)"?/m.exec(text);
  return match ? match[1] : null;
}

/**
 * `ollama --version` output → a version string (pure). The binary prints
 * "ollama version is 0.40.8"; we take the first x.y.z (plus any -suffix)
 * and refuse to invent one when there is none.
 */
export function parseOllamaVersion(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const match = /v?(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)/.exec(raw);
  return match ? match[1] : null;
}

/**
 * `OLLAMA_NUM_PARALLEL` as this process sees it (M8): the max parallel
 * requests *per model* — Ollama's documented default is 1, i.e. chats with
 * the same model run one at a time and the rest queue (up to
 * `OLLAMA_MAX_QUEUE`, then 503). A missing/garbage value reports the
 * default rather than inventing a number; the dialog says which it got.
 */
export function numParallelFromEnv(): { value: number; source: "env" | "default" } {
  const raw = process.env.OLLAMA_NUM_PARALLEL?.trim() ?? "";
  // Strict: an all-digit count in 1..64 — "1.5", "0", "-3" or "many" are
  // all nonsense, and inventing a plausible number would be dishonest.
  if (!/^[1-9]\d{0,1}$/.test(raw)) return { value: 1, source: "default" };
  const parsed = Number.parseInt(raw, 10);
  if (parsed > 64) return { value: 1, source: "default" };
  return { value: parsed, source: "env" };
}

/** Round a load average to the two decimals terminals show (pure). */
export function roundLoad(load: readonly number[]): [number, number, number] {
  const at = (i: number): number => {
    const value = load[i];
    return typeof value === "number" && Number.isFinite(value)
      ? Math.round(value * 100) / 100
      : 0;
  };
  return [at(0), at(1), at(2)];
}

async function readDistro(): Promise<string | null> {
  if (process.platform !== "linux") return null;
  try {
    return parseOsRelease(await readFile("/etc/os-release", "utf8"));
  } catch {
    return null;
  }
}

async function diskOf(target: string): Promise<SystemReport["disks"][number] | null> {
  try {
    const stats = await statfs(target);
    const blockSize = Number(stats.bsize);
    return {
      path: target,
      totalBytes: Number(stats.blocks) * blockSize,
      freeBytes: Number(stats.bavail) * blockSize,
    };
  } catch {
    return null;
  }
}

interface UpstreamModel {
  name?: unknown;
  size?: unknown;
  details?: { parameter_size?: unknown };
}

function toModel(entry: UpstreamModel, residentBytes: number | null): SystemModel {
  return {
    name: typeof entry.name === "string" ? entry.name : "",
    sizeBytes: typeof entry.size === "number" ? entry.size : 0,
    parameterSize:
      typeof entry.details?.parameter_size === "string"
        ? entry.details.parameter_size
        : "",
    residentBytes,
  };
}

/** Fresh report for `GET /api/system`. Never throws. */
export async function collectSystem(): Promise<SystemReport> {
  const probe = await probeInstalled();
  const parallel = numParallelFromEnv();
  const cpus = os.cpus();
  const [distro, appDisk, homeDisk] = await Promise.all([
    readDistro(),
    diskOf(process.cwd()),
    diskOf(os.homedir()),
  ]);

  const report: SystemReport = {
    os: {
      distro,
      platform: process.platform,
      release: os.release(),
      arch: process.arch,
    },
    cpu: {
      model: cpus[0]?.model?.trim() || "Unknown processor",
      cores: cpus.length,
      load: roundLoad(os.loadavg()),
    },
    memory: { totalBytes: os.totalmem(), freeBytes: os.freemem() },
    disks: [appDisk, homeDisk].filter((disk): disk is NonNullable<typeof disk> => disk !== null),
    ollama: {
      installed: probe.installed,
      onPath: probe.onPath,
      running: false,
      host: base(),
      version: probe.installed ? parseOllamaVersion(await ollamaVersion()) : null,
      numParallel: parallel.value,
      numParallelSource: parallel.source,
      modelDir: null,
      models: [],
      modelsBytes: 0,
    },
    runtime: {
      node: process.version,
      next: typeof nextPkg.version === "string" ? nextPkg.version : "",
      uptimeSeconds: process.uptime(),
      dataDir: null,
    },
    history: null,
  };

  // The history DB (M7): counts + file size, and where it lives — but a
  // read-only or broken data dir narrows the report instead of failing it.
  try {
    const stats = historyStats();
    report.history = stats;
    report.runtime.dataDir = dirname(stats.file);
  } catch {
    report.history = null;
  }

  if (!probe.installed) return report;

  const models: SystemModel[] = [];
  const tags = await ollamaFetch("/api/tags", {}, 2000).catch(() => null);
  if (tags?.ok) {
    const data = (await tags.json().catch(() => null)) as { models?: UpstreamModel[] } | null;
    if (data && Array.isArray(data.models)) {
      report.ollama.running = true;
      for (const entry of data.models) {
        if (typeof entry.name === "string" && entry.name.length > 0) {
          models.push(toModel(entry, null));
        }
      }
    }
  }

  const ps = await ollamaFetch("/api/ps", {}, 2000).catch(() => null);
  if (ps?.ok) {
    const data = (await ps.json().catch(() => null)) as { models?: UpstreamModel[] } | null;
    if (data && Array.isArray(data.models)) {
      for (const entry of data.models) {
        if (typeof entry.name !== "string") continue;
        const resident = typeof entry.size === "number" ? entry.size : null;
        const existing = models.find((model) => model.name === entry.name);
        if (existing) existing.residentBytes = resident;
        else models.push(toModel(entry, resident));
      }
    }
  }

  report.ollama.models = models;
  report.ollama.modelsBytes = models.reduce((sum, model) => sum + model.sizeBytes, 0);
  // Ollama's own default (`~/.ollama/models`, or OLLAMA_MODELS) — quoted in
  // the re-install dialog so people know their downloads survive it.
  report.ollama.modelDir = process.env.OLLAMA_MODELS?.trim() || `${os.homedir()}/.ollama/models`;
  return report;
}
