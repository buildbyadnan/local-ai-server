import { describe, expect, it } from "vitest";
import { allModels } from "@/data/models";

/**
 * §10.3 "data integrity": the tagging that drives the whole pull flow must
 * match §6's asserted table exactly (Oct 2026 capture) — a missing or
 * mistyped `pullSize` would mis-size a confirm dialog, a wrong
 * `paramsBillions` would mis-badge an installed model.
 */
describe("guide tagging (§6 value table)", () => {
  /** slug → [tag, pullSize, params] exactly as §6 asserts them. */
  const table: Record<string, [string, string, number[]]> = {
    "llama-2-7b-13b": ["llama2:7b", "3.8 GB", [7, 13]],
    "codellama-7b-13b": ["codellama:7b", "3.8 GB", [7, 13]],
    "llama-3-8b": ["llama3:8b", "4.7 GB", [8]],
    "llama-3-1-8b": ["llama3.1:8b", "4.9 GB", [8]],
    "llama-3-2-1b-3b": ["llama3.2:3b", "2.0 GB", [1, 3]],
    "llama-3-2-vision-11b": ["llama3.2-vision:11b", "7.8 GB", [11]],
    "llama-2-70b": ["llama2:70b", "39 GB", [70]],
    "codellama-34b-70b": ["codellama:34b", "19 GB", [34, 70]],
    "llama-3-70b": ["llama3:70b", "40 GB", [70]],
    "llama-3-1-70b": ["llama3.1:70b", "43 GB", [70]],
    "llama-3-3-70b": ["llama3.3:70b", "42 GB", [70]],
    "llama-3-2-vision-90b": ["llama3.2-vision:90b", "55 GB", [90]],
    "llama-3-1-405b": ["llama3.1:405b", "243 GB", [405]],
    "llama-4-scout": ["llama4:scout", "67 GB", [109]],
    "llama-4-maverick": ["llama4:maverick", "245 GB", [400]],
  };

  it("19 guides total, exactly 15 tagged", () => {
    expect(allModels).toHaveLength(19);
    expect(allModels.filter((m) => m.ollamaTag)).toHaveLength(15);
  });

  it("the tagged set is exactly §6's table", () => {
    const tagged = allModels
      .filter((m) => m.ollamaTag)
      .map((m) => m.slug)
      .sort();
    expect(tagged).toEqual(Object.keys(table).sort());
  });

  for (const [slug, [tag, pullSize, params]] of Object.entries(table)) {
    it(`${slug} → ${tag} · ${pullSize} · [${params.join(", ")}]`, () => {
      const guide = allModels.find((m) => m.slug === slug);
      expect(guide).toBeDefined();
      expect(guide?.ollamaTag).toBe(tag);
      expect(guide?.pullSize).toBe(pullSize);
      expect(guide?.paramsBillions).toEqual(params);
    });
  }

  it("every tagged guide has both pullSize and paramsBillions", () => {
    for (const guide of allModels) {
      if (!guide.ollamaTag) continue;
      expect(guide.pullSize, guide.slug).toBeTruthy();
      expect(guide.paramsBillions?.length, guide.slug).toBeGreaterThan(0);
    }
  });

  it("untagged guides carry none of the pull fields", () => {
    for (const guide of allModels) {
      if (guide.ollamaTag) continue;
      expect(guide.pullSize, guide.slug).toBeUndefined();
      expect(guide.paramsBillions, guide.slug).toBeUndefined();
    }
  });

  it("the 4 guide-only slugs are untagged", () => {
    const untagged = allModels
      .filter((m) => !m.ollamaTag)
      .map((m) => m.slug)
      .sort();
    expect(untagged).toEqual(
      [
        "llama-1-33b-65b",
        "llama-1-6-7b-13b",
        "llama-4-behemoth",
        "safety-classifiers",
      ].sort(),
    );
  });

  it("no two guides share a tag", () => {
    const tags = allModels.map((m) => m.ollamaTag).filter(Boolean);
    expect(new Set(tags).size).toBe(tags.length);
  });

  it("every pullSize parses as a GB/MB figure", () => {
    for (const guide of allModels) {
      if (!guide.pullSize) continue;
      expect(guide.pullSize, guide.slug).toMatch(/^\d+(\.\d+)? (GB|MB)$/);
    }
  });
});
