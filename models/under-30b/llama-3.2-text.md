# Llama 3.2 text — 1B and 3B (under-30B, the edge/on-device pair)

**Launched:** 25 Sept 2024 (Connect 2024; the text card says "Oct 24, 2024" — a documentation slip) · **Type:** base + Instruct + **official INT4 quantized** · **Status:** active · **Licence:** Llama 3.2 Community Licence

## Variants in this bucket (6 text + 4 quantized = 10 repos)

| Variant | Exact params | Context | Tokens | Cutoff | HF repo | Downloads/mo (2026-10) |
|---|---|---|---|---|---|---|
| Llama 3.2 1B (base) | 1.236B | 128,000 | up to 9T | Dec 2023 | `Llama-3.2-1B` | 534,994 |
| Llama 3.2 1B Instruct | 1.236B | 128,000 | up to 9T | Dec 2023 | `Llama-3.2-1B-Instruct` | **3,488,705** |
| Llama 3.2 1B Instruct **QLoRA INT4** | 1.236B | 128,000 | — | — | `...-QLORA_INT4_EO8` | 34 |
| Llama 3.2 1B Instruct **SpinQuant INT4** | 1.236B | 128,000 | — | — | `...-SpinQuant_INT4_EO8` | 75 |
| Llama 3.2 3B (base) | 3.213B | 128,000 | up to 9T | Dec 2023 | `Llama-3.2-3B` | 234,396 |
| Llama 3.2 3B Instruct | 3.213B | 128,000 | up to 9T | Dec 2023 | `Llama-3.2-3B-Instruct` | 1,106,217 |
| Llama 3.2 3B Instruct **QLoRA / SpinQuant INT4** | 3.213B | 128,000 | — | — | 2 repos | 39 / 40 |

**How they were built (official card):** pruned from the Llama 3.1 lineage with **logits from Llama 3.1 8B and 70B used as token-level targets during pretraining**, then knowledge distillation to recover performance after pruning; shared input/output embeddings to shrink the embedding table. The four INT4 repos are Meta's **first officially published quantized Llama weights** (4-bit, 8-bit exponent offset; SpinQuant = rotation to de-outlier weights, QLoRA = NF4-style).

**Scale note:** the card says these are *"expected to be deployed in highly constrained environments, such as mobile devices"* and calls them *"smaller and less capable derivatives of Llama 3.1"* — Meta's own framing.

## Official benchmarks (Instruct, bf16, Llama 3.2 card)

| Metric | **1B** | **3B** | (Llama 3.1 8B for scale) |
|---|---|---|---|
| MMLU (5-shot) | 49.3 | 63.4 | 69.4 |
| IFEval (instruction following) | 59.5 | **77.4** | 80.4 |
| GSM8K (CoT) | 44.4 | 77.7 | 84.5 |
| MATH (CoT) | 30.6 | 48.0 | 51.9 |
| ARC-C (0-shot) | 59.4 | 78.6 | 83.4 |
| GPQA (0-shot) | **27.2** | **32.8** | 32.8 |
| BFCL v2 (tool use) | **25.7** | **67.0** | 67.1 |
| TLDR9+ summarization (rougeL) | 16.8 | 19.0 | 17.2 |
| Open-rewrite (rougeL) | 41.6 | 40.1 | 40.9 |

**Quantization cost (same card):** QLoRA INT4 keeps MMLU at 49.0 (1B) / 62.4 (3B) — near-lossless; a *vanilla* PTQ falls to 43.3 / 60.5, which is exactly why Meta shipped SpinQuant/QLoRA rather than naive 4-bit.

## What it's good at (pros)

- **Genuine on-device class:** 1B ≈ 2.5 GB / 3B ≈ 6.4 GB BF16 (computed), ≈1 GB / ≈2 GB at the official INT4 — phone/NPU/Raspberry-Pi territory, with Meta's ExecuTorch/mobile path built around exactly these.
- **128k context at 1–3B** — absurdly good ratio; long-document summarization and retrieval on-device.
- **3B is a real small assistant:** IFEval 77.4 (near the 8B's 80.4), GSM8K 77.7, BFCL 67.0 — instruction-following and light tool-use actually work.
- **Official 4-bit weights** (both QLoRA and SpinQuant flavours) — no guessing about which community quant is sane.
- **Distilled quality:** punching above raw 1B/3B pretraining because the 8B/70B taught them token-level.
- Best-in-class of the *Llama* family for: rewrite, classify, extract, RAG-answer, summarise, query-rewrite.

## What it's NOT good at (cons)

- **1B's knowledge is thin:** MMLU 49.3 and **BFCL 25.7** — tool calling on the 1B is effectively broken; don't build agents on it.
- **Hard reasoning is out of reach:** GPQA 27.2 (1B) and 32.8 (3B) are at/near chance — both are *equal to or worse than the 8B on GPQA*; the card itself frames the pair as "less capable derivatives."
- **1B summarization is mediocre** (rougeL 16.8 vs the 8B's 17.2 despite being the target task — you can't beat distillation ceilings).
- **Knowledge cutoff Dec 2023**; officially supported languages only (8 for text; anything else is fine-tune-at-your-own-risk).
- Text-only — no vision; no agentic long-horizon reliability; safety profile differs (Meta recommends **Llama Guard 3 1B** as the matching lightweight guardrail for constrained deployments).
- INT4 variants are Instruct-only (no quantized base models) and official support stops at transformers/ExecuTorch tooling of that era.

## Hardware & ecosystem

| | 1B | 3B |
|---|---|---|
| BF16 (computed) | ≈ 2.5 GB | ≈ 6.4 GB |
| Official INT4 (computed) | ≈ 1 GB | ≈ 2 GB |
| Typical target | phone / NPU / CPU | laptop CPU, 4–8 GB GPU |

Ecosystem: llama.cpp GGUF (all quants), Ollama, LM Studio, ExecuTorch, Apple/Core ML conversions, ONNX — the 3B especially is one of the best-supported small models ever.

## Who should pick this
- **Yes:** on-device and edge AI, privacy-local RAG/summarize/rewrite, query rewriting in front of a bigger model, classification, or a tiny distillation student.
- **No:** knowledge Q&A, science/math reasoning, agents (use 3B+ for tools, and preferably 8B+), vision, anything needing 2024+ facts.

## Sources
- Official card `models/llama3_2/MODEL_CARD.md` (benchmarks, distillation recipe, quantization table, constrained-environment framing) — cached: `~/.cache/llama-research/cards/llama3_2_MODEL_CARD.md`
- HF API (exact params, downloads, repos) · [`../llama-models-complete-guide.md`](../llama-models-complete-guide.md) §3.7
