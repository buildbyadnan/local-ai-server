/**
 * Shared types + registry for the plain-English model guides.
 * All content is derived from the researched docs in models/ — no new claims.
 */

export type TierId = "under-30b" | "30-70b" | "70b-plus";

export interface GuidePoint {
  title: string;
  desc: string;
}

export interface TimelineEntry {
  label: string;
  text: string;
}

export interface Fact {
  label: string;
  value: string;
}

export interface ModelGuide {
  /** URL: /llama/<slug> */
  slug: string;
  /** Display name */
  name: string;
  tier: TierId;
  /** One-liner under the title */
  tagline: string;
  released: string;
  sizeLabel: string;
  contextLabel: string;
  /**
   * Exact `ollama pull` tag when this guide maps to a registry model.
   * Guides without it are guide-only — never a
   * chip, never a Pull button.
   */
  ollamaTag?: string;
  /** Download size for the confirm step ("4.9 GB"). Required with `ollamaTag`. */
  pullSize?: string;
  /** Nominal parameter counts (billions) — §6's matching rule compares an
      installed `parameter_size` against these at ±25%. Required with
      `ollamaTag`. */
  paramsBillions?: number[];
  /** What is this model? (plain words) */
  whatIsIt: string[];
  /** Why was it made / what problem? */
  whyMade: string[];
  /** What does the size mean in human terms (hardware, where it runs)? */
  sizeInHumanTerms: string[];
  goodFor: GuidePoint[];
  notGoodFor: GuidePoint[];
  /** Flaws and honest limitations */
  flaws: string[];
  /** How later models improved on this one */
  laterImprovements: TimelineEntry[];
  whoShould: string;
  whoShouldnt: string;
  facts: Fact[];
  sourceNote: string;
}

export interface Tier {
  id: TierId;
  label: string;
  path: string;
  blurb: string;
}

export const tiers: Tier[] = [
  {
    id: "under-30b",
    label: "Under 30B",
    path: "under 30B",
    blurb:
      "The small models — light enough for a laptop, phone, or a single modest graphics card. Fast and cheap, but the smartest answers come from the bigger tiers.",
  },
  {
    id: "30-70b",
    label: "30–70B",
    path: "30–70B",
    blurb:
      "The sweet spot of the family: big enough to reason well, small enough to run on one or two good graphics cards. Most people's default choice.",
  },
  {
    id: "70b-plus",
    label: "70B+",
    path: "70B+",
    blurb:
      "The heavyweights — the smartest, most capable Llama models ever released, and the most demanding on hardware. Includes the mixture-of-experts models where most experts stay asleep per answer.",
  },
];
