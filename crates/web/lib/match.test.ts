import { describe, expect, it } from "vitest";
import { allModels } from "@/data/models";
import { baseName, isTextOnlyChat, matchInstalled, parseBillions } from "@/lib/match";
import type { InstalledModel } from "@/lib/ollama-types";

/** Build an installed model the way `GET /api/tags` reports one. */
function installed(name: string, parameterSize: string): InstalledModel {
  return { name, size: 0, parameterSize, families: [] };
}

/**
 * §10.3's asserted fixture table — the §6 matching rules (exact tag, else
 * same family + ±25% of any nominal count) re-derived per case, including
 * the negatives: a foreign family with plausible params must never badge,
 * and a family member with wildly different params must badge only its own
 * guide.
 */
describe("matchInstalled (§10.3 fixture table)", () => {
  const cases: Array<{
    model: [string, string];
    slugs: string[];
    why: string;
  }> = [
    {
      model: ["llama3.2:latest", "3.2B"],
      slugs: ["llama-3-2-1b-3b"],
      why: "same family, 3.2B within ±25% of 3 — but not of 1 alone",
    },
    {
      model: ["llama3.1:8b", "8.0B"],
      slugs: ["llama-3-1-8b"],
      why: "exact tag",
    },
    {
      model: ["llama3.1:70b", "70B"],
      slugs: ["llama-3-1-70b"],
      why: "family matches the 8B guide too, but ±25% must exclude it",
    },
    {
      model: ["llama3.1:405b", "405B"],
      slugs: ["llama-3-1-405b"],
      why: "installed >30B still badges its own guide (§6)",
    },
    { model: ["mistral:7b", "7.6B"], slugs: [], why: "foreign family" },
    { model: ["qwen2.5:7b", "7.6B"], slugs: [], why: "foreign family (CLI's own test tag)" },
    {
      model: ["llama3.2-vision:latest", "10.7B"],
      slugs: ["llama-3-2-vision-11b"],
      why: "vision family, 10.7B within ±25% of 11 — never the 90B guide",
    },
    {
      model: ["llama2:13b", "13B"],
      slugs: ["llama-2-7b-13b"],
      why: "guide covers 7 and 13; 70B guide excluded by tolerance",
    },
    {
      model: ["codellama:70b", "70B"],
      slugs: ["codellama-34b-70b"],
      why: "70 is nominal for the 34b–70b guide, not the 7b–13b one",
    },
    {
      model: ["llama4:scout", "109B"],
      slugs: ["llama-4-scout"],
      why: "exact; maverick (400) excluded by tolerance",
    },
    {
      model: ["llama3.2:1b", "1.2B"],
      slugs: ["llama-3-2-1b-3b"],
      why: "1.2B within ±25% of 1",
    },
    {
      model: ["llama3.2:3b", "3.2B"],
      slugs: ["llama-3-2-1b-3b"],
      why: "exact tag",
    },
  ];

  for (const { model, slugs, why } of cases) {
    it(`${model[0]} (${model[1]}) → ${slugs.length ? slugs.join(", ") : "no badge"} — ${why}`, () => {
      const map = matchInstalled([installed(model[0], model[1])], allModels);
      expect([...map.keys()].sort()).toEqual(slugs);
    });
  }

  it("several installed models accumulate across guides", () => {
    const map = matchInstalled(
      [
        installed("llama3.1:8b", "8.0B"),
        installed("llama3.2:latest", "3.2B"),
        installed("mistral:7b", "7.6B"),
      ],
      allModels,
    );
    expect([...map.keys()].sort()).toEqual(["llama-3-1-8b", "llama-3-2-1b-3b"]);
    expect(map.get("llama-3-1-8b")).toEqual(["llama3.1:8b"]);
  });

  it("one guide lists every installed model that satisfies it", () => {
    const map = matchInstalled(
      [installed("llama3.2:latest", "3.2B"), installed("llama3.2:3b", "3.2B")],
      allModels,
    );
    expect(map.get("llama-3-2-1b-3b")).toEqual(["llama3.2:3b", "llama3.2:latest"]);
  });

  it("guide-only entries (no ollamaTag) never match", () => {
    const guideOnly = allModels.filter((m) => !m.ollamaTag);
    expect(guideOnly.length).toBeGreaterThan(0);
    const map = matchInstalled(
      [installed("llama1:7b", "6.7B"), installed("llama4-behemoth", "200B")],
      guideOnly,
    );
    expect(map.size).toBe(0);
  });

  it("an unparseable parameter_size still matches on exact tag only", () => {
    const map = matchInstalled([installed("llama3.1:8b", "")], allModels);
    expect([...map.keys()]).toEqual(["llama-3-1-8b"]);
  });

  it("an installed model with no parameter_size at all matches nothing by family", () => {
    const map = matchInstalled([installed("llama3.2:latest", "")], allModels);
    expect(map.size).toBe(0);
  });
});

describe("parseBillions (port of catalog.rs:186-195)", () => {
  it.each([
    ["8.0B", 8],
    ["3.2B", 3.2],
    ["13B", 13],
    ["109B", 109],
    ["405B", 405],
    ["1.2B", 1.2],
    ["7.6B", 7.6],
    ["10.7B", 10.7],
    ["", null],
    ["B", null],
    ["unknown", null],
  ])("%s → %s", (input, expected) => {
    expect(parseBillions(input)).toBe(expected);
  });
});

describe("baseName", () => {
  it.each([
    ["llama3.1:8b", "llama3.1"],
    ["llama3.2:latest", "llama3.2"],
    ["llama3.2-vision:11b", "llama3.2-vision"],
    ["nomic-embed-text", "nomic-embed-text"],
  ])("%s → %s", (input, expected) => {
    expect(baseName(input)).toBe(expected);
  });
});

describe("isTextOnlyChat (§5.2 chip variant)", () => {
  it("marks vision and llama4 guides, nothing else", () => {
    const marked = allModels.filter(isTextOnlyChat).map((m) => m.ollamaTag);
    expect(marked.sort()).toEqual([
      "llama3.2-vision:11b",
      "llama3.2-vision:90b",
      "llama4:maverick",
      "llama4:scout",
    ]);
  });
});
