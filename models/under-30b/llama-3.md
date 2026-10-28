# Llama 3 — 8B (under-30B)

> **Family spans buckets:** Llama 3 **70B** is in [`../30b-to-70b/llama-3.md`](../30b-to-70b/llama-3.md).

**Released:** 18 Apr 2024 · **Type:** base + Instruct · **Status:** active (superseded by 3.1 for most uses) · **Licence:** Llama 3 Community Licence (commercial + AUP, 700M-MAU clause)

## Variants in this bucket (2 of the 4 Llama 3 HF repos)

| Variant | Exact params | Context | GQA | Tokens | Knowledge cutoff | HF repo |
|---|---|---|---|---|---|---|
| Llama 3 8B (base) | 8.030B | **8,192** | ✓ | 15T+ | Mar 2023 | `Meta-Llama-3-8B` |
| Llama 3 8B Instruct | 8.030B | 8,192 | ✓ | 15T+ | Mar 2023 | `Meta-Llama-3-8B-Instruct` |

**What changed vs Llama 2:** a **128k-vocabulary tokenizer**, ~7.5× more training tokens (15T+ vs 2T), a much better data pipeline, GQA on all sizes, and SFT+RLHF with **>10M human-annotated examples** in the instruct data. 8B pretraining cost ≈ **1.3M H100 GPU-hours** (official card).

**Popularity (HF downloads/month, 2026-10):** Instruct 340,477 · base 133,144 — still a standard small-model testbed.

## Official benchmarks (Llama 3 card, instruction-tuned)

| Benchmark | **Llama 3 8B Instruct** | Llama 2 7B chat (same table) |
|---|---|---|
| MMLU (5-shot) | **68.4** | 34.1 |
| GPQA (0-shot) | **34.2** | 21.7 |
| HumanEval (0-shot) | **62.2** | 7.9 |

Base-model rows (same card): MMLU 66.6 · BIG-Bench Hard 61.1 · ARC-Challenge 78.6 · TriviaQA 78.5 · DROP F1 58.4.

## What it's good at (pros)

- **The generational jump that made 8B viable**: HumanEval 62.2 vs Llama 2's 7.9 (same harness, same table) — a genuine code-assistant-grade small model for the first time.
- **Best "small + cheap + commercial" model of mid-2024:** 16.1 GB BF16 (computed), runs on a single consumer GPU, officially licensed for shipping products.
- **Huge, mature ecosystem:** the 128k vocab + Llama 3 architecture is what most fine-tuning recipes, GGUF quants, vLLM/SGLang defaults, and adapters target.
- Real instruction following after RLHF (usable chat without heavy prompt engineering), with Meta's system-prompt steerability work starting here.

## What it's NOT good at (cons)

- **8,192-token context — the family's weak point.** RAG over real document sets overflows immediately; you must move to 3.1's 128k.
- **Officially English-only.** The card's Out-of-scope section says *"Use in languages other than English."* (Llama 3.1 added 8 officially supported languages; Llama 3 did not.)
- **Reasoning is entry-level:** GPQA 34.2 is only modestly above chance for a 4-choice PhD-level set; no agentic/tool-use benchmark support (BFCL arrives in 3.1).
- **Knowledge cutoff March 2023** — three-plus years stale as of this writing.
- **No vision, no long context, no official quantized weights** (the official INT4 repos exist only for Llama 3.2), and no pairing guidance with the newer safety stack in this card.
- Superseded by **Llama 3.1 8B** on essentially every axis except "being the original Llama 3".

## Hardware & ecosystem

| | 8B |
|---|---|
| BF16 (computed) | ≈ 16.1 GB |
| 4-bit GGUF (community) | ≈ 5 GB |
| Typical target | 1× 16–24 GB GPU, or CPU with quant |

## Who should pick this
- **Yes:** reproducing Llama 3-era results, a small base model to fine-tune where you specifically want the Llama 3 (not 3.1) recipe, or legacy compatibility.
- **No:** new projects — **Llama 3.1 8B** gives 16× the context, official multilingual support, and tool-use benchmarks for the same weight cost.

## Sources
- Official card `models/llama3/MODEL_CARD.md` (benchmarks, English-only scope, training hours) — cached: `~/.cache/llama-research/cards/llama3_MODEL_CARD.md`
- HF API (params, downloads, repos) · [`../llama-models-complete-guide.md`](../llama-models-complete-guide.md) §3.4
