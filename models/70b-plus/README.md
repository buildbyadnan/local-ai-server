# 70B+ — the heavyweights (90B and above)

**Bucket rule:** above the 70B class — everything from ~88B up, including MoE models by **total** parameters. Full rules in [`../README.md`](../README.md).

**Compiled:** 2026-10-26 · Benchmarks = official Meta cards unless noted · Downloads = HF "downloads last month", 2026-10-26

## All models and variants in this bucket

| Model (variant) | Params (active / total) | Ctx | Released | Officially good at | Main not-good-at |
|---|---|---|---|---|---|
| **Llama 3.2 Vision 90B** (+ Instruct) | 88.593B dense | 128k | 2024-09 | best Llama-3-era vision (DocVQA 90.1) | English-only images, 177 GB, adoption ≈ 0 |
| **Llama 3.1 405B** (+ Instruct, + **FP8** ×2) | 405.853B dense | 128k | 2024-07 | reference open-frontier model; BFCL 81.1; licensed teacher | BF16 doesn't fit one 8×H100 node (paper §6.1); beaten at 3 key axes by 3.3 70B |
| **Llama 4 Scout** (+ Instruct, + Originals) | **17B / 109B**, 16 experts | **10M** | 2025-04-05 | colossal context in 1 int4-fittable H100 | no independent eval of the 10M window; family benchmark scandal; coding behind Llama 3.3 |
| **Llama 4 Maverick** (+ Instruct, + FP8, + Originals) | **17B / 400B**, 128 experts | 1M | 2025-04-05 | strongest Llama overall: MMMU 73.4, LiveCodeBench 43.4, GPQA 69.8 | benchmark-gaming scandal (LMArena), "mixed quality" launch, 803 GB BF16 |
| **Llama 4 Behemoth** | 288B / ~2T, 16 experts | — | announced 2025-04-05 | (planned) teacher model for distillation | **never released — no weights exist** |

## Quick picks (within this bucket)

- **Best model Meta ever shipped as Llama:** **Llama 4 Maverick (FP8)** — top vision + reasoning + code numbers of the family, 17B-active decode cost. Accept the benchmark caveats in its file.
- **Long-context retrieval at one GPU:** **Llama 4 Scout** with int4 on-the-fly (official claim: fits a single H100) when you truly need extreme context and can verify quality at your actual length.
- **Distillation teacher / reproducible 2024 frontier:** **Llama 3.1 405B** — and its **FP8** repos are the practical serving form (463k monthly downloads on `Llama-3.1-405B-FP8`).
- **Vision on a Llama 3-era stack:** **Llama 3.2 Vision 90B** only if you're pinned to that generation; Maverick is newer and better at vision.

## MoE: total vs active (read before choosing Scout/Maverick)

| | Scout | Maverick |
|---|---|---|
| Storage / memory (total params) | 109B → ≈217 GB BF16 (computed) | 400B → ≈803 GB BF16 (computed) |
| Compute per token (activated) | **17B** | **17B** |
| Experts | 16 routed | 128 routed |
| Practical implication | decode speed ~ a 17B-class model; **memory** ~ a 109B model | decode ~17B-class; memory ~400B (FP8 official, fits 1× DGX H100 host per card) |

So: *latency/throughput* behaves like a small model, *hardware footprint and serving cost* behave like a big one.

## The honest trade-off of this tier

This tier contains both Meta's **strongest work** (Maverick's official numbers top every family table) and its **most contested** (the Llama 4 benchmark scandal: experimental LMArena variant, Al-Dahle's "mixed quality" acknowledgment, LeCun's 2026 confirmation that results "were fudged a little bit", Rootly's independent finding that Llama 4 lost to Llama 3.3 on coding). It is also where **cost bites**: 177 GB (90B), 405 GB (405B FP8), 803 GB (Maverick BF16). Every model here has a Dec-2023 or Aug-2024 knowledge cutoff. Read each file's cons before committing.

## Files

- [`llama-3.2-vision-90b.md`](llama-3.2-vision-90b.md) · [`llama-3.1-405b.md`](llama-3.1-405b.md) · [`llama-4-scout.md`](llama-4-scout.md) · [`llama-4-maverick.md`](llama-4-maverick.md) · [`llama-4-behemoth.md`](llama-4-behemoth.md)

**Sources:** official model cards, Llama 3 paper (arXiv:2407.21783 §6), The Verge / TechCrunch / FT-via-Slashdot / Rootly reporting, HF API, [`../llama-models-complete-guide.md`](../llama-models-complete-guide.md).
