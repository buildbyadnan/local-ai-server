/**
 * Single source of truth for the model directory.
 * The tree, the /llama index, and generateStaticParams all derive from here,
 * so slugs can never drift between them.
 */

import type { ModelGuide, TierId } from "./types";
import { under30bGuides } from "./under-30b";
import { midTierGuides } from "./30-70b";
import { bigTierGuides } from "./70b-plus";

export * from "./types";

export const allModels: ModelGuide[] = [
  ...under30bGuides,
  ...midTierGuides,
  ...bigTierGuides,
];

export function getModel(slug: string): ModelGuide | undefined {
  return allModels.find((m) => m.slug === slug);
}

export function modelsInTier(tier: TierId): ModelGuide[] {
  return allModels.filter((m) => m.tier === tier);
}
