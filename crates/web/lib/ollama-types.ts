/**
 * Wire types shared by the Ollama proxy route handlers (server) and the
 * React provider (client). Types only — this module is erased at build
 * time, so it is safe to import from either side.
 */

/** One installed model, as listed by `GET /api/tags`. */
export interface InstalledModel {
  /** Full registry name, e.g. `llama3.1:8b`. */
  name: string;
  /** Size on disk in bytes. */
  size: number;
  /** `details.parameter_size` from Ollama, e.g. `8.0B` ("" if absent). */
  parameterSize: string;
  /**
   * `details.families` (folded with `details.family`) — the model's own
   * declaring families, e.g. `["llama","text"]`. `[]` when the server
   * sent none; the picker falls back to the name in that case (M6).
   */
  families: string[];
}

/** Response body of `GET /api/ollama/status`. Every field always present. */
export interface OllamaStatus {
  /** The `ollama` binary was found (PATH or a known install location). */
  installed: boolean;
  /** Found on PATH (vs. only via a known install location). */
  onPath: boolean;
  /** `GET /api/tags` answered — the server is reachable. */
  running: boolean;
  /** The base URL this server proxies to (for honest error copy). */
  host: string;
  /** Installed models ([] when not running). */
  models: InstalledModel[];
  /** Models currently loaded into memory (`GET /api/ps`). */
  loaded: string[];
}
