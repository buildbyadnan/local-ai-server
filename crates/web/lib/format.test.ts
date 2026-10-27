import { describe, expect, it } from "vitest";
import { compareVersions, formatBytes, formatDuration } from "@/lib/format";

describe("formatBytes", () => {
  it.each([
    [0, "0 B"],
    [999, "999 B"],
    [1_000, "1 KB"],
    [1_500, "2 KB"], // rounds to the nearest whole KB
    [999_999, "1000 KB"], // still under a MB — no unit jump
    [1e6, "1 MB"],
    [812e6, "812 MB"],
    [4_900_000_000, "4.9 GB"],
    [8e9, "8.0 GB"],
    [1e12, "1.00 TB"],
  ])("%i → %s", (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });

  it("refuses to invent a number for bad input", () => {
    expect(formatBytes(Number.NaN)).toBe("—");
    expect(formatBytes(Number.POSITIVE_INFINITY)).toBe("—");
    expect(formatBytes(-1)).toBe("—");
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "0s"],
    [42, "42s"],
    [743, "12m 23s"],
    [3_600, "1h 0m"],
    [14_820, "4h 7m"],
    [90_000, "1d 1h"],
  ])("%i s → %s", (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });

  it("clamps negatives instead of printing -1m", () => {
    expect(formatDuration(-5)).toBe("0s");
  });
});

describe("compareVersions", () => {
  it("compares numerically, not lexically (1.10 > 1.9)", () => {
    expect(compareVersions("1.10.0", "1.9.0")).toBeGreaterThan(0);
    expect(compareVersions("0.40.8", "0.9.9")).toBeGreaterThan(0);
  });

  it("handles a leading v on either side", () => {
    expect(compareVersions("v0.39.0", "0.40.8")).toBeLessThan(0);
    expect(compareVersions("0.40.8", "v0.40.8")).toBe(0);
  });

  it("treats a missing segment as zero", () => {
    expect(compareVersions("1.2", "1.2.0")).toBe(0);
    expect(compareVersions("1.2.1", "1.2")).toBeGreaterThan(0);
  });

  it("is a strict weak ordering for the equal case", () => {
    expect(compareVersions("0.40.8", "0.40.8")).toBe(0);
    expect(compareVersions("", "")).toBe(0);
  });
});
