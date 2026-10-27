# Llama 3.2 Vision 90B — the big vision model (70B+)

> **Family spans buckets:** Vision **11B** → [`../under-30b/llama-3.2-vision-11b.md`](../under-30b/llama-3.2-vision-11b.md).

**Launched:** 25 Sept 2024 (Connect 2024) · **Type:** base + Instruct, image+text in / text out · **Status:** active but low-adoption · **Licence:** Llama 3.2 Community Licence

## Variants in this bucket (2 of the 4 Vision repos)

| Variant | Exact params | Input | Context | HF repo | Downloads/mo (2026-10) |
|---|---|---|---|---|---|
| Llama 3.2 Vision 90B (base) | 88.593B | text + image | 128,000 | `Llama-3.2-90B-Vision` | **42** |
| Llama 3.2 Vision 90B Instruct | 88.593B | text + image | 128,000 | `Llama-3.2-90B-Vision-Instruct` | **499** |

**How it works:** same adapter design as the 11B — a cross-attention vision adapter feeding a SigLIP-style encoder into an **unmodified Llama 3.1 70B** text backbone (its text MMLU in the card is 86.0, i.e. literally the 70B's number), trained on 6B image+text pairs. **Image+text is English-only**; text-only supports the usual 8 languages (card's wording).

## Official benchmarks (Instruct; 90B column, 11B sibling in parentheses)

| Task | **90B** | (11B) |
|---|---|---|
| **DocVQA (test)** | **90.1** | (88.4) |
| **ChartQA (test, CoT)** | **85.5** | (83.4) |
| AI2 Diagram (test) | 92.3 | (91.1) |
| VQAv2 (test) | 78.1 | (75.2) |
| MMMU (val, CoT) | **60.3** | (50.7) |
| MMMU-Pro Standard | 45.2 | (33.0) |
| MMMU-Pro Vision | 33.8 | (23.7) |
| MathVista (testmini) | 57.3 | (51.5) |
| *(text)* MMLU (CoT) | 86.0 | (73.0) |

Base-model rows: DocVQA 70.7 · ChartQA 54.2 · MMMU 49.3.

## What it's good at (pros)

- **Strongest document/chart understanding of any Llama-3-era model:** DocVQA 90.1, AI2 Diagram 92.3 — real extraction quality for scans, contracts, infographics.
- **Carries the full 70B text brain** (MMLU 86.0, MATH 68.0, 128k context) — long-context multimodal analysis in one checkpoint.
- **Meaningful step up from 11B on hard visual reasoning:** MMMU 60.3 vs 50.7, MMMU-Pro 45.2 vs 33.0 — the gap is where the 70B backbone pays off.
- Adapter design means text-side tooling/fine-tune recipes from Llama 3.1 still apply; commercial licence; still officially maintained in the 70-repo set.

## What it's NOT good at (cons)

- **English-only image understanding** (explicit in the card) — a hard blocker for non-English document AI.
- **Bolted-on vision, outclassed by Llama 4:** Maverick posts MMMU 73.4, ChartQA 90.0, DocVQA 94.4 with natively-fused multimodality and 17B-active decode — better *and* cheaper to run per token.
- **Nobody is using it:** 42 and 499 monthly downloads (2026-10) — the weakest adoption of any non-safety Llama in the 70-repo set; ecosystem/quant support is correspondingly thin.
- **Heavy:** ≈177 GB BF16 (computed) for an adapter model; ~60 GB at 4-bit; no official FP8/INT4 variant.
- **Multimodal reasoning ceiling:** MMMU-Pro Vision 33.8 is entry-level for a model of this size; no video/audio, no documented multi-image behaviour.
- Knowledge cutoff Dec 2023; 2024-era adapter architecture versus 2025+ native multimodal models.

## Hardware & ecosystem

| | 90B |
|---|---|
| BF16 (computed) | ≈ 177 GB (2× 80 GB minimum) |
| 4-bit GGUF (community) | ≈ 60 GB |
| Typical target | 2× 80 GB GPUs |

## Who should pick this
- **Yes:** you're standardized on Llama 3.1/3.2 and need the best-in-generation document/chart OCR-VQA, or you need vision with 128k context and Llama-3.1 text behaviour.
- **No:** new multimodal projects — **Llama 4 Maverick** beats it on every vision metric; **11B** covers most document tasks at 1/6 the memory.

## Sources
- Official card `models/llama3_2/MODEL_CARD_VISION.md` (both benchmark columns, English-only image note, adapter architecture) — cached: `~/.cache/llama-research/cards/llama3_2_VISION_MODEL_CARD.md`
- HF API (params, downloads) · Llama 4 comparison numbers: `models/llama4/MODEL_CARD.md` · [`../llama-models-complete-guide.md`](../llama-models-complete-guide.md) §3.6
