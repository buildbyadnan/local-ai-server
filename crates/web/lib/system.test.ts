import { describe, expect, it, vi } from "vitest";
import {
  numParallelFromEnv,
  parseOllamaVersion,
  parseOsRelease,
  roundLoad,
} from "@/lib/system";

describe("parseOsRelease", () => {
  it("reads PRETTY_NAME out of a real os-release file", () => {
    const text = [
      'NAME="Ubuntu"',
      'VERSION="24.04.1 LTS (Noble Numbat)"',
      'PRETTY_NAME="Ubuntu 24.04.1 LTS"',
      "ID=ubuntu",
    ].join("\n");
    expect(parseOsRelease(text)).toBe("Ubuntu 24.04.1 LTS");
  });

  it("handles a value with no quotes", () => {
    expect(parseOsRelease("PRETTY_NAME=Debian GNU/Linux 12\n")).toBe(
      "Debian GNU/Linux 12",
    );
  });

  it("returns null rather than a partial guess", () => {
    expect(parseOsRelease("NAME=Something\nID=something")).toBeNull();
    expect(parseOsRelease("")).toBeNull();
  });
});

describe("parseOllamaVersion", () => {
  it("parses the binary's own wording", () => {
    expect(parseOllamaVersion("ollama version is 0.40.8")).toBe("0.40.8");
  });

  it("accepts a bare version and a leading v (release tags)", () => {
    expect(parseOllamaVersion("0.40.8")).toBe("0.40.8");
    expect(parseOllamaVersion("v0.41.0")).toBe("0.41.0");
  });

  it("keeps pre-release suffixes", () => {
    expect(parseOllamaVersion("ollama version is 0.41.0-rc1")).toBe("0.41.0-rc1");
  });

  it("returns null for absent or unparseable output", () => {
    expect(parseOllamaVersion(null)).toBeNull();
    expect(parseOllamaVersion(undefined)).toBeNull();
    expect(parseOllamaVersion("")).toBeNull();
    expect(parseOllamaVersion("ollama: something odd")).toBeNull();
  });
});

describe("roundLoad", () => {
  it("rounds each of the three averages to two decimals", () => {
    expect(roundLoad([0.12345, 1.9999, 2.5])).toEqual([0.12, 2, 2.5]);
  });

  it("zeroes out Windows' all-zero or missing values", () => {
    expect(roundLoad([0, 0, 0])).toEqual([0, 0, 0]);
    expect(roundLoad([Number.NaN])).toEqual([0, 0, 0]);
    expect(roundLoad([])).toEqual([0, 0, 0]);
  });
});

describe("numParallelFromEnv (M8)", () => {
  it("reports Ollama's default of 1 when unset or blank", () => {
    vi.stubEnv("OLLAMA_NUM_PARALLEL", "");
    expect(numParallelFromEnv()).toEqual({ value: 1, source: "default" });
    vi.stubEnv("OLLAMA_NUM_PARALLEL", "   ");
    expect(numParallelFromEnv()).toEqual({ value: 1, source: "default" });
  });

  it("accepts a sane configured value", () => {
    vi.stubEnv("OLLAMA_NUM_PARALLEL", "2");
    expect(numParallelFromEnv()).toEqual({ value: 2, source: "env" });
    vi.stubEnv("OLLAMA_NUM_PARALLEL", "8");
    expect(numParallelFromEnv()).toEqual({ value: 8, source: "env" });
  });

  it("refuses garbage instead of inventing a number", () => {
    for (const bad of ["0", "-3", "72", "many", "1.5"]) {
      vi.stubEnv("OLLAMA_NUM_PARALLEL", bad);
      expect(numParallelFromEnv()).toEqual({ value: 1, source: "default" });
    }
  });

  it("restores the environment afterwards", () => {
    vi.unstubAllEnvs();
    expect(typeof numParallelFromEnv().value).toBe("number");
  });
});
