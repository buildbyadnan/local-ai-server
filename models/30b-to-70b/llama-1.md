# LLaMA 1 — 32.5B and 65.2B (30B–70B sizes)

> **Family spans buckets:** the 6.7B / 13B sizes are in [`../under-30b/llama-1.md`](../under-30b/llama-1.md).

**Released:** 24 Feb 2023 · **Type:** pretrained-only base, no chat tuning · **Status:** discontinued, weights never officially published · **Licence:** LLaMA 1 Research Licence — **non-commercial** (code GPLv3)

## Variants in this bucket

| Variant | Params | Layers / d_model / heads | Context | Training tokens |
|---|---|---|---|---|
| LLaMA 33B* | 32.5B | 60 / 6,656 / 52 | 2,048 | **1.4T** |
| LLaMA 65B* | 65.2B | 80 / 8,192 / 64 | 2,048 | **1.4T** |

*Meta's paper and blog wrote "33B/65B"; the exact parameter counts are 32.5B / 65.2B (paper Table 2, confirmed by every downstream conversion). Config: RMSNorm pre-norm, SwiGLU, RoPE, 32k SentencePiece, **English-only** data mix, batch 4M tokens, LR 1.5e-4.

## Official benchmarks (Meta's internal eval, as re-published in the Llama 2 card)

| Model | Code (HumanEval+MBPP avg) | Math | MMLU | BBH | AGI Eval |
|---|---|---|---|---|---|
| LLaMA 33B | 26.0 | 21.4 | 57.8 | 39.8 | 41.7 |
| LLaMA 65B | 30.7 | 30.8 | 63.4 | 43.5 | 47.6 |

In 2023 these were headline numbers: 65B was competitive with PaLM-class models at a fraction of the compute; 33B was the community's favourite fine-tuning base for over a year.

## What it's good at (pros)

- **The tier that *was* the ecosystem.** 33B was the sweet spot for A100-era fine-tuning (OpenLLaMA-adjacent recipes, countless 33B/65B instruct derivatives) and 65B was the first "run a serious model yourself" checkpoint.
- **Untouched base models** — ideal for research on scaling, data mixtures, or alignment techniques where you need to start from raw pretraining.
- Strong-for-2023 capability density: 1.4T tokens on 32.5B/65.2B proved the data-over-parameters thesis at scale.
- Still runnable today (32.5B ≈ 65 GB, 65.2B ≈ 130 GB BF16, computed).

## What it's NOT good at (cons)

- **No instruction tuning whatsoever** — completion-only prompting; every practical use requires a fine-tune or external template.
- **2,048-token context** — the worst in the entire Llama family; unusable for modern workloads.
- **English only**, no safety tuning, no system prompt, no tool use, no quantized official variants.
- **Non-commercial licence + leaked weights:** Meta never published these officially; distribution today is through mirrors/leaks, which is a compliance problem for any real product.
- **Capability is frozen in early 2023:** MMLU 63.4 (65B) is below Llama 3.1 **8B**'s 73.0 — a 2024 model 8× smaller beats it on the same metric family.
- The benchmark table above is Meta's internal harness, never independently standardized at release.

## Hardware & ecosystem

| | 32.5B | 65.2B |
|---|---|---|
| BF16 (computed) | ≈ 65 GB | ≈ 130 GB |
| 4-bit GGUF (community) | ≈ 20 GB | ≈ 38 GB |
| Typical target (2026) | 1× 80 GB GPU | 2× 80 GB / multi-GPU |

Ecosystem: fully supported by llama.cpp and every quant toolchain (they were built *for* these shapes), but no vendor support beyond community efforts.

## Who should pick this
- **Yes:** research reproductions of the original LLaMA paper, historical fine-tune archaeology, or a non-commercial study starting from raw 2023 pretraining.
- **No:** everything else — 30B-class *usable* models start at Code Llama 34B and modern quality starts at Llama 3/3.1.

## Sources
- LLaMA paper arXiv:2302.13971 (Table 2 configs, token counts) · benchmark table re-published in the official Llama 2 card
- History/licence/leak verification: [`../llama-models-complete-guide.md`](../llama-models-complete-guide.md) §3.1
