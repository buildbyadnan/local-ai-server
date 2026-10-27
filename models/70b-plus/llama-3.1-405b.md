# Llama 3.1 405B — the flagship (70B+)

> **Family spans buckets:** 8B → [`../under-30b/llama-3.1.md`](../under-30b/llama-3.1.md) · 70B → [`../30b-to-70b/llama-3.1.md`](../30b-to-70b/llama-3.1.md).

**Released:** 23 Jul 2024 · **Type:** base + Instruct, plus **FP8** conversions of both · **Status:** active; superseded in role by Llama 4 Maverick · **Licence:** Llama 3.1 Community Licence (commercial; **explicitly permits distillation/synthetic data**)

## Variants in this bucket (4 of the 8 Llama 3.1 repos)

| Variant | Exact params | Precision | HF repo | Downloads/mo (2026-10) |
|---|---|---|---|---|
| Llama 3.1 405B (base) | 405.853B | BF16 | `Llama-3.1-405B` | 28,921 |
| Llama 3.1 405B Instruct | 405.853B | BF16 | `Llama-3.1-405B-Instruct` | 9,375 |
| Llama 3.1 405B **FP8** (base) | 405.853B | FP8 | `Llama-3.1-405B-FP8` | **463,039** |
| Llama 3.1 405B Instruct **FP8** | 405.853B | FP8 | `Llama-3.1-405B-Instruct-FP8` | 377 |

**Architecture (official card):** 126 layers · d_model 16,384 · FFN 53,248 · 128 heads / 8 KV heads (GQA) · RoPE scaled to 128k · 15T+ tokens · cutoff Dec 2023 · 8 supported languages · training cost ≈ **440,000 petaFLOP-days**. At release it was **the largest openly available LLM in the world**.

## Official benchmarks (Llama 3.1 card, Instruct)

| Metric | (8B) | (70B) | **405B** | (3.3 70B — beats it here) |
|---|---|---|---|---|
| MMLU (CoT) | 73.0 | 86.0 | **88.6** | 86.0 |
| MMLU-Pro (CoT) | 48.3 | 66.4 | **73.3** | 68.9 |
| IFEval | 80.4 | 87.5 | 88.6 | **92.1** |
| GPQA Diamond (CoT) | 31.8 | 48.0 | 49.0 | **50.5** |
| HumanEval | 72.6 | 80.5 | **89.0** | 88.4 |
| MBPP EvalPlus | 72.8 | 86.0 | **88.6** | 87.6 |
| MATH (CoT) | 51.9 | 68.0 | 73.8 | **77.0** |
| **BFCL v2 (tool use)** | 65.4 | 77.5 | **81.1** | 77.3 |
| MGSM | 68.9 | 86.9 | 91.6 | 91.1 |

## What it's good at (pros)

- **Highest general capability of the dense Llama 3.x line:** best-in-family MMLU-Pro 73.3, HumanEval 89.0, MBPP 88.6, and **BFCL 81.1 — the best tool-use number of any dense Llama** (only Llama 4 Maverick beats it, at 81.x→Maverick GPQA/LCB class).
- **The reference "open frontier" model of 2024** — everyone benchmarked against it; countless papers, leaderboards, and comparisons anchor on it, making it the most *documented* open weight set in existence.
- **Officially licensed distillation teacher** (the 3.1 licence explicitly allows using outputs to train other models) — the reason so many small models cite 405B synthetic data.
- **FP8 exists and is the practical form:** the FP8 base repo alone gets 463k downloads/month; FP8 halves weights to ~405 GB and Meta published its FP8 quantization implementation alongside the paper.
- 128k context, 8 languages, base *and* Instruct — full flexibility.

## What it's NOT good at (cons)

- **Hardware reality check, from Meta's own paper (Llama 3 herd, §6.1):** *"When using a BF16 number representation for the model parameters, Llama 3 405B does not fit in the GPU memory of a single machine with 8 Nvidia H100 GPUs… we parallelize model inference… across 16 GPUs on two machines."* Full BF16 = **≈812 GB** (computed) — 2 nodes minimum; FP8 (§6.2) brings it to one 8×H100 node (≈405 GB + activations/KV).
- **Beaten by its own 70B child on three headline axes:** 3.3 70B scores higher on IFEval (92.1 vs 88.6), GPQA (50.5 vs 49.0) and MATH (77.0 vs 73.8) — 5× smaller and cheaper. The 405B's case is breadth, tool use, and MMLU-Pro, not "best at everything."
- **Cost to serve:** even FP8 is a full-node model; dense 405B decode throughput is modest versus MoE rivals; energy/ops burden is an order of magnitude over 70B-class.
- **Knowledge cutoff Dec 2023**, text-only, no official INT4/GGUF, and no vision.
- GPQA 49.0 in absolute terms is modest by 2026 standards; the model is 2+ years old and Meta's attention has moved to Muse.
- Gated HF access (licence acceptance) and the standard source-available caveats.

## Hardware & ecosystem

| | 405B |
|---|---|
| BF16 (computed) | ≈ 812 GB → **2 nodes × 8×H100** (paper §6.1) |
| FP8 (official repos) | ≈ 405 GB weights → 1 node × 8×H100 (paper §6.2) |
| 4-bit GGUF (community) | ≈ 200–220 GB (multi-GPU / CPU-offload) |
| Real-world serving | vLLM/SGLang tensor+pipeline parallel; cloud instances (AWS/GCP/Azure + inference providers); DeepSpeed-FastGen/Meta's FP8 code |

## Who should pick this
- **Yes:** distillation/synthetic-data teacher, benchmark reference, maximum-quality Llama text pipeline where 405B-class breadth (MMLU-Pro, tool use) justifies a node, and reproducing 2024-era frontier results.
- **No:** everyday serving (3.3 70B matches/beats it on key axes at 1/5 the memory), tight budgets, vision, or post-2023 knowledge.

## Sources
- Official card `models/llama3_1/MODEL_CARD.md` (benchmark table, architecture, languages, licence) — cached: `~/.cache/llama-research/cards/llama3_1_MODEL_CARD.md`
- Llama 3 paper arXiv:2407.21783 **§6.1/§6.2** (BF16 does not fit one 8×H100 machine; FP8 method) — HTML cached: `~/.cache/llama-research/herd.html`
- HF API (params, FP8 download counts) · sibling comparison: [`../llama-models-complete-guide.md`](../llama-models-complete-guide.md) §3.5
