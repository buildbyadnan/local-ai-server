# Llama 3.1 70B — base and Instruct (30B–70B)

> **Family spans buckets:** 8B → [`../under-30b/llama-3.1.md`](../under-30b/llama-3.1.md) · 405B → [`../70b-plus/llama-3.1-405b.md`](../70b-plus/llama-3.1-405b.md).

**Released:** 23 Jul 2024 · **Type:** base + Instruct · **Status:** active — the reference *base* 70B of the family · **Licence:** Llama 3.1 Community Licence (commercial, distillation permitted)

## Variants in this bucket (2 of the 8 Llama 3.1 HF repos)

| Variant | Exact params | Context | GQA | Tokens | Languages | Cutoff | HF repo | Downloads/mo (2026-10) |
|---|---|---|---|---|---|---|---|---|
| Llama 3.1 70B (base) | 70.554B | **128,000** | ✓ | 15T+ | 8 supported | Dec 2023 | `Llama-3.1-70B` | 39,389 |
| Llama 3.1 70B Instruct | 70.554B | 128,000 | ✓ | 15T+ | 8 | Dec 2023 | `Llama-3.1-70B-Instruct` | 89,815 |

Architecture: 80 layers, d_model 8,192, FFN 28,672, GQA, RoPE scaled to 128k. Supported languages: English, German, French, Italian, Portuguese, Hindi, Spanish, Thai.

## Official benchmarks (Llama 3.1 card, Instruct)

| Metric | **70B** | (3.1 8B) | (3.3 70B — sibling) | (405B) |
|---|---|---|---|---|
| MMLU (CoT) | 86.0 | 73.0 | 86.0 | 88.6 |
| MMLU-Pro (CoT) | 66.4 | 48.3 | 68.9 | 73.3 |
| IFEval (steerability) | 87.5 | 80.4 | **92.1** | 88.6 |
| GPQA Diamond (CoT) | 48.0 | 31.8 | **50.5** | 49.0 |
| HumanEval | 80.5 | 72.6 | 88.4 | 89.0 |
| MBPP EvalPlus | 86.0 | 72.8 | 87.6 | 88.6 |
| MATH (CoT) | 68.0 | 51.9 | **77.0** | 73.8 |
| BFCL v2 (tool use) | 77.5 | 65.4 | 77.3 | 81.1 |
| MGSM | 86.9 | 68.9 | 91.1 | 91.6 |

## What it's good at (pros)

- **The complete generalist:** 128k context + 8 languages + tool use (BFCL 77.5) + strong code (HumanEval 80.5) in one 70B — the default "one model for everything" inside the Llama ecosystem.
- **Both base *and* Instruct exist** — you can fine-tune it (Llama 3.3 has no base release, which makes 3.1 70B the practical fine-tuning starting point for the family's top tier).
- **Licence explicitly allows distillation** — legitimate teacher model for synthetic-data pipelines.
- Solid long-context RAG/workhorse at 141 GB BF16 (computed) / ~40 GB 4-bit, with every serving stack supporting it natively.
- Numbers are Meta's official harness with a clear 8B/70B/405B spread you can trust for relative judgments *within the family*.

## What it's NOT good at (cons)

- **Beaten by its own younger sibling at the same size:** Llama 3.3 70B beats it on IFEval (92.1 vs 87.5), GPQA (50.5 vs 48.0) and MATH (77.0 vs 68.0) for the same weight — if you don't need a base model, 3.3 is the better pick.
- **Reasoning gap vs the frontier:** GPQA 48.0 was competitive in mid-2024, not in 2026.
- **Knowledge cutoff Dec 2023**; text-only (no vision/audio); no official quantized weights.
- English-centric multilingual (8 supported languages; the card warns against others without fine-tuning).
- 141 GB BF16 makes full-precision serving a 2×80 GB-GPU proposition; throughput is dense-70B-era, i.e. slow compared with Llama 4's 17B-active MoE at similar quality.

## Hardware & ecosystem

| | 70B |
|---|---|
| BF16 (computed) | ≈ 141 GB (2× 80 GB) |
| FP8/INT8 (community) | ≈ 70 GB |
| 4-bit GGUF (community) | ≈ 40 GB |
| Typical target | 2× A100/H100 80GB; or single-node FP8 |

## Who should pick this
- **Yes:** fine-tuning/continuing-pretraining a top-tier Llama base; long-context workloads where you want a *base* model; distillation teacher; licence-continuity with Llama 3.1 terms.
- **No:** pure inference chat — **Llama 3.3 70B Instruct** beats it on steerability/reasoning/math at identical size; multimodal needs go to Llama 4.

## Sources
- Official card `models/llama3_1/MODEL_CARD.md` (benchmarks, languages, architecture, licence) — cached: `~/.cache/llama-research/cards/llama3_1_MODEL_CARD.md`
- HF API · sibling comparison table: [`../llama-models-complete-guide.md`](../llama-models-complete-guide.md) §3.5 / §3.8
