/**
 * Pure NDJSON stream helpers for the client-side chat/pull readers.
 *
 * Chunks from `ReadableStream` end wherever they like — mid-line, and
 * sometimes mid-UTF-8-character — so decoding happens outside (TextDecoder
 * in stream mode) and buffering happens here. Everything in this module is
 * synchronous and side-effect free, which is what makes the reader's edge
 * cases unit-testable.
 */

export interface FedChunk {
  /** Complete lines from this feed, CR-stripped, in arrival order. */
  lines: string[];
  /** Bytes received after the last newline — carry into the next feed. */
  rest: string;
}

/** Append a decoded chunk and split off every complete line. */
export function feedChunk(buffer: string, chunk: string): FedChunk {
  const combined = buffer + chunk;
  const lines: string[] = [];
  let start = 0;
  for (;;) {
    const cut = combined.indexOf("\n", start);
    if (cut === -1) break;
    lines.push(combined.slice(start, cut).replace(/\r$/, ""));
    start = cut + 1;
  }
  return { lines, rest: combined.slice(start) };
}

/**
 * Parse one NDJSON line. Returns `null` for blank lines and malformed JSON
 * (a damaged line must never break the stream — row 29 of the state
 * matrix), otherwise the decoded value.
 */
export function parseJsonLine<T>(line: string): T | null {
  const trimmed = line.trim();
  if (trimmed.length === 0) return null;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return null;
  }
}
