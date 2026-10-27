# Llama 4 Maverick — 17B active / 400B total (70B+) — Meta's strongest Llama

**Released:** 5 Apr 2025 · **Type:** MoE, natively multimodal, base + Instruct + FP8 (+ frozen `-Original` snapshots) · **Status:** active · **Licence:** Llama 4 Community Licence

## Variants in this bucket (6 Llama 4 Maverick repos)

| Variant | Active / total | Context | Precision | HF repo | Downloads/mo (2026-10) |
|---|---|---|---|---|---|
| Llama 4 Maverick (base) | 17B / **401.584B** | 1M | BF16 | `Llama-4-Maverick-17B-128E` | 334 |
| Llama 4 Maverick Instruct | 17B / 401.584B | 1M | BF16 | `Llama-4-Maverick-17B-128E-Instruct` | 9,730 |
| Llama 4 Maverick Instruct **FP8** | 17B / 401.584B | 1M | FP8 | `Llama-4-Maverick-17B-128E-Instruct-FP8` | **42,388** |
| `-Original`, `-Instruct-Original`, `-Instruct-FP8-Original` | *" | 1M | — | frozen 5 Apr 2025 upload | 4 / 3 / 1 |

**Official facts (Llama 4 card):** 128 routed experts · early-fusion multimodal · ~**22T** pretraining tokens · **co-distilled from Llama 4 Behemoth** (the unreleased teacher) · cutoff Aug 2024 · 12 supported languages · images up to 5 inputs · training 2.38M H100 GPU-hours · **"released as both BF16 and FP8 quantized weights. The FP8 quantized weights fit on a single H100 DGX host while still maintaining quality"** (official).

## Official benchmarks (Llama 4 card) — top of every family table

| Metric | Llama 3.3 70B | Llama 3.1 405B | **Maverick** |
|---|---|---|---|
| MMLU (5-shot, pretrained) | — | 85.2 | **85.5** |
| MMLU-Pro | 68.9 (0-shot IT) | 73.4 (0-shot IT) | **80.5** (0-shot IT) |
| **GPQA Diamond (0-shot IT)** | 50.5 | 49.0 | **69.8** |
| **LiveCodeBench (IT)** | 33.3 | 27.7 | **43.4** |
| **MMMU (IT)** | no multimodal | no multimodal | **73.4** |
| MathVista (IT) | — | — | **73.7** |
| ChartQA (IT) | — | — | **90.0** |
| DocVQA test (IT) | — | — | **94.4** |
| MGSM | 91.1 | 91.6 | **92.3** |
| MATH (4-shot, pretrained) | — | 53.5 | **61.2** |

## What it's good at (pros)

- **The most capable model Meta ever released as Llama** — best-in-family on reasoning (GPQA 69.8), code (LiveCodeBench 43.4), math, multilingual, and *all* vision metrics.
- **Natively multimodal** (early fusion, not an adapter): charts, documents, screenshots and multi-image inputs in one model, with English *and* multilingual image understanding (12 languages — fixes Llama 3.2 Vision's English-only images).
- **FP8 fits one 8×H100 DGX host (official)** while keeping quality; **17B active per token** means decode cost is 17B-class despite 400B quality — the best quality-per-token-compute in the family.
- 1M context (vs 128k everywhere before), 22T-token pretraining, Behemoth-distilled.
- Real-world traction: 42k+ monthly downloads on the FP8 repo; the default "big Llama" in serving stacks.

## What it's NOT good at (cons)

- **The benchmark controversy is real and documented.** Meta highlighted Maverick's **#2 LMArena rank (ELO 1417)**, but the model submitted was `Llama-4-Maverick-03-26-Experimental` — an *unreleased* chat variant "optimized for conversationality," not the public weights. LMArena: *"Meta's interpretation of our policy did not match what we expect from model providers"* and it rewrote its leaderboard policies (The Verge, *Meta got caught gaming AI benchmarks*, 8 Apr 2025; TechCrunch, 7 Apr 2025). Independent researcher Simon Willison: *"The model score that we got there is completely worthless to me. I can't even use the model that they got a high score on."*
- **Meta's own VP admitted uneven quality:** Ahmad Al-Dahle (VP generative AI) acknowledged users saw **"mixed quality"** from Maverick/Scout across cloud providers, blaming stabilizing implementations and saying it would take "several days for all the public implementations to get dialed in" (TechCrunch, 7 Apr 2025). He **denied** training on test sets.
- **Confirmed, years later, by a Meta founder:** Yann LeCun told the Financial Times that Llama 4 **"results were fudged a little bit"** and that the team *"used different models for different benchmarks to give better results"*; Zuckerberg was "really upset" and sidelined the GenAI organisation (reported 2 Jan 2026 — Slashdot/FT).
- **Independent testing says it's not the best coder:** Rootly AI Labs (Apr 2025) could not reproduce Meta's wins over GPT-4o/Gemini 2.0 Flash/DeepSeek; Maverick scored **70% vs Llama 3.3 70B's 72%** — the previous generation beat it, and Qwen2.5-Coder-32B/o3-mini were ~20 points ahead.
- **Memory still follows the total:** BF16 ≈ 803 GB (computed); only the FP8/int4 forms are single-host. MoE serving has real engineering overhead (expert parallelism, all-to-all).
- **Knowledge cutoff Aug 2024**, gated weights, source-available licence, and launch-era trust issues that made many teams wait — by Oct 2026 Meta itself has moved to Muse.

## Hardware & ecosystem

| | Maverick |
|---|---|
| BF16 (computed) | ≈ 803 GB (multi-node) |
| FP8 (official) | ≈ 401 GB → **1× 8×H100 DGX host** (official claim) |
| int4 (community) | ≈ 200 GB |
| Typical target | 1× DGX H100 (FP8) or 4–8× 80 GB GPUs |

Serving: vLLM/SGLang/TensorRT-LLM support MoE + FP8; throughput benefits from the 17B-active design; long-context (1M) needs KV-cache planning.

## Who should pick this
- **Yes:** the strongest in-family multimodal assistant, code/reasoning/vision workloads where Llama must be the answer, FP8 single-host serving, and distillation (licence allows it).
- **No:** if you need *trustworthy published benchmark claims* without caveats (read the above first), if Llama 3.3-level quality suffices at 1/4 the memory, or post-Aug-2024 knowledge (add RAG).

## Sources
- Official card `models/llama4/MODEL_CARD.md` (specs, FP8 claim, all benchmark numbers) — cached: `~/.cache/llama-research/cards/llama4_MODEL_CARD.md`
- The Verge 2025-04-08 *Meta got caught gaming AI benchmarks* (LMArena experimental variant, LMArena statement, Willison quotes, Al-Dahle statement)
- TechCrunch 2025-04-07 *Meta exec denies the company artificially boosted Llama 4's benchmark scores* (Al-Dahle "mixed quality" / "dial in" quotes, test-set denial)
- FT interview with Yann LeCun, reported by Slashdot 2026-01-02 (*"results were fudged a little bit"*)
- Rootly AI Labs 2025-04-11/2026-06-18 independent coding benchmark · HF API · [`../llama-models-complete-guide.md`](../llama-models-complete-guide.md) §3.9
