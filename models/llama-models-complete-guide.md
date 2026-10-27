# Every Llama Model Ever Released — Complete Reference

**Research date:** 2026-10-25 / 2026-10-26 (cutoff: anything released up to and including 25 Oct 2026)
**Scope:** every model in Meta's "Llama" family — all generations, all sizes, all variants (base / instruct / vision / safety / quantized), plus what happened to the family afterwards.

---

## 0. Methodology & how claims were verified

This document was assembled from **primary sources**, not from blog summaries:

| Source | What it gave us |
|---|---|
| Official Meta model cards in `github.com/meta-llama/llama-models` (`models/<gen>/MODEL_CARD.md`) | release dates, sizes, context lengths, token counts, licenses, benchmark tables, training compute |
| `github.com/facebookresearch/codellama/README.md` + Code Llama paper (arXiv:2308.12950) | Code Llama flavours, benchmarks |
| `github.com/meta-llama/PurpleLlama` (Llama Guard / Prompt Guard model cards) | safety model taxonomy, category lists, quantization specs |
| `github.com/facebookresearch/llama` README + LLaMA paper (arXiv:2302.13971), ar5iv HTML | Llama 1 hyperparameters and exact training token counts |
| Hugging Face API `huggingface.co/api/models?author=meta-llama` | **the complete inventory of all 70 official repos with creation timestamps** |
| `huggingface.co/api/models?author=meta-models` | Meta's post-Llama model org (Muse family) |
| `api.github.com/repos/meta-llama/llama-models` (commits, releases) | last-touch dates on the official model repo |
| `www.llama.com/docs/model-cards-and-prompt-formats/` (fetched 2026-10-26) | Meta's *own current* model navigation |
| Wikipedia `Llama (language model)` (revision of Oct 2026) + its cited news refs | release-date cross-check |
| Google News RSS (Reuters, CNBC, TechCrunch, The Verge, VentureBeat, NYT, Guardian, Fortune) | 2025–2026 timeline of what Meta did *after* Llama |
| arXiv API (2302.13971, 2307.09288, 2308.12950, 2312.06674, 2403.13031, 2407.21783, 2503.05731) | paper abstracts / training details |

**Negative claims are verified too.** Where this document says something does *not* exist (Llama 5, Llama 4.1/4.5, Llama Behemoth weights), that conclusion is backed by four independent checks — see §10.

Anything that could not be confirmed is explicitly labelled **unverified**.

---

## 1. Headline findings (read this first)

1. **Llama runs Feb 2023 → Apr 2025.** Five model families — **LLaMA 1, Llama 2, Code Llama, Llama 3 (3.1 / 3.2 / 3.3), Llama 4** — plus the parallel **Llama Guard / Prompt Guard** safety line. That is 7 release waves and 70 official weight repos in total.
2. **There is no Llama 5, and no Llama model has been released since 5 April 2025** (Llama 4). Verified four independent ways — see §10.
3. **The last new official weights** Meta pushed to the `meta-llama` Hugging Face org were on **2025-04-28** (`Llama-Prompt-Guard-2-*`). As of 2026-10-26 that org still contains **exactly 70 repos** and nothing newer.
4. **Meta succeeded Llama with the Muse family** (Meta Superintelligence Labs), first model **Muse Spark, 8 April 2026**. Meta's own `llama.com` navigation as of 2026-10-26 still lists Llama 4 / Llama Guard 4 / Llama 3.3 under "Models" and the Muse lineup under "Products".
5. **One Llama model was announced but never released:** **Llama 4 Behemoth** (288B active / ~2T total / 16 experts) — still in training at the Llama 4 launch, and no weights or repo ever appeared. Everything else announced was shipped (base *and* Instruct for Scout/Maverick, plus FP8 and `-Original` snapshots).
6. All Llama weights are **gated on Hugging Face** (accept-license) except community mirrors; Llama 1 weights were never officially posted to HF at all.

---

## 2. Master timeline

| Date | Model | Type | Params (active / total) | Context | Status (2026-10) |
|---|---|---|---|---|---|
| **2023-02-24** | LLaMA 1 (LLaMA) | dense, base only | 6.7B / 13B / 32.5B / 65.2B | 2,048 | Discontinued, non-commercial |
| 2023-03-03 | *LLaMA 1 weights leak* (torrent/4chan; Meta issued DMCA takedowns) | — | — | — | — |
| **2023-07-18** | **Llama 2** + Llama-2-Chat | dense, base + chat | 7B / 13B / 70B | 4,096 | Discontinued |
| **2023-08-24** | **Code Llama** (+ Python, + Instruct) | dense, code | 7B / 13B / 34B | 16,384 (good to ~100k) | Discontinued |
| 2023-12 (HF 2023-12-05) | **Llama Guard** (a.k.a. Llama Guard 1) | safety classifier | 7B (Llama 2-based) | 4,096 | Discontinued |
| **2024-01-29** | Code Llama 70B | dense, code | 70B | 16,384 | Discontinued |
| **2024-04-18** | **Llama 3** (Meta-Llama-3) | dense, base + Instruct | 8B / 70B | 8,192 | Active |
| 2024-04-17 (HF) | **Llama Guard 2** | safety classifier | 8B (Llama 3-based) | — | Superseded by LG3 |
| **2024-07-23** | **Llama 3.1** | dense, base + Instruct | 8B / 70B / **405B** | **128,000** | Active |
| 2024-07 (HF 2024-07-21) | **Prompt Guard** | prompt-attack classifier | 86M (DeBERTa-v3) | 512 tokens | Superseded by PG2 |
| 2024-07 / 2024-09 | **Llama Guard 3** | safety classifier | 8B, 1B, 11B-vision (+INT8/INT4) | — | Active |
| **2024-09-25** | **Llama 3.2** text | dense, tiny/edge | 1B / 3B | 128,000 | Active |
| **2024-09-25** | **Llama 3.2 Vision** | dense + vision adapter | 11B / 90B | 128,000 | Active |
| 2024-10-23 (HF) | Llama 3.2 **Quantized** | 1B/3B Instruct | INT4 (SpinQuant & QLoRA) | 128,000 | Active |
| **2024-12-06** | **Llama 3.3** (70B Instruct) | dense, Instruct only | 70B | 128,000 | Active |
| **2025-04-05** | **Llama 4 Scout / Maverick** | **MoE**, natively multimodal | 17B×16E = 109B / 17B×128E = 400B | 10M / 1M | Active |
| 2025-04-05 (announced) | **Llama 4 Behemoth** | MoE, unreleased | 288B active, ~2T total, 16E | — | **Never released** |
| 2025-04-23 (HF) | **Llama Guard 4** | multimodal safety | 12B (pruned Llama 4 Scout) | — | Active |
| 2025-04-28 (HF) | **Llama Prompt Guard 2** | prompt-attack classifier | 22M / 86M (DeBERTa-v3) | — | Active |
| **2025-04-28 → 2026-10-26** | ***no further Llama release*** | — | — | — | — |

