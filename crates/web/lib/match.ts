/**
 * Installed-model ↔ guide matching (CONNECTIVITY_PLAN §6) — a faithful
 * adaptation of the llama CLI's `catalog_entry_for` (catalog.rs:206-229),
 * family constraint included:
 *
 *  1. exact tag → that guide;
 *  2. else same base name (text before ":") **and** the installed
 *     `parameter_size` within ±25% of any nominal count the guide covers;
 *  3. guides without an `ollamaTag` never match (they are guide-only).
 *
 * Pure functions so the whole rule is unit-testable against §10.3's
 * fixture table — the browser never re-derives it.
 */
import type { ModelGuide } from "@/data/models";
import type { InstalledModel } from "@/lib/ollama-types";

/**
 * Port of `parse_billions` (catalog.rs:186-195): take the leading
 * `[0-9.]` run and `parseFloat` it — `"8.0B"` → 8, `"109B"` → 109,
 * `"3.2B"` → 3.2, `""`/garbage → null.
 */
export function parseBillions(parameterSize: string): number | null {
  const run = /^[0-9.]*/.exec(parameterSize)?.[0] ?? "";
  const value = Number.parseFloat(run);
  return Number.isNaN(value) ? null : value;
}

/** Registry base name — everything before the `:` tag separator. */
export function baseName(tag: string): string {
  const cut = tag.indexOf(":");
  return cut === -1 ? tag : tag.slice(0, cut);
}

/** ±25% relative deviation — the CLI's tolerance, ported. */
function withinTolerance(actual: number, nominal: number): boolean {
  return nominal > 0 && Math.abs(actual - nominal) / nominal <= 0.25;
}

/**
 * Which guides this machine's models satisfy, as `slug → matched tags`
 * (sorted, so UI choices are deterministic). A guide can match several
 * installed models — e.g. the 1B–3B guide when both `llama3.2:1b` and
 * `llama3.2:latest` are present.
 */
export function matchInstalled(
  installed: InstalledModel[],
  guides: ModelGuide[],
): Map<string, string[]> {
  const matches = new Map<string, string[]>();
  for (const guide of guides) {
    const tag = guide.ollamaTag;
    if (!tag) continue; // rule 3
    const nominal = guide.paramsBillions ?? [];
    const family = baseName(tag);
    const hits = installed
      .filter((model) => {
        if (model.name === tag) return true; // rule 1
        if (baseName(model.name) !== family) return false; // rule 2: family
        const actual = parseBillions(model.parameterSize);
        return actual !== null && nominal.some((n) => withinTolerance(actual, n));
      })
      .map((model) => model.name)
      .sort();
    if (hits.length > 0) matches.set(guide.slug, hits);
  }
  return matches;
}

/**
 * Chat in this UI has no image input, so an installed vision/llama4 model
 * gets the `✓ installed (text chat)` variant of the chip (§5.2). Keyed off
 * the guide's tag — the guide is what the chip annotates.
 */
export function isTextOnlyChat(guide: ModelGuide): boolean {
  const tag = guide.ollamaTag ?? "";
  return tag.startsWith("llama3.2-vision:") || tag.startsWith("llama4:");
}
