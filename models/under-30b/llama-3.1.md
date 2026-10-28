# Llama 3.1 — 8B (under-30B)

> **Family spans buckets:** Llama 3.1 **70B** → [`../30b-to-70b/llama-3.1.md`](../30b-to-70b/llama-3.1.md); **405B** → [`../70b-plus/llama-3.1-405b.md`](../70b-plus/llama-3.1-405b.md).

**Released:** 23 Jul 2024 · **Type:** base + Instruct · **Status:** active — still the family's default small workhorse · **Licence:** Llama 3.1 Community Licence (commercial; **explicitly permits synthetic-data distillation**)

## Variants in this bucket (2 of the 8 Llama 3.1 HF repos)

| Variant | Exact params | Context | GQA | Tokens | Languages | Cutoff | HF repo |
|---|---|---|---|---|---|---|---|
| Llama 3.1 8B (base) | 8.030B | **128,000** | ✓ | 15T+ | 8 officially supported | Dec 2023 | `Llama-3.1-8B` |
| Llama 3.1 8B Instruct | 8.030B | 128,000 | ✓ | 15T+ | 8 | Dec 2023 | `Llama-3.1-8B-Instruct` |

Architecture: 32 layers, d_model 4,096, FFN 14,336, RoPE scaled for 128k, GQA. Supported languages: **English, German, French, Italian, Portuguese, Hindi, Spanish, Thai** (trained on more; others are fine-tune-at-your-own-risk per the card).

**Popularity (HF downloads/month, 2026-10):** **Instruct 4,833,514 · base 602,534** — by far the most-downloaded Llama of any size; the de-facto small default across tooling.

## Official benchmarks (Llama 3.1 card, Instruct)

| Metric | **3.1 8B** | (sibling 70B) | (405B) |
|---|---|---|---|
| MMLU (CoT) | 73.0 | 86.0 | 88.6 |
| MMLU-Pro (CoT) | 48.3 | 66.4 | 73.3 |
| IFEval (steerability) | **80.4** | 87.5 | 88.6 |
| GPQA Diamond (CoT) | **31.8** | 48.0 | 49.0 |
| HumanEval | 72.6 | 80.5 | 89.0 |
| MBPP EvalPlus | 72.8 | 86.0 | 88.6 |
| MATH (CoT) | 51.9 | 68.0 | 73.8 |
| BFCL v2 (tool use) | 65.4 | 77.5 | 81.1 |
| MGSM (multilingual math) | 68.9 | 86.9 | 91.6 |

## What it's good at (pros)

- **128k context at 8B** — the single biggest practical upgrade over Llama 3's 8k: whole-document RAG, long transcripts, large code files, in a 16.1 GB (computed) BF16 model.
- **Official multilingual support (8 languages)** instead of Llama 3's English-only scope, with a real MGSM 68.9 to show for it.
- **Tool use / agentic viability:** BFCL v2 65.4 is respectable for a model this size — enough for structured function-calling pipelines.
- **Strong code for its size:** HumanEval 72.6 / MBPP 72.8 — better than the Code Llama family's headline numbers, on a *general* model.
- **Licence explicitly allows distillation** — legal to use as a teacher for synthetic data.
- Enormous ecosystem and download base; every serving stack supports it out of the box.

## What it's NOT good at (cons)

- **Hard reasoning remains its ceiling:** GPQA Diamond **31.8** (chance for 4-choice is 25) — do not pick it for PhD-level science Q&A, complex planning, or multi-step math beyond GSM/MATH-level.
- **Knowledge cutoff Dec 2023.** Nothing from 2024–2026.
- **Text-only** — vision requires Llama 3.2 Vision (11B) or Llama 4.
- Multilingual is "supported", not "equal": Meta's own card warns against conversing in unsupported languages without fine-tuning; performance is English-centric.
- 8B-scale hallucination and shallow world knowledge persist; with a knowledge-heavy workload you need RAG regardless.
- Dated relative to 2026 small models (this is a 2024 model; Meta's own Muse line and current open-weight rivals at ~8B have moved past it).

## Hardware & ecosystem

| | 8B |
|---|---|
| BF16 (computed) | ≈ 16.1 GB |
| 4-bit GGUF (community) | ≈ 5 GB |
| Typical target | 1× 16–24 GB GPU; quantized CPU/viable |

## Who should pick this
- **Yes (still, in 2026):** default small in-family assistant — long-context RAG, summarization, rewriting, tool-calling, multilingual-lite, distillation teacher for tiny models, and anything that must run cheap.
- **No:** hard reasoning/knowledge tasks (go 3.3 70B or a newer non-Llama model), vision, or up-to-date information.

## Sources
- Official card `models/llama3_1/MODEL_CARD.md` (benchmarks table, supported-languages note, distillation clause) — cached: `~/.cache/llama-research/cards/llama3_1_MODEL_CARD.md`
- HF API (exact params via `expand[]=safetensors`, downloads, repos) · [`../llama-models-complete-guide.md`](../llama-models-complete-guide.md) §3.5
