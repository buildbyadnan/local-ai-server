# LLaMA 1 — 6.7B and 13B (under-30B sizes)

> **Family spans buckets:** the 32.5B and 65.2B LLaMA 1 sizes are documented in [`../30b-to-70b/llama-1.md`](../30b-to-70b/llama-1.md).

**Released:** 24 Feb 2023 · **Type:** pretrained-only base models, no chat tuning · **Status today:** discontinued (research licence, weights never officially published on HF) · **Licence:** LLaMA 1 Research Licence — **non-commercial**, application-gated (code was GPLv3)

## Variants in this bucket

| Variant | Params | Layers / d_model | Context | Training tokens | HF repo |
|---|---|---|---|---|---|
| LLaMA 6.7B (base) | 6.7B | 32 / 4,096 | 2,048 | **1.0T** | none — never officially posted |
| LLaMA 13B (base) | 13.0B | 40 / 5,120 | 2,048 | **1.0T** | none — never officially posted |

*There was no Instruct/Chat version — Llama only got instruction tuning from Llama 2-Chat onwards. Config from the LLaMA paper (arXiv:2302.13971, Table 2): RMSNorm pre-norm, SwiGLU, RoPE, 32k SentencePiece vocab, English data only (45% CommonCrawl, 4.5% C4, books, ArXiv, StackExchange…), batch 4M tokens.*

## Official benchmarks (Meta's internal eval, as re-published in the Llama 2 card)

| Model | Code (HumanEval+MBPP avg) | Math | MMLU | BBH | AGI Eval |
|---|---|---|---|---|---|
| LLaMA 7B | 14.1 | 6.95 | 35.1 | 30.3 | 23.9 |
| LLaMA 13B | 18.9 | 10.9 | 46.9 | 37.0 | 33.9 |

For scale: a 2024 Llama 3.1 **8B** scores MMLU 73.0 — i.e. the 13B's 46.9 is roughly *half* of what a 1-year-newer, 0.6×-smaller model delivers.

## What it's good at (pros)

- **It proved the central thesis of the modern LLM era:** a 7B/13B model trained on 1.0T tokens could beat **GPT-3 (175B)** on most NLP benchmarks (Meta's claim in the paper), and 65B was competitive with PaLM/Chinchilla. Data mattered more than raw parameter count.
- **Clean research baseline** — pretrained-only, no RLHF, no safety tuning: useful for mechanistic-interpretability, scaling-law, and data-mixture research where you want an *unaligned* model.
- **Historically the seed of the open ecosystem** — the March 2023 weights leak triggered the Alpaca/Vicuna/fine-tune wave and llama.cpp's ancestors.
- Still trivially runnable today (6.7B ≈ 13.5 GB BF16, computed).

## What it's NOT good at (cons)

- **No instruction following out of the box.** It completes text; without an external prompt template or a fine-tune it will not answer questions. (Chat behaviour only arrived with Llama 2.)
- **2,048-token context** — unusable for modern RAG or anything but toy documents.
- **English only** (paper: "trained only on English data").
- **Non-commercial, gated licence**, and *the weights were never officially published anywhere* — Meta distributed them case-by-case to academics. Anything you can download today is a leak or a mirror.
- **Deeply dated capability:** MMLU 35.1 (7B) / 46.9 (13B); code average 14.1. No safety mitigations; no quantized official variants; no tool use, no system prompt, no vision.
- Benchmarks above are Meta's own internal-library numbers, not third-party replications.

## Hardware & ecosystem

| | 6.7B | 13B |
|---|---|---|
| BF16 weights (computed: params × 2) | ≈ 13.5 GB | ≈ 26 GB |
| Fits on | 1× 16 GB GPU / strong laptop CPU | 1× 24–32 GB GPU |
| Ecosystem | llama.cpp GGUF + every quant format has LLaMA-1 conversions; fine-tunes are everywhere | ditto |

**Who should pick this:** researchers who specifically need the original unaligned 2023 model, or people maintaining pre-Llama-2 fine-tunes. **Everyone else should start at Llama 3.1 8B** (better in every dimension except "is literally the first Llama").

## Sources
- LLaMA paper: arXiv:2302.13971 (config Table 2, GPT-3/PaLM comparisons, training mixture) · `github.com/facebookresearch/llama` README
- Benchmark table: re-published in the official Llama 2 model card (`models/llama2/MODEL_CARD.md`)
- Leak/DMCA history and "no HF repos" verification: [`../llama-models-complete-guide.md`](../llama-models-complete-guide.md) §3.1, §6
