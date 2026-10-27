# Llama 4 Scout — 17B active / 109B total, 10M context (70B+)

**Released:** 5 Apr 2025 · **Type:** MoE, natively multimodal, base + Instruct (+ frozen `-Original` snapshots) · **Status:** active · **Licence:** Llama 4 Community Licence (custom commercial + AUP)

## Variants in this bucket (4 Llama 4 Scout repos)

| Variant | Active / total | Experts | Context | HF repo | Downloads/mo (2026-10) |
|---|---|---|---|---|---|
| Llama 4 Scout (base) | 17B / **108.642B** | 16 routed | **10M** | `Llama-4-Scout-17B-16E` | 2,283 |
| Llama 4 Scout Instruct | 17B / 108.642B | 16 | 10M | `Llama-4-Scout-17B-16E-Instruct` | **133,972** |
| `-Original` / `-Instruct-Original` | *" | 16 | 10M | frozen 5 Apr 2025 upload (byte-preserved) | 4 / 2 |

**Official facts (Llama 4 card):** early-fusion multimodality (vision tokens joined at the input layer) · ~**40T** pretraining tokens (largest Llama corpus) · knowledge cutoff **Aug 2024** · 12 supported languages (200 in pretraining) · image input tested **up to 5 images** · training **5.0M H100 GPU-hours** · **quantization: "released as BF16 weights, but can fit within a single H100 GPU with on-the-fly int4 quantization"** (official claim).

## Official benchmarks (Llama 4 card)

Pretrained: MMLU (5-shot) 79.6 · MMLU-Pro 58.2 · MATH (4-shot) 50.3 · MBPP 67.8 · TydiQA 31.5 · ChartQA 83.4 · DocVQA 89.4
Instruction-tuned: **MMMU 69.4** · MathVista 70.7 · ChartQA 88.8 · **DocVQA 94.4** · LiveCodeBench 32.8 · MMLU-Pro (0-shot) 74.3 · **GPQA Diamond 57.2** · MGSM 90.6

*(For scale: GPQA 57.2 beats 3.3 70B's 50.5 and 405B's 49.0; LiveCodeBench 32.8 is roughly Llama 3.3's 33.3.)*

## What it's good at (pros)

- **A 10M-token context window — the largest of any Llama**, and officially 1M+ even counting only what's independently exercised. For huge-context retrieval/summarization workflows it is unique in the family.
- **One H100 is enough (official):** BF16 weights with on-the-fly int4 fit a single H100 per Meta's card — a 109B-class model you can host on one accelerator, thanks to 17B-active MoE decode.
- **Strong document vision for the size:** DocVQA 94.4 (matches Maverick), ChartQA 88.8, MMMU 69.4 — better document reading than Llama 3.2 Vision 90B (90.1/85.5/60.3).
- **GPQA 57.2** — the best science-reasoning number of any Llama *except* Maverick, in the cheaper model.
- Native multimodality (early fusion), 12 languages, 40T-token training corpus, and a popular serving target: 134k monthly downloads on the Instruct repo.

## What it's NOT good at (cons)

- **The 10M window is a capacity claim, not a quality guarantee.** The card's own long-context benchmark (MTOB, half-book/full-book translation) works on book-length inputs — nothing in the official card is evaluated anywhere near 10M tokens. We searched Hacker News/Algolia and DuckDuckGo lite (Oct 2026) for **any independent evaluation of the full 10M window and found none**. Treat extreme depths as unverified; KV-cache size and retrieval accuracy at 10M are on you to test.
- **It inherits the Llama 4 benchmark scandal** (see Maverick's file for full detail): the family's LMArena result came from an unreleased "experimental" variant, Meta VP Al-Dahle acknowledged **"mixed quality"** across hosting providers at launch (TechCrunch, 7 Apr 2025), and Yann LeCun later said in the Financial Times that Llama 4 **"results were fudged a little bit"** and that the team "used different models for different benchmarks" (reported 2 Jan 2026).
- **Coding underperforms the previous generation:** in Rootly AI Labs' independent 100-issue coding benchmark (Apr 2025), Llama 4 models came **last (69.5%)**, 18 points behind GPT-4o, and *below* Llama 3.3 70B's 72% — Scout's LiveCodeBench 32.8 is flat vs Llama 3.3's 33.3 despite being newer and bigger.
- **Launch-week stability:** Al-Dahle's own framing was that implementations needed "several days… to get dialed in" — early hosted versions differed in quality (The Verge also documented differences between what researchers saw and what was downloadable).
- MoE memory still follows the **total**: ≈217 GB BF16 (computed) — "fits in one H100" only with int4; 10M context at full depth is a separate memory problem entirely.
- Weaker than Maverick on every axis except context/size; knowledge cutoff Aug 2024; gated weights; source-available licence.

## Hardware & ecosystem

| | Scout |
|---|---|
| BF16 (computed) | ≈ 217 GB (multi-GPU) |
| int4 (official on-the-fly) | fits **1× H100** per card |
| 4-bit GGUF (community) | ≈ 60–70 GB |
| Typical target | 1× H100 (int4) or 2× 80 GB |

Serving: vLLM/SGLang/llama.cpp support the MoE; long-context configs require significant KV memory — budget by context length, not just weights.

## Who should pick this
- **Yes:** extreme-context workloads where you will *test* quality at your real length; single-GPU hosting of a 109B-class multimodal model; document/visual QA at Scout-level cost.
- **No:** code-heavy workloads (Llama 3.3 70B beat it independently), anything needing trustworthy published benchmarks at extreme context, or when Maverick's quality fits your budget.

## Sources
- Official card `models/llama4/MODEL_CARD.md` (specs, quantization claim, benchmark tables, 5-image note) — cached: `~/.cache/llama-research/cards/llama4_MODEL_CARD.md`
- TechCrunch 2025-04-07 (Al-Dahle: test-set denial, "mixed quality", "several days… dialed in") · The Verge 2025-04-08 (LMArena experimental variant, Willison quotes) · FT via Slashdot 2026-01-02 (LeCun: "results were fudged a little bit")
- Rootly AI Labs 2025-04-11/2026-06-18 (independent coding benchmark) · HF API · [`../llama-models-complete-guide.md`](../llama-models-complete-guide.md) §3.9
- Negative search for 10M-window evaluations: HN Algolia API + DuckDuckGo lite, 2026-10-26 — none found.
