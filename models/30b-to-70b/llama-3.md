# Llama 3 70B — base and Instruct (30B–70B)

> **Family spans buckets:** Llama 3 **8B** is in [`../under-30b/llama-3.md`](../under-30b/llama-3.md).

**Released:** 18 Apr 2024 · **Type:** base + Instruct · **Status:** active but superseded by 3.1/3.3 · **Licence:** Llama 3 Community Licence (commercial + AUP)

## Variants in this bucket (2 of the 4 Llama 3 HF repos)

| Variant | Exact params | Context | GQA | Tokens | Cutoff | HF repo | Downloads/mo (2026-10) |
|---|---|---|---|---|---|---|---|
| Llama 3 70B (base) | 70.554B | **8,192** | ✓ | 15T+ | Dec 2023 | `Meta-Llama-3-70B` | 82,180 |
| Llama 3 70B Instruct | 70.554B | 8,192 | ✓ | 15T+ | Dec 2023 | `Meta-Llama-3-70B-Instruct` | 30,992 |

Training cost: **6.4M H100 GPU-hours** (official card). Instruct tuned with SFT + RLHF (>10M human-annotated examples across the Llama 3 instruct data). 128k tokenizer vocabulary, GQA, 15T+ tokens.

## Official benchmarks (Llama 3 card)

| Benchmark | **Llama 3 70B Instruct** | Llama 2 70B chat (same table) |
|---|---|---|
| MMLU (5-shot) | **82.0** | 52.9 |
| GPQA (0-shot) | **39.5** | 21.0 |
| HumanEval (0-shot) | **81.7** | 25.6 |

Base-model rows: MMLU 79.5 · BIG-Bench Hard 81.3 · ARC-Challenge 93.0 · TriviaQA 89.7 · DROP F1 79.7. From the 3.1 card's comparison: MMLU-Pro (CoT) 63.4.

**At launch** Meta showed 70B Instruct beating **Gemini Pro 1.5** and **Claude 3 Sonnet** on most reported benchmarks — it was the open-weight model of record through mid-2024 and powered the Meta AI assistant rollout (Facebook/WhatsApp/Instagram).

## What it's good at (pros)

- **The 2024 open-weight benchmark leader:** HumanEval 81.7, MMLU 82.0 — a genuine "best available open model" for months.
- **Base + Instruct pair** — one of the few strong 70Bs you could both deploy *and* fine-tune (3.3 later dropped the base).
- Proven at massive production scale (Meta AI's assistant ran on it), with full serving-stack support (vLLM, TGI, tensor/pipeline parallelism patterns all battle-tested on this exact checkpoint).
- 141 GB BF16 (computed) / ~40 GB 4-bit — the canonical "one big box" model.

## What it's NOT good at (cons)

- **8,192-token context** — the decisive flaw; Llama 3.1's 128k arrived three months later and made 3 obsolete for long-document work.
- **English-only** (card: *"Use in languages other than English"*).
- **Reasoning was mid even for 2024:** GPQA 39.5 is well below where the 2024–2026 field moved; MATH-class math performance trails 3.1/3.3.
- Knowledge cutoff **Dec 2023**; no vision, no tool-use benchmark support of the 3.1 era, no official quantized weights.
- Directly beaten by its own successor at the same size: Llama 3.1 70B (128k + 8 languages + BFCL 77.5) and then Llama 3.3 70B (IFEval 92.1, GPQA 50.5, MATH 77.0).
- Llama 3-era refusal/format behaviours are dated versus Llama 4's tone work.

## Hardware & ecosystem

| | 70B |
|---|---|
| BF16 (computed) | ≈ 141 GB (2× 80 GB) |
| 4-bit GGUF (community) | ≈ 40 GB |
| Typical target | 2× A100/H100 80GB, or 4× consumer with offload |

## Who should pick this
- **Yes:** reproducing Meta AI-era results, a base+Instruct pair where you must fine-tune the 70B yourself, or a legacy deployment pinned to the Llama 3 licence.
- **No:** new projects — **Llama 3.1 70B** (base, 128k) or **Llama 3.3 70B Instruct** (best-in-family) replace it at the same size.

## Sources
- Official card `models/llama3/MODEL_CARD.md` (both benchmark tables, GPU-hours, English-only scope) — cached: `~/.cache/llama-research/cards/llama3_MODEL_CARD.md`
- HF API · launch framing: [`../llama-models-complete-guide.md`](../llama-models-complete-guide.md) §3.4
