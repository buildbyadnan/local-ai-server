import { describe, expect, it } from "vitest";
import { feedChunk, parseJsonLine } from "@/lib/ndjson";

interface Line {
  message?: { content?: string };
  done?: boolean;
  error?: string;
}

/**
 * The chat reader's edge cases (CONNECTIVITY_PLAN §10.3): chunk boundaries
 * are arbitrary, CRLF and blank lines happen, a damaged line must never
 * break the stream, and multibyte characters can straddle two chunks — the
 * last one together with TextDecoder's stream mode, which is how the real
 * reader consumes bytes.
 */
describe("feedChunk", () => {
  it("splits complete lines and keeps the partial tail", () => {
    const first = feedChunk("", '{"a":1}\n{"b":2}\n{"c"');
    expect(first.lines).toEqual(['{"a":1}', '{"b":2}']);
    expect(first.rest).toBe('{"c"');
  });

  it("carries the tail across feeds", () => {
    const first = feedChunk("", '{"mes');
    expect(first.lines).toEqual([]);
    const second = feedChunk(first.rest, 'sage":{"content":"hi"}}\n');
    expect(second.lines).toEqual(['{"message":{"content":"hi"}}']);
    expect(second.rest).toBe("");
  });

  it("handles several lines arriving in one chunk", () => {
    const fed = feedChunk("", "one\ntwo\nthree\n");
    expect(fed.lines).toEqual(["one", "two", "three"]);
    expect(fed.rest).toBe("");
  });

  it("strips CR from CRLF line endings", () => {
    const fed = feedChunk("", '{"a":1}\r\n{"b":2}\r\n');
    expect(fed.lines).toEqual(['{"a":1}', '{"b":2}']);
  });

  it("returns an empty result for an empty feed", () => {
    expect(feedChunk("", "")).toEqual({ lines: [], rest: "" });
  });
});

describe("parseJsonLine", () => {
  it("parses an Ollama content line", () => {
    const line: Line | null = parseJsonLine<Line>(
      '{"message":{"role":"assistant","content":"Hello"},"done":false}',
    );
    expect(line?.message?.content).toBe("Hello");
  });

  it("parses the done line", () => {
    expect(parseJsonLine<Line>('{"done":true}')?.done).toBe(true);
  });

  it("parses an on-200 error line", () => {
    expect(parseJsonLine<Line>('{"error":"model not found"}')?.error).toBe(
      "model not found",
    );
  });

  it("returns null for blank and whitespace-only lines", () => {
    expect(parseJsonLine("")).toBeNull();
    expect(parseJsonLine("   ")).toBeNull();
    expect(parseJsonLine("\r")).toBeNull();
  });

  it("returns null for a malformed line instead of throwing", () => {
    expect(parseJsonLine("{not json")).toBeNull();
    expect(parseJsonLine('{"truncated":')).toBeNull();
  });

  it("tolerates surrounding whitespace", () => {
    expect(parseJsonLine<Line>('  {"done":true}  ')?.done).toBe(true);
  });
});

describe("chunked decode + feed (the reader's real path)", () => {
  it("reassembles lines split at every position", () => {
    const payload = [
      '{"message":{"content":"café ☃"}}',
      '{"message":{"content":"done"}}',
      "",
    ].join("\n");
    const bytes = new TextEncoder().encode(payload);

    for (const splitAt of [1, 5, 17, bytes.length - 3]) {
      const decoder = new TextDecoder();
      let buffer = "";
      const lines: string[] = [];
      const parts = [bytes.slice(0, splitAt), bytes.slice(splitAt)];
      for (const part of parts) {
        const fed = feedChunk(buffer, decoder.decode(part, { stream: true }));
        buffer = fed.rest;
        lines.push(...fed.lines);
      }
      const flush = feedChunk(buffer, decoder.decode());
      lines.push(...flush.lines, flush.rest);

      const texts = lines
        .map((line) => parseJsonLine<Line>(line))
        .filter((line): line is Line => line !== null)
        .map((line) => line.message?.content);
      expect(texts).toEqual(["café ☃", "done"]);
    }
  });
});