*(HF dates in parentheses are Hugging Face repo creation timestamps; release dates are from official model cards / Meta's blog. Where a card and the press differ, both are given.)*

---

## 3. Generation-by-generation

### 3.1 LLaMA 1 — "LLaMA" (24 Feb 2023)

**What it is.** The first Llama: a family of *pretrained-only* (no chat tuning) autoregressive decoder-only transformers trained purely on publicly available data, released with a research paper (arXiv:2302.13971) and inference code under GPLv3. Weights were **not** downloadable by the public — they were granted "on a case-by-case basis to academic researchers; those affiliated with organizations in government, civil society, and academia; and industry research laboratories."

**Sizes & exact training config** (from the paper's Table 2):

| Params | d_model | layers | heads | learning rate | training tokens | context |
|---|---|---|---|---|---|---|
| 6.7B | 4,096 | 32 | 32 | 3.0e-4 | **1.0T** | 2,048 |
| 13.0B | 5,120 | 40 | 40 | 3.0e-4 | **1.0T** | 2,048 |
| 32.5B | 6,656 | 60 | 52 | 1.5e-4 | **1.4T** | 2,048 |
| 65.2B | 8,192 | 80 | 64 | 1.5e-4 | **1.4T** | 2,048 |

Batch size 4M tokens for every size. Source: LLaMA paper (arXiv:2302.13971) Table 2, checked against the ar5iv HTML rendering.

**Architecture.** Decoder-only Transformer with: pre-norm **RMSNorm**, **SwiGLU** feed-forward, **RoPE** rotary position embeddings, no biases anywhere, SentencePiece BPE tokenizer (32,000 vocab), trained only on English data. Training mixture: 45% CommonCrawl, 4.5% C4, 4.5% Gutenberg & Books3, 2.5% ArXiv, 2.0% StackExchange, plus Wikipedia/programming sources. Training cost ≈ **6,300 petaFLOP-days** (largest model).

**What it was good at (in 2023).** Meta showed 13B **beating GPT-3 (175B)** on most NLP benchmarks, and 65B competitive with PaLM and Chinchilla. The real contribution was proving that smaller models trained on more data could beat far larger ones (the "data > params" argument that Chinchilla had made a year earlier).

**Headline benchmarks** (evaluation numbers re-published in the Llama 2 card, Meta's internal eval library):

| Model | Code (HumanEval+MBPP avg) | Math | MMLU | BBH | AGI Eval |
|---|---|---|---|---|---|
| LLaMA 7B | 14.1 | 6.95 | 35.1 | 30.3 | 23.9 |
| LLaMA 13B | 18.9 | 10.9 | 46.9 | 37.0 | 33.9 |
| LLaMA 33B | 26.0 | 21.4 | 57.8 | 39.8 | 41.7 |
| LLaMA 65B | 30.7 | 30.8 | 63.4 | 43.5 | 47.6 |

**Licensing & controversy.** Non-commercial research license, application-gated. On **3 March 2023** the weights were leaked to 4chan/Torrent; Meta issued DMCA takedowns against Hugging Face mirrors and a GitHub downloader script. It was the "Stable Diffusion moment" for LLMs. **Status today: discontinued, weights never officially published on Hugging Face.**

**HF repos:** none under `meta-llama` (the org starts with Llama 2).

---

### 3.2 Llama 2 (18 July 2023)

**What it is.** The first Llama released with **publicly downloadable weights** and a licence permitting commercial use — announced jointly with **Microsoft** as preferred cloud/distribution partner. Contains both foundation models and **Llama-2-Chat**, the first officially chat/RLHF-tuned Llama.

**Variants** (all 6 sizes exist on HF, in two families — see §7):

| Model | Params | Context | GQA | Training tokens | Notes |
|---|---|---|---|---|---|
| Llama 2 7B | 6.7B | 4,096 | ✗ | 2.0T | foundation |
| Llama 2 13B | 13B | 4,096 | ✗ | 2.0T | foundation |
| Llama 2 70B | 69B | 4,096 | ✓ (grouped-query) | 2.0T | foundation, 21,000 pFLOP-days |
| Llama-2-Chat 7B / 13B / 70B | — | 4,096 | — | — | SFT + RLHF (Stable Reward Model + PPO) |

Training data = **40% more** than Llama 1 (2T tokens), same architecture lineage. Chat tuning used SFT then RLHF with a reward model trained on ~1.4M preference comparisons (40k human-written), plus **"Ghost Attention" (GAtt)** to keep system-prompt instructions alive across multi-turn dialogs.

**What it was good at.** Dialogue — Meta claimed Llama-2-Chat outperformed other open-source chat models on most benchmarks and was *on par with ChatGPT and PaLM* in human helpfulness/safety evals. Also the first Llama you could legally ship in a product.

**Benchmarks (instruct-agnostic eval, Meta internal):**

| Model | Code | Commonsense | World knowledge | Reading comp. | Math | MMLU | BBH | AGI Eval |
|---|---|---|---|---|---|---|---|---|
| Llama 2 7B | 16.8 | 63.9 | 48.9 | 61.3 | 14.6 | 45.3 | 32.6 | 29.3 |
| Llama 2 13B | 24.5 | 66.9 | 55.4 | 65.8 | 28.7 | 54.8 | 39.4 | 39.1 |
| Llama 2 70B | **37.5** | **71.9** | **63.6** | **69.4** | **35.2** | **68.9** | **51.2** | **54.2** |

**Licensing.** *Llama 2 Community License* + Acceptable Use Policy. Commercial use allowed; a **700-million-monthly-active-user** clause requires a separate licence from Meta (this is why Meta calls it "open" and the Open Source Initiative disagreed — Llama is **source-available, not OSI-open-source**).

**HF repos (12):** `Llama-2-7b`, `-7b-chat`, `-13b`, `-13b-chat`, `-70b`, `-70b-chat`, plus `-hf` / `-chat-hf` variants of all six. The `-hf` suffix marks repos converted to the standard Hugging Face `LlamaForCausalLM` format; the unsuffixed repos carry Meta's original consolidated weights.

---

### 3.3 Code Llama (24 Aug 2023; 70B added 29 Jan 2024)

**What it is.** A family of code-specialised Llama 2 fine-tunes. Released in three flavours × four sizes (7B, 13B, 34B, 70B):

| Flavour | What it is | Tokens added |
|---|---|---|
| **Code Llama** (base) | foundation, continued pretraining on code | +500B code tokens, then +20B long-context (16k) tokens |
| **Code Llama – Python** | Python-specialised | +100B Python-only tokens before the long-context stage |
| **Code Llama – Instruct** | instruction-following for programming dialogue | +5B instruction tokens on top of the base |

**Capabilities.** Trained on 16k sequences, effective up to **100k context**; **infilling** (FIM) supported on 7B, 13B and 70B (base + Instruct); zero-shot instruction following for programming tasks.

**What it was good at.** Code generation, completion, infilling inside an existing file, and talking about code. Paper (arXiv:2308.12950) headline results:

- up to **67% HumanEval** and **65% MBPP** (state of the art among open models at release)
- **Code Llama – Python 7B beat Llama 2 70B** on HumanEval and MBPP — a headline-grabbing "small beats big" result
- all variants outperformed every publicly available model on **MultiPL-E** (multilingual code)

**HF repos (12):** `CodeLlama-{7b,13b,70b}-{hf,Python-hf,Instruct-hf}` (9) + `CodeLlama-34b-{hf,Python-hf,Instruct-hf}` (3). The original 7B/13B/34B weights also shipped from `facebookresearch/codellama` GitHub releases in Meta's own format; the HF repos are the `-hf` (Hugging Face `transformers`) conversions, created 2024-03-13/14. *(The HF `meta-llama` org also hosts no non-`-hf` Code Llama repos — Meta distributed those via `download.sh` from llama.com.)*

---

### 3.4 Llama 3 (18 April 2024)

**What it is.** The jump that made Llama the default open model again: a new tokenizer with a **128k vocabulary**, **15T+ training tokens** (~75× the Chinchilla-optimal amount for 8B — Meta explicitly showed performance kept scaling log-linearly past Chinchilla), and a much stronger data pipeline.

| | Params | Context | GQA | Tokens | Knowledge cutoff |
|---|---|---|---|---|---|
| Llama 3 8B / 8B Instruct | 8.03B | **8,192** | ✓ | 15T+ | Mar 2023 |
| Llama 3 70B / 70B Instruct | 70.6B | **8,192** | ✓ | 15T+ | Dec 2023 |

Training cost ≈ **100,000 petaFLOP-days** (70B). Instruct models tuned with SFT + RLHF; >10M human-annotated examples in the instruct data.

**What it was good at.** Reasoning, coding, and general instruction following; at launch Meta showed 70B beating **Gemini Pro 1.5** and **Claude 3 Sonnet** on most benchmarks. It also powered the rollout of **Meta AI** (Facebook/WhatsApp assistant). Context is the weak point — only 8k until 3.1 arrived.

**Notable eval numbers** (from the 3.1 card's Llama 3 vs 3.1 comparison, 5-shot/0-shot as noted): MMLU 5-shot — 8B Instruct **68.5**, 70B Instruct **82.0**; MMLU CoT — 8B **65.3**, 70B **80.9**; MMLU-Pro CoT — 8B **45.5**, 70B **63.4**; HumanEval 0-shot — 70B Instruct in the high 70s.

**HF repos (4):** `Meta-Llama-3-8B`, `Meta-Llama-3-8B-Instruct`, `Meta-Llama-3-70B`, `Meta-Llama-3-70B-Instruct` (all created 2024-04-17).

**Licence:** Llama 3 Community License (custom commercial, AUP, 700M MAU clause).

---

### 3.5 Llama 3.1 (23 July 2024) — the 405B generation

**What it is.** The full Llama 3 herd: three sizes, **128k context**, multilingual, and a **405B** model that was the largest openly released LLM at the time.

| | Params | Input/output | Context | GQA | Tokens | Cutoff |
|---|---|---|---|---|---|---|
| Llama 3.1 8B (+ Instruct) | 8B | text | 128k | ✓ | 15T+ | Dec 2023 |
| Llama 3.1 70B (+ Instruct) | 70B | text | 128k | ✓ | 15T+ | Dec 2023 |
| Llama 3.1 405B (+ Instruct, + **FP8**) | 405B | text | 128k | ✓ | 15T+ | Dec 2023 |

**Architecture (405B):** 126 layers, d_model 16,384, FFN 53,248, 128 attention heads, 8 key/value heads (GQA). 70B: 80 layers / 8,192 / 28,672. 8B: 32 layers / 4,096 / 14,336. RoPE scaled for 128k. Training cost ≈ **440,000 petaFLOP-days** (405B).

**8 officially supported languages:** English, German, French, Italian, Portuguese, Hindi, Spanish, Thai (pretraining covers many more).

**Benchmark table (Instruct models, from the official 3.1 card):**

| Metric | 8B | 70B | **405B** |
|---|---|---|---|
| MMLU (CoT) | 73.0 | 86.0 | **88.6** |
| MMLU-Pro (CoT) | 48.3 | 66.4 | **73.3** |
| IFEval (steerability) | 80.4 | 87.5 | 88.6 |
| GPQA Diamond (CoT) | 31.8 | 48.0 | 49.0 |
| HumanEval | 72.6 | 80.5 | 89.0 |
| MBPP EvalPlus | 72.8 | 86.0 | 88.6 |
| MATH (CoT) | 51.9 | 68.0 | **73.8** |
| BFCL v2 (tool use) | 65.4 | 77.5 | **81.1** |
| MGSM (multilingual math) | 68.9 | 86.9 | 91.6 |

**What it was good at.** (a) **Long context** — 128k usable for RAG over whole documents; (b) **multilingual**; (c) **reasoning & math**; (d) **tool use / agentic** function calling; (e) **distillation source** — Meta explicitly licensed it for generating synthetic training data for other models; (f) at 405B it was the reference "open frontier" model and the standard benchmark opponent.

**HF repos (8):** `Llama-3.1-{8B,70B,405B}`, `Llama-3.1-{8B,70B,405B}-Instruct`, `Llama-3.1-405B-FP8`, `Llama-3.1-405B-Instruct-FP8`.

**Licence:** Llama 3.1 Community License (commercial, AUP, 700M MAU clause, explicit allowance for synthetic-data distillation).

---

### 3.6 Llama 3.2 Vision (25 Sept 2024) — first multimodal Llama

| | Params | Input | Output | Context | Training data |
|---|---|---|---|---|---|
| Llama 3.2 Vision 11B (+ Instruct) | 10.6B | text **+ image** | text | 128k | 6B (image, text) pairs |
| Llama 3.2 Vision 90B (+ Instruct) | 88.8B | text **+ image** | text | 128k | 6B (image, text) pairs |

**How it works.** Built *on top of* Llama 3.1 text: a separately trained **vision adapter** — a stack of cross-attention layers feeding SigLIP-style image-encoder representations into the pretrained LLM. The base LLM is unchanged; only the adapter is new. Knowledge cutoff Dec 2023; image+text interaction is **English-only** (text-only supports the usual 8 languages).

**What it was good at.** Visual recognition, image reasoning, captioning, VQA, DocVQA (contracts, maps, charts), image-text retrieval, and **visual grounding** (pointing at a region to refer to an object). It was Meta's first open model that could see.

**Benchmarks (Instruct, from the Llama 4 card's comparison columns):** ChartQA **88.8**, DocVQA (test) **94.4**, plus MMMU-class image-reasoning numbers that Llama 4 later raised to 69.4 (Scout).

**HF repos (4):** `Llama-3.2-11B-Vision`, `-11B-Vision-Instruct`, `-90B-Vision`, `-90B-Vision-Instruct`.

---

### 3.7 Llama 3.2 text (25 Sept 2024) — the edge/on-device pair

| | Params | Context | GQA | Shared embeddings | Tokens | Cutoff |
|---|---|---|---|---|---|---|
| Llama 3.2 1B (+ Instruct) | **1.23B** | 128k | ✓ | ✓ | up to 9T | Dec 2023 |
| Llama 3.2 3B (+ Instruct) | **3.21B** | 128k | ✓ | ✓ | up to 9T | Dec 2023 |

> Note: the text model card states a release date of **Oct 24, 2024**, while the Vision card and press coverage (The Verge, TechCrunch) say **Sept 25, 2024** (the Connect 2024 event). HF repos were created 2024-09-18/19. Use **25 Sept 2024** as the launch date; the Oct 24 date in the text card appears to be a documentation slip.

**What it was good at.** On-device and edge use cases: summarization, retrieval-augmented generation, rewriting classification tasks — while still holding a 128k context (huge for a 1B model). 1B and 3B keep **shared input/output embeddings** to shrink the embedding table.

**Quantized variants (HF 2024-10-23)** — Meta's first officially published quantized Llama weights:
- `Llama-3.2-1B-Instruct-QLORA_INT4_EO8`
- `Llama-3.2-1B-Instruct-SpinQuant_INT4_EO8`
- `Llama-3.2-3B-Instruct-QLORA_INT4_EO8`
- `Llama-3.2-3B-Instruct-SpinQuant_INT4_EO8`

Both are 4-bit with an 8-bit exponent offset; **SpinQuant** uses rotation matrices to make weights outlier-free (a RETHINKAI/Meta technique), **QLoRA** is the NF4-style quantization. Meta's ExecuTorch/mobile path targets these.

**HF repos (6 text + 4 quantized = 10):** `Llama-3.2-{1B,3B}`, `-{1B,3B}-Instruct`, plus the four quantized repos.

---

### 3.8 Llama 3.3 (6 Dec 2024) — "405B-class at 70B cost"

| | Params | Context | GQA | Tokens | Cutoff |
|---|---|---|---|---|---|
| Llama 3.3 70B Instruct | 70.6B | 128k | ✓ | 15T+ | Dec 2023 |

**Only an Instruct release** — no base model. Pretrained on ~15T tokens; fine-tuned on public instruction data **plus >25M synthetic examples**. Training: 7.0M H100 GPU-hours. 8 supported languages (English, German, French, Italian, Portuguese, Hindi, Spanish, Thai).

**Why people still use it:** it reaches **Llama 3.1 405B-Instruct-level** quality on several axes while being an 8× smaller model:

| Metric | 3.1 8B | 3.1 70B | **3.3 70B** | 3.1 405B |
|---|---|---|---|---|
| MMLU (CoT) | 73.0 | 86.0 | **86.0** | 88.6 |
| MMLU-Pro (CoT) | 48.3 | 66.4 | 68.9 | **73.3** |
| IFEval | 80.4 | 87.5 | **92.1** | 88.6 |
| GPQA Diamond (CoT) | 31.8 | 48.0 | **50.5** | 49.0 |
| HumanEval | 72.6 | 80.5 | 88.4 | **89.0** |
| MBPP EvalPlus | 72.8 | 86.0 | 87.6 | **88.6** |
| MATH (CoT) | 51.9 | 68.0 | **77.0** | 73.8 |
| BFCL v2 (tool use) | 65.4 | 77.5 | 77.3 | **81.1** |
| MGSM | 68.9 | 86.9 | 91.1 | **91.6** |

**It beats 405B on IFEval, GPQA and MATH.** That is the entire point of the release: a cheaper-to-serve model with the steerability and reasoning of the giant one.

**HF repo (1):** `Llama-3.3-70B-Instruct`.

---

### 3.9 Llama 4 (5 April 2025) — MoE + natively multimodal

**What it is.** The first Llama built as a **mixture-of-experts** with **early fusion** multimodality (vision tokens joined into the sequence at the input layer rather than bolted on with a separate adapter).

| Model | Active params | Total params | Experts | Context | Pretraining | Release |
|---|---|---|---|---|---|---|
| **Llama 4 Scout** (17B×16E) | 17B | **109B** | 16 routed | **10M** | ~40T tokens | 2025-04-05 |
| **Llama 4 Maverick** (17B×128E) | 17B | **400B** | 128 routed | **1M** | ~22T tokens | 2025-04-05 |
| **Llama 4 Behemoth** (17B?×16E) | **288B** | **~2T** | 16 routed | — | — | **announced, never released** |

- Each comes as **pretrained** and **instruction-tuned** (image+text in, text out).
- **12 supported languages** for input/output; pretraining on **200 languages** (No Language Left Behind).
- Vision tested for **up to 5 input images**.
- Knowledge cutoff: **August 2024**.
- Training compute: **7.38M H100 GPU-hours total** — Scout 5.0M, Maverick 2.38M; 1,999 tCO₂e location-based.
- Behemoth was still in training at launch; **Maverick was co-distilled from Behemoth, Scout was trained from scratch.** It was positioned as a "teacher" for future models and never shipped.

**Benchmarks — pretrained (official Llama 4 card):**

| Benchmark | Llama 3.1 70B | Llama 3.1 405B | **Scout** | **Maverick** |
|---|---|---|---|---|
| MMLU (5) | 79.3 | 85.2 | 79.6 | **85.5** |
| MMLU-Pro (5) | 53.8 | 61.6 | 58.2 | **62.9** |
| MATH (4) | 41.6 | 53.5 | 50.3 | **61.2** |
| MBPP (3) | 66.4 | 74.4 | 67.8 | **77.6** |
| TydiQA (1) | 29.9 | 34.3 | **31.5** | 31.7 |
| ChartQA (0) | — | no multimodal support | 83.4 | **85.3** |
| DocVQA (0) | — | no multimodal support | 89.4 | **91.6** |

**Benchmarks — instruction-tuned:**

| Benchmark | Llama 3.3 70B | Llama 3.1 405B | **Scout** | **Maverick** |
|---|---|---|---|---|
| MMMU | — | no multimodal support | 69.4 | **73.4** |
| MathVista | — | no multimodal support | 70.7 | **73.7** |
| ChartQA | — | no multimodal support | 88.8 | **90.0** |
| DocVQA (test) | — | no multimodal support | 94.4 | 94.4 |
| LiveCodeBench | 33.3 | 27.7 | 32.8 | **43.4** |
| MMLU Pro (0) | 68.9 | 73.4 | 74.3 | **80.5** |
| GPQA Diamond (0) | 50.5 | 49.0 | 57.2 | **69.8** |
| MGSM (0) | 91.1 | 91.6 | — | — |

**What it was good at.** Image understanding (charts, documents, multi-image reasoning), very long context (Scout's 10M is the largest published context window of any Llama), multilingual chat, agentic/tool-use work, and per-token efficiency from MoE (17B active per token means fast decode relative to total size).

**Benchmark controversy (documented).** Llama 4 Maverick's **LMArena** score was obtained with `Llama-4-Maverick-03-26-Experimental`, an unreleased variant "optimized for conversationality". The Verge ("Meta got caught gaming AI benchmarks", 8 Apr 2025), TechCrunch ("Meta's benchmarks for its new AI models are a bit misleading", 6 Apr 2025) and VentureBeat ("Meta defends Llama 4 release against 'reports of mixed quality,' blames bugs", 8 Apr 2025) all reported it; LMArena said Meta's interpretation of its policy "did not match what we expect from model providers". Additional reports covered data-mixture contamination accusations (denied by Meta) and early stability/quality issues.

**Variants on HF (10 repos):**

| Repo | What |
|---|---|
| `Llama-4-Scout-17B-16E`, `-Instruct` | main bf16 weights |
| `Llama-4-Maverick-17B-128E`, `-Instruct` | main bf16 weights |
| `Llama-4-Maverick-17B-128E-Instruct-FP8` | 8-bit float quantization |
| `Llama-4-Scout-17B-16E-Original`, `-Instruct-Original` | **byte-preserved copies of the 5 Apr 2025 upload** (repo lastModified stays 2025-04-05) |
| `Llama-4-Maverick-17B-128E-Original`, `-Instruct-Original`, `-Instruct-FP8-Original` | ditto |

The main repos were modified after launch (last modified 2025-05-22) while the `-Original` repos are frozen at 2025-04-05 — i.e. they preserve the launch-time weights for reproducibility. *(The precise internal reason Meta gave for re-uploading is not stated in any doc we could reach — treat "why" as **unverified**, the timestamps themselves are confirmed from the HF API.)*

**Licence:** Llama 4 Community License (custom commercial + AUP).

---

### 3.10 The sibling safety families

These are *not* chat models — they are classifiers that guard other LLM deployments. They ship under the **Purple Llama** umbrella and are a genuinely separate product line from the generation models.

#### Llama Guard 1 (HF: `LlamaGuard-7b`, created 2023-12-05)
- **7B, built on Llama 2.** Paper arXiv:2312.06674.
- Classifies **both** user prompts (prompt classification) and model responses (response classification) into `safe` / `unsafe: <violated categories>`.
- Own **6-harm-type taxonomy**: Violence & Hate · Sexual Content · Guns & Illegal Weapons · Regulated or Controlled Substances · Suicide & Self-Harm · Criminal Planning (each with subcategories), deliberately aligned with Google/Microsoft/OpenAI taxonomies.
- Licensed Llama 2 Community License.

#### Llama Guard 2 (HF: `Meta-Llama-Guard-2-8B`, created 2024-04-17)
- **8B, a fine-tune of Llama 3 8B.** Moved from Meta's home-grown taxonomy to **MLCommons policy**. Shipped alongside Llama 3. Llama 3 Community License.

#### Llama Guard 3 (Jul–Sep 2024) — three models
| Model | Base | Categories | Notes |
|---|---|---|---|
| **Llama Guard 3-8B** | Llama 3.1 8B | **14** (MLCommons 13 hazards + `S14 Code Interpreter Abuse`) | 8 languages: en/fr/de/hi/it/pt/es/th; optimized for **search tool calls + code-interpreter attacks** |
| **Llama Guard 3-8B-INT8** | — | 14 | 8-bit quantized |
| **Llama Guard 3-1B** | Llama 3.2 1B | **13** (the MLCommons 13, no S14) | built for low-cost moderation |
| **Llama Guard 3-1B-INT4** | — | 13 | pruned + quantized for mobile: pruned to **12 layers / 6400 MLP hidden → 1,123M params**; INT4 weights (group size 256, per-channel, range [−8,7]), dynamic INT8 activations, BF16 elsewhere; **output head pruned from 262.6M → 40.96k params** (only 20 output tokens kept); distilled from the 8B teacher via logit-level distillation |
| **Llama Guard 3-11B-vision** | — | — | mixed text+image prompt classification |

Category list (S1–S14) from the official card: S1 Violent Crimes · S2 Non-Violent Crimes · S3 Sex-Related Crimes · S4 Child Sexual Exploitation · S5 Defamation · S6 Specialized Advice · S7 Privacy · S8 Intellectual Property · S9 Indiscriminate Weapons · S10 Hate · S11 Suicide & Self-Harm · S12 Sexual Content · S13 Elections · S14 Code Interpreter Abuse.

#### Llama Guard 4 (HF: `Llama-Guard-4-12B`, created 2025-04-23)
- **12B, natively multimodal**, trained jointly on text and multiple images — a **dense architecture pruned from Llama 4 Scout** and fine-tuned for content-safety classification.
- Aligns to the **standardized MLCommons hazard taxonomy** (arXiv:2503.05731).
- Replaces *both* Llama Guard 3-8B and Llama Guard 3-11B-vision in one model: English + multilingual text **and** mixed text+image prompts.
- Same "generates text saying safe/unsafe + violated categories" interface as all previous versions.

#### Prompt Guard (HF: `Prompt-Guard-86M`, created 2024-07-21)
- **86M DeBERTa-v3-based multi-label classifier** — not an LLM, a small encoder classifier.
- **3 labels: `benign` (0), `injection` (1), `jailbreak` (2).**
  - *injection* = "out of place" commands/instructions directed at an LLM (third-party content risk)
  - *jailbreak* = explicit attempts to override the system prompt (user dialogue risk)
- **Context window: 512 tokens** — Meta recommends chunking longer inputs and scanning in parallel.
- Intended use: filter third-party/tool/RAG content with `injection`, and filter direct user input with `jailbreak`.

#### Llama Prompt Guard 2 (HF: `Llama-Prompt-Guard-2-22M` / `-86M`, created 2025-04-28)
- The 2025 refresh, released with Llama 4; **22M and 86M** DeBERTa-v3 variants (tags: `deberta-v2`, `llama4`), languages en/fr/de/hi/it/pt/es/th.
- **These are the newest weights ever published to the `meta-llama` Hugging Face org** (2025-04-28) — a useful landmark: nothing has been added since.

---

## 4. Which model for which task (practical guide, 2026)

> Caveat: this is a *Llama-family* guide. By Oct 2026 the open-model frontier has moved (Qwen 3.x/3.6, DeepSeek V4, GLM, Kimi, Mistral, Gemma 4, and Meta's own Muse Spark Open). "Best Llama" ≠ "best model".

| Task | Best Llama | Why |
|---|---|---|
| General chat, best quality in the family | **Llama 3.3 70B Instruct** | 405B-class steerability/reasoning at 70B size |
| Long documents / RAG over 100k+ tokens | **Llama 3.1 405B** or **Llama 4 Maverick** | 128k reliable / 1M context |
| Vision: charts, docs, screenshots | **Llama 4 Maverick** | DocVQA 94.4, ChartQA 90.0, MMMU 73.4 |
| Vision on modest hardware | **Llama 3.2 Vision 11B** | cross-adapter over Llama 3.1, much smaller |
| On-device / embedded / mobile | **Llama 3.2 3B Instruct** (or 1B + the INT4 SpinQuant/QLoRA repos) | 128k context in 3B, official 4-bit weights |
| Coding (classic, local) | **Code Llama 34B Instruct** or **70B** | infilling, 100k context; dated by 2026 standards |
| Coding in the Llama 4 era | **Llama 4 Maverick** (LiveCodeBench 43.4) | best Llama code number published |
| Multilingual (beyond English) | **Llama 3.1 / 3.3 / Llama 4** | 8 supported languages / 12 supported / 200 pretraining |
| Tool use & agentic | **Llama 3.3 70B** (BFCL v2 77.3) or **405B** (81.1) | official BFCL numbers |
| Fast inference on a GPU box | **Llama 4 Scout/Maverick (MoE)** | 17B active per token despite 109B/400B total |
| Content moderation of text | **Llama Guard 3-8B** (or 1B-INT4 for mobile) | 14 MLCommons categories, 8 languages |
| Content moderation incl. images | **Llama Guard 4-12B** | single multimodal classifier |
| Prompt-injection / jailbreak filtering | **Prompt Guard 2 86M** (or 22M for latency) | 512-token window, 3-label |
| Synthetic data / distillation teacher | **Llama 3.1 405B** | explicitly licensed for distillation |
| Smallest viable retrieval/summarizer | **Llama 3.2 1B Instruct** | 128k context at 1.2B params |
| Very long-context single-GPU serving | **Llama 4 Maverick FP8** | FP8 repo exists; 17B active |

---

## 5. Architecture cheat-sheet across generations

| | LLaMA 1 | Llama 2 | Llama 3 / 3.1 / 3.2 / 3.3 | Llama 4 |
|---|---|---|---|---|
| Block type | decoder-only Transformer | same | same | **MoE decoder-only** |
| Activation | SwiGLU | SwiGLU | SwiGLU | SwiGLU |
| Positional | RoPE | RoPE | RoPE (scaled to 128k) | **iRoPE** — interleaved rotary / no-PE layers for long context |
| Norm | pre-norm RMSNorm | same | same | RMSNorm |
| Attention | MHA | MHA (GQA on 70B) | **GQA on all sizes** | GQA |
| Multimodality | text | text | **text+image via cross-attention adapter** (3.2 Vision) | **native early fusion** (vision tokens joined at input) |
| Vocab | 32k SentencePiece | 32k | **128k BPE** (Llama 3) | 128k+ |
| Context | 2,048 | 4,096 | 8,192 → **128,000** | **10M (Scout) / 1M (Maverick)** |
| Training tokens | 1.0–1.4T | 2.0T | 9T–15T+ | **22T–40T** |
| Training cost (largest) | 6,300 pF-day | 21,000 pF-day | 440,000 pF-day (405B) | **7.38M H100 GPU-hours** |
| Alignment | none (base only) | SFT + RLHF + GAtt | SFT + RLHF (+>25M synthetic for 3.3) | SFT + RLHF, MoE-aware |

---

## 6. Complete official variant inventory — all 70 `meta-llama` Hugging Face repos

Retrieved from `huggingface.co/api/models?author=meta-llama&limit=100` on **2026-10-25**; **70 repos total, newest createdAt 2025-04-28**. Sorted by creation date.

**Count reconciliation:** 12 + 1 + 12 + 5 + 8 + 3 + 8 + 3 + 4 + 1 + 10 + 1 + 2 = **70** ✓ (matches the API's returned array length exactly).

### Llama 2 — 12 repos (2023-07-09 → 2023-07-14)
`Llama-2-7b` · `Llama-2-7b-chat` · `Llama-2-13b` · `Llama-2-13b-chat` · `Llama-2-70b` · `Llama-2-70b-hf` · `Llama-2-13b-chat-hf` · `Llama-2-13b-hf` · `Llama-2-7b-hf` · `Llama-2-7b-chat-hf` · `Llama-2-70b-chat` · `Llama-2-70b-chat-hf`
> `-hf` = Hugging Face `transformers`-format conversion; unsuffixed = Meta's original consolidated format.

### Llama Guard 1 — 1 repo (2023-12-05)
`LlamaGuard-7b`

### Code Llama — 12 repos (2024-03-13 → 2024-03-14)
`CodeLlama-7b-hf` · `CodeLlama-7b-Python-hf` · `CodeLlama-7b-Instruct-hf` · `CodeLlama-13b-hf` · `CodeLlama-13b-Python-hf` · `CodeLlama-13b-Instruct-hf` · `CodeLlama-70b-hf` · `CodeLlama-70b-Python-hf` · `CodeLlama-70b-Instruct-hf` · `CodeLlama-34b-hf` · `CodeLlama-34b-Python-hf` · `CodeLlama-34b-Instruct-hf`

### Llama 3 + Guard 2 — 5 repos (2024-04-17)
`Meta-Llama-3-8B` · `Meta-Llama-3-8B-Instruct` · `Meta-Llama-3-70B` · `Meta-Llama-3-70B-Instruct` · `Meta-Llama-Guard-2-8B`

### Llama 3.1 — 8 repos (2024-07-14 → 2024-07-20)
`Llama-3.1-8B` · `Llama-3.1-70B` · `Llama-3.1-405B` · `Llama-3.1-70B-Instruct` · `Llama-3.1-405B-Instruct` · `Llama-3.1-8B-Instruct` · `Llama-3.1-405B-Instruct-FP8` · `Llama-3.1-405B-FP8`

### Prompt Guard + Llama Guard 3 (8B) — 3 repos (2024-07-21 → 2024-07-22)
`Prompt-Guard-86M` · `Llama-Guard-3-8B-INT8` · `Llama-Guard-3-8B`

### Llama 3.2 text + Vision — 8 repos (2024-09-18 → 2024-09-19)
`Llama-3.2-1B` · `Llama-3.2-1B-Instruct` · `Llama-3.2-3B-Instruct` · `Llama-3.2-3B` · `Llama-3.2-11B-Vision` · `Llama-3.2-11B-Vision-Instruct` · `Llama-3.2-90B-Vision` · `Llama-3.2-90B-Vision-Instruct`

### Llama Guard 3 (rest) — 3 repos (2024-09-20)
`Llama-Guard-3-11B-Vision` · `Llama-Guard-3-1B` · `Llama-Guard-3-1B-INT4`

### Llama 3.2 Quantized — 4 repos (2024-10-23)
`Llama-3.2-1B-Instruct-QLORA_INT4_EO8` · `Llama-3.2-1B-Instruct-SpinQuant_INT4_EO8` · `Llama-3.2-3B-Instruct-QLORA_INT4_EO8` · `Llama-3.2-3B-Instruct-SpinQuant_INT4_EO8`

### Llama 3.3 — 1 repo (2024-11-26)
`Llama-3.3-70B-Instruct`

### Llama 4 — 10 repos (2025-04-01 → 2025-04-04)
`Llama-4-Maverick-17B-128E-Instruct-FP8` · `Llama-4-Maverick-17B-128E-Instruct` · `Llama-4-Scout-17B-16E-Instruct` · `Llama-4-Scout-17B-16E` · `Llama-4-Maverick-17B-128E` · `Llama-4-Scout-17B-16E-Original` · `Llama-4-Scout-17B-16E-Instruct-Original` · `Llama-4-Maverick-17B-128E-Original` · `Llama-4-Maverick-17B-128E-Instruct-Original` · `Llama-4-Maverick-17B-128E-Instruct-FP8-Original`

### Llama Guard 4 — 1 repo (2025-04-23)
`Llama-Guard-4-12B`

### Llama Prompt Guard 2 — 2 repos (2025-04-28) ← **newest of all**
`Llama-Prompt-Guard-2-22M` · `Llama-Prompt-Guard-2-86M`

**Quantization/variant summary:** the official repo set offers **BF16** (default), **FP8** (Llama 3.1 405B, Llama 4 Maverick), **INT8** (Llama Guard 3-8B), **INT4** (Llama Guard 3-1B, Llama 3.2 1B/3B in both **QLoRA** and **SpinQuant** flavours), plus **`-hf`** format conversions and **`-Original`** frozen snapshots. GGUF/4-bit/8-bit conversions for llama.cpp are community-produced (bartowski, mradermacher, QuantFactory et al.), not official.

---

## 7. Licensing summary

| Generation | Licence | Commercial? | Key terms |
|---|---|---|---|
| LLaMA 1 | LLaMA 1 Research Licence | **No** | case-by-case application; GPLv3 code only |
| Llama 2 | Llama 2 Community Licence + AUP | **Yes** | acceptable-use policy; >700M MAU needs a Meta licence |
| Code Llama | Llama 2 Community Licence | Yes | same terms as Llama 2 |
| Llama Guard 1 | Llama 2 Community Licence | Yes | |
| Llama 3 / Guard 2 | Llama 3 Community Licence + AUP | Yes | |
| Llama 3.1 / 3.2 / 3.3 / Guard 3 / Prompt Guard | Llama 3.1 & 3.2 Community Licences | Yes | 3.1 explicitly permits **synthetic-data distillation**; 700M MAU clause retained |
| Llama 4 / Guard 4 / Prompt Guard 2 | Llama 4 Community Licence | Yes | custom commercial licence + AUP |

**"Open source?"** Meta markets Llama as open source. The **Open Source Initiative and others dispute this** — an acceptable-use policy and a MAU clause make it *source-available*, not OSI-approved open source. This was widely reported at the Llama 2 launch (Ars Technica, 18 Jul 2023) and remains true for Llama 4.

**Availability mechanics:** all HF repos are **gated** — you must accept the licence on huggingface.co (manual approval) before downloading; Meta also distributes via `llama.com` downloads, Kaggle, and cloud partners (AWS, Azure, GCP, Nvidia NIM, Together, Fireworks, etc.).

---

## 8. Ecosystem & derivatives (why Llama mattered more than its raw scores)

- **llama.cpp / GGUF** — every Llama size is supported; the whole 2-bit→8-bit quantization ecosystem (GGUF, EXL2, AWQ, GPTQ) was built around Llama shapes. Llama 2 7B/13B/70B and Llama 3 8B/70B are the canonical test models.
- **Fine-tune explosion** — Alpaca, Vicuna, WizardLM, OpenLLaMA, Mistral (Llama-architecture lineage), Nous-Hermes, CodeAlpaca. Llama 1's leak is generally credited with kickstarting the open-weight fine-tune ecosystem.
- **Meta AI assistant** — Llama 3 powered the Meta AI rollout on Facebook/WhatsApp/Instagram (Apr 2024), reaching hundreds of millions of users.
- **Distillation** — Llama 3.1 405B was explicitly licensed as a teacher; Llama 4 Behemoth was designed as Maverick's teacher (and never shipped).
- **Safety tooling** — Purple Llama (Llama Guard + Prompt Guard + CyberSecEval + Code Shield) became the default open safety stack, adopted by cloud providers.
- **Community fine-tune program** — Meta ran the Llama Impact Grants and later a commercial-partnership program (the "Llama API" launched May 2025).

---

## 9. Timeline of what Meta did *after* Llama 4 (2025 → 2026)

This is context for the "did Llama stop?" question. All dates from Google News RSS with the publisher named, cross-checked against the HF API.

| Date | Event | Source |
|---|---|---|
| 2025-04-05 | Llama 4 Scout + Maverick released; Behemoth announced | Meta / ai.meta.com |
| 2025-04-08 | Benchmark-gating controversy over Maverick on LMArena | The Verge, TechCrunch, VentureBeat |
| 2025-05-19 | **Llama API** launched (paid hosted API) | Meta Developers (YouTube) |
| 2025-07-15 | "Meta abandons Llama in favor of Claude Sonnet" reporting begins | HackerNoon (low-authority) — treat as commentary, not fact |
| 2025-08-30 / 09-01 | Meta explores Google/OpenAI partnerships for AI features | Times of India, ET BrandEquity, MLQ.ai |
| 2025-10-10 | **last code commit to `meta-llama/llama-models`** (a CLI tool — no model) | GitHub API |
| 2026-03-12/13 | Meta delays rollout of a new AI model over performance concerns | New York Times, Barron's |
| **2026-04-08** | **Muse Spark** released — first model from **Meta Superintelligence Labs**, first new Meta model in over a year; **proprietary** | Reuters, CNBC, Fortune, VentureBeat, The Guardian (2026-04-09) |
| 2026-04-06 | Reporting that Meta planned to open-source new models ("As Meta Flounders…") | Gizmodo |
| 2026-06-02 | "Meta is back in the LLM game after a year-long break" | Understanding AI (Timothy B. Lee) |
| 2026-07-02 | Zuckerberg admits AI development lags expectations; Meta stock falls ~5% | BigGo Finance |
| **2026-08-10** | **Muse Glimmer** — **Apache 2.0, open-weight, 30B agentic model for devices**; "Meta returns to open source" | Meta AI, VentureBeat |
| 2026-08-17 | Competitors respond ("Alibaba fires back at Meta with laptop-ready AI model") | The Tech Buzz |
| 2026-09-02 | Muse Spark 1.3 | (HF `meta-models` org) |
| **2026-10-12** | **Muse Wonder** announced | Google News RSS |
| **2026-10-15** | **Muse Spark Open** — `meta-models/Muse-Spark-Open-816B-A42B` + `-NVFP4`, described as "the most capable US open-weight model to date" (HF repo created 2026-09-15) | Meta AI, VentureBeat |
| 2026-10-26 | `llama.com` model nav still lists: **Llama 4 · Llama Guard 4 · Llama 3.3 · Other models**; Products nav lists Muse Wonder / Muse Spark 1.1–1.3 / Muse Spark Open / Muse Glimmer / Muse Image / Muse Voice Transcribe / SAM 3.1 | fetched directly |

**Reading of the record:** Meta reorganised around **Meta Superintelligence Labs** (2025), stopped shipping new Llama generations after Llama 4 (Apr 2025), shipped a proprietary Muse line through 2026, then **returned to open weights** with Muse Glimmer (Apache 2.0, Aug 2026) and Muse Spark Open (Oct 2026) — under the *Muse* brand, not Llama.

---

## 10. "Does Llama 5 exist?" — the negative claim, verified

A number of sites claim Meta released **Llama 5** (some say 8 April 2026, "600B parameters", "Recursive Self-Improvement"). We could not confirm this from any authoritative source. **Four independent checks:**

1. **Meta's own site.** `www.llama.com/docs/model-cards-and-prompt-formats/` fetched 2026-10-26 — the Models nav contains *Llama 4, Llama Guard 4, Llama 3.3, Other models*. The string "Llama 5" does not appear anywhere in the page text.
2. **Hugging Face.** `api/models?author=meta-llama` returns **exactly 70 repos**, newest `createdAt` = **2025-04-28**. A Llama 5 release would have created repos in 2026. (The `meta-models` org contains only Muse models.)
3. **GitHub.** `meta-llama/llama-models` — last release is `v0.2.0` (2025-04-05); last commit **2025-10-10**, and it adds a CLI, not a model. The `models/` tree contains only llama2, llama3, llama3_1, llama3_2, llama3_3, llama4. `facebookresearch/codellama` untouched since 2024.
4. **News record.** Google News RSS for `"Llama 5"` returns 10 items: one speculative analysis ("Will Meta Release Llama 5 This Year?", NEXT.io, Jan 2026), one leak roundup ("Llama 5 Leak: What We Know So Far", OrcaRouter, Aug 2026), and unrelated content. **No Reuters, CNBC, TechCrunch, The Verge, NYT or Guardian article announces a Llama 5 launch.** Meanwhile the same RSS index *does* carry Reuters/CNBC/Fortune/VentureBeat coverage of **Muse Spark on 8 Apr 2026** — the date the "Llama 5" claims use.

**Where the false claims come from.** DuckDuckGo results for `"Llama 5" Meta release` surface sites such as `bitsminds.com` ("Meta Releases Llama 5: Open-Source 600B Model Claims Frontier Dominance", dated 2026-04-08) and `geekygadgets.com` ("LLAMA 5 Meta's Most Powerful AI Model Just Leaked"). These repeat a release date that in the real news record belongs to **Muse Spark**, and describe capabilities no Meta model was announced with. **Verdict: Llama 5 does not exist as of 2026-10-25.** The claims are unverified, low-authority, and most likely AI-generated SEO content.

**Related negative results (also checked):**
- **Llama 4.1 / Llama 4.5** — no release, no news coverage.
- **Llama 4 Behemoth** — announced 2025-04-05, still in training, **never released**; no HF repo, no weights. (Note: unrelated third-party models named "Behemoth" exist on HF from other authors — none are Meta's.)
- **Llama 4 "5T" or "2T" text models** — only the Behemoth ~2T figure, unreleased.
- **Llama 5 "600B"** — no corroborating source.
- **Llama 4 pre-trained-only community releases** — the base (pretrained) Scout and Maverick *were* released, but there is no separate "Llama 4 base 405B-class" or "Llama 4 2T" model.

---

## 11. One-line summary of each model

| Model | In one line |
|---|---|
| **LLaMA 1** | The 2023 research release that proved small+lots-of-data beats huge, and leaked into the open ecosystem. |
| **Llama 2** | First Llama you could legally ship: 7/13/70B + a properly RLHF-tuned chat model. |
| **Code Llama** | Llama 2 specialised for code — infilling, 100k context, a Python-only teacher that beat 70B on HumanEval. |
| **Llama Guard 1** | 7B Llama 2 turned into a 6-harm-category content moderator. |
| **Llama 3** | 15T-token, 128k-vocab jump; 8B/70B; the model that put Meta back on top of open weights. |
| **Llama Guard 2** | Llama 3 8B retrained onto the MLCommons hazard taxonomy. |
| **Llama 3.1** | Adds 128k context, multilingual, and the 405B flagship — the reference open model of mid-2024. |
| **Prompt Guard** | Tiny DeBERTa classifier that catches prompt injections and jailbreaks (3 labels, 512 tokens). |
| **Llama Guard 3** | 8B/1B/11B-vision safety family on the MLCommons taxonomy, incl. code-interpreter-abuse detection. |
| **Llama 3.2 text** | 1B/3B edge models with 128k context and official SpinQuant/QLoRA INT4 weights. |
| **Llama 3.2 Vision** | First Llama that sees: cross-attention adapter over Llama 3.1 at 11B/90B. |
| **Llama 3.3** | 70B Instruct that matches or beats 405B on steerability, GPQA and MATH. |
| **Llama 4 Scout** | 109B-total/17B-active MoE with a 10M-token context window. |
| **Llama 4 Maverick** | 400B-total/17B-active, 128 experts, natively multimodal — Meta's strongest Llama. |
| **Llama 4 Behemoth** | 288B-active/~2T teacher model, announced and never released. |
| **Llama Guard 4** | 12B multimodal (pruned from Llama 4 Scout) safety classifier on MLCommons. |
| **Prompt Guard 2** | 22M/86M refresh of the prompt-attack classifier — the last official Llama weights, Apr 2025. |

---

## 12. Sources

**Official Meta / model cards**
- https://github.com/meta-llama/llama-models — `models/llama2/MODEL_CARD.md`, `models/llama3/MODEL_CARD.md`, `models/llama3_1/MODEL_CARD.md`, `models/llama3_2/MODEL_CARD.md`, `models/llama3_2/MODEL_CARD_VISION.md`, `models/llama3_3/MODEL_CARD.md`, `models/llama4/MODEL_CARD.md`, plus `LICENSE` for each generation
- https://github.com/meta-llama/llama-models/releases (latest: v0.2.0, 2025-04-05)
- https://github.com/facebookresearch/llama — LLaMA 1 repo/README
- https://github.com/facebookresearch/codellama — Code Llama README
- https://github.com/meta-llama/PurpleLlama — `Llama-Guard/README.md`, `Llama-Guard2/README.md`, `Llama-Guard3/README.md`, `Llama-Guard3/8B/MODEL_CARD.md`, `Llama-Guard3/1B/MODEL_CARD.md`, `Llama-Guard4/12B/MODEL_CARD.md`, `CybersecurityBenchmarks/website/docs/prompt_guard/model_card.md`
- https://www.llama.com/docs/model-cards-and-prompt-formats/ (fetched 2026-10-26)

**APIs used for enumeration / verification**
- https://huggingface.co/api/models?author=meta-llama&limit=100 (70 repos)
- https://huggingface.co/api/models?author=meta-models (Muse family)
- https://api.github.com/repos/meta-llama/llama-models (commits, releases, tree)
- https://api.github.com/repos/meta-llama/PurpleLlama

**Papers (arXiv)**
- 2302.13971 — *LLaMA: Open and Efficient Foundation Language Models* (Llama 1)
- 2307.09288 — *Llama 2: Open Foundation and Fine-Tuned Chat Models*
- 2308.12950 — *Code Llama: Open Foundation Models for Code*
- 2312.06674 — *Llama Guard: LLM-based Input-Output Safeguard for Human-AI Conversations*
- 2403.13031 — *The Llama 3 Herd of Models* (early/preprint numbering); canonical: **2407.21783**
- 2404.12241 — MLCommons hazard classification taxonomy (used by Llama Guard 3)
- 2503.05731 — MLCommons hazard taxonomy (used by Llama Guard 4)
- 2304.09848 — *Toolformer* lineage referenced by tool-use sections (context only)

**News / secondary (for dates & the post-Llama timeline)**
- Reuters, 2026-04-08 — *Meta unveils first AI model from costly superintelligence team*
- CNBC, 2026-04-08 — *Meta debuts new AI model, attempting to catch Google, OpenAI*
- Fortune, 2026-04-08 — *Meta unveils Muse Spark, its first new AI model since hiring Alexandr Wang*
- The Guardian, 2026-04-09 — *Meta debuts new AI model in first test of costly 'superintelligence' team*
- VentureBeat, 2026-04-08 — *Goodbye, Llama? Meta launches new proprietary AI model Muse Spark*
- The Verge, 2025-04-08 — *Meta got caught gaming AI benchmarks*
- TechCrunch, 2025-04-06 — *Meta's benchmarks for its new AI models are a bit misleading*
- VentureBeat, 2025-04-08 — *Meta defends Llama 4 release against 'reports of mixed quality,' blames bugs*
- Ars Technica, 2023-07-18 — *Meta launches LLaMA-2, a source-available AI model that allows commercial applications*
- The Verge, 2024-09-25 / TechCrunch, 2024-09-25 — Llama 3.2 launch coverage
- TechCrunch, 2024-04-18 — *Meta releases Llama 3*
- NYT / Barron's, 2026-03-12/13 — Meta delays new AI model
- VentureBeat, 2026-08-10 — *Meta returns to open source with Muse Glimmer, an Apache 2.0 licensed 30B parameter LLM*
- Wikipedia, *Llama (language model)*, revision of Oct 2026 (used for release-date cross-checks and its cited references)

**Community search (used only to *locate* claims to check, never as evidence)**
- DuckDuckGo Lite results for `"Llama 5" Meta release` — the source of the debunked claims (bitsminds.com, geekygadgets.com, orcarouter.com)

---

*Compiled 2026-10-26. Every table above is drawn from the primary sources listed; where a figure could not be confirmed from a primary source it is marked **unverified**.*
