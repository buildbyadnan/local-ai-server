# Llama 4 Behemoth — announced 5 Apr 2025, **never released** (70B+)

**Status: there are no weights.** Behemoth is the one Llama that was announced and never shipped — so this file documents what was promised, what is confirmed, and how the "never" was verified.

## What Meta announced (5 Apr 2025, Llama 4 launch)

| Spec | Value (as announced) |
|---|---|
| Active parameters | **288B** per token |
| Total parameters | **~2T** |
| Experts | 16 routed (MoE, same generation as Scout) |
| Role | **Teacher model** — Llama 4 Maverick was *co-distilled from Behemoth* (official Llama 4 card) |
| Training status at launch | **"still training"** — Meta said it would be released later once it passed safety/quality checks (including "model-behavior evaluations" Meta described at the time) |
| HF repo / weights | **none** |

**Context:** Meta positioned Behemoth as the model that would compete with GPT-4.5-class and Gemini "Pro" systems — the flagship of the flagship. It was never positioned as a consumer product.

## What happened (as of 2026-10-26)

**No Behemoth release, in any form.** The last official Meta weights ever published to the `meta-llama` Hugging Face org were **Prompt Guard 2 on 2025-04-28**, and the org still contains **exactly 70 repos** — none named Behemoth or containing ~2T parameters. Meta reorganised into Meta Superintelligence Labs, stopped the Llama line at Llama 4, and pivoted to the **Muse** family (Muse Spark 2026-04-08 onward), none of which is a Behemoth release.

**Verification of the negative claim (4 independent checks, full detail in [`../llama-models-complete-guide.md`](../llama-models-complete-guide.md) §10):**
1. **Hugging Face:** `api/models?author=meta-llama` → exactly 70 repos, newest `createdAt` = 2025-04-28. A 2T Behemoth release would be impossible to miss.
2. **Meta's own site:** `llama.com` model navigation (fetched 2026-10-26) lists Llama 4, Llama Guard 4, Llama 3.3 — no Behemoth weights, no "Llama Behemoth" entry.
3. **GitHub:** `meta-llama/llama-models` — release tree contains only llama2/llama3/llama3_1/llama3_2/llama3_3/llama4; last release `v0.2.0` (2025-04-05).
4. **News record:** no Reuters/CNBC/TechCrunch/Verge/NYT/Guardian article announces a Behemoth release through 2026-10-25; unrelated third-party "Behemoth" models on HF belong to other authors.

## What it's good at (pros) — of the *idea*, and what did survive

- **Its knowledge did ship — inside Maverick.** Maverick was co-distilled from Behemoth, so the strongest Llama's capability exists only as a derivative: you can use **Llama 4 Maverick** to access what Behemoth taught it (GPQA 69.8, LiveCodeBench 43.4, MMMU 73.4).
- The announcement established the **teacher→student distillation strategy** Meta still describes (and the Llama 3.1 licence's distillation clause gives the legal pattern for doing it yourself with 405B).
- As a documented artifact, it is a clean case study in "announced ≠ released" for capacity planning: never count a model you cannot download.

## What it's NOT good at (cons)

- **It cannot be used, benchmarked, fine-tuned, or served — it doesn't exist publicly.** Any leaderboard, API, or "Behemoth" model you find is not Meta's.
- **No independent evaluation of any kind** (obviously): all capability statements are Meta's launch framing.
- The delay/never-release became a symbol of the Llama 4 era's troubles — reported launch pushbacks for models "failing to meet internal expectations" (The Information, via The Verge's Apr 2025 coverage), LeCun's later "results were fudged" comments about Llama 4, and the GenAI-org reorganisation that followed.
- If your roadmap assumed a 2T open teacher from Meta: that assumption is void as of Oct 2026.

## Alternatives inside the family
- **Llama 4 Maverick (FP8)** — the distilled successor, strongest overall Llama.
- **Llama 3.1 405B** — the *released* large-scale distillation teacher (licence explicitly allows it).

## Sources
- Llama 4 official card (Maverick co-distilled from Behemoth; 288B/~2T/16E figures from the launch table) — cached: `~/.cache/llama-research/cards/llama4_MODEL_CARD.md`
- HF API (70-repo inventory, newest 2025-04-28) · llama.com nav (fetched 2026-10-26) · GitHub `meta-llama/llama-models` releases/tree
- News-record check (Google News RSS through 2026-10-25) · Full verification write-up: [`../llama-models-complete-guide.md`](../llama-models-complete-guide.md) §10
