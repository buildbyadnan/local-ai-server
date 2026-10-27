# 30B–70B class — Llama's workhorse tier

**Bucket rule:** 30B ≤ total parameters ≤ the 70B class (exact counts 68.977B for Llama 2 / Code Llama 70B, 70.554B for Llama 3/3.1/3.3 70B — all counted as "70B" here). 90B+ goes to [`../70b-plus/`](../70b-plus/). See [`../README.md`](../README.md) for the full rules.

**Compiled:** 2026-10-26 · Benchmarks = official Meta cards unless noted · Downloads = HF "downloads last month", 2026-10-26

## All models and variants in this bucket

| Model (variant) | Exact params | Ctx | Released | Officially good at | Main not-good-at |
|---|---|---|---|---|---|
| **LLaMA 1 32.5B / 65.2B** (base only) | 32.5B / 65.2B | 2,048 | 2023-02 | 2023 research scaling (MMLU 57.8 / 63.4) | no chat, non-commercial, leaked, obsolete |
| **Llama 2 70B** (+ Chat) | 68.977B | 4,096 | 2023-07 | first big *legally shippable* open model, GQA | English-only, 4k ctx, MMLU 68.9 — beaten by 8B-era models |
| **Code Llama 34B** (base/Python/Instruct) | 33.744B | 16,384 (~100k) | 2023-08 | local code specialist (HumanEval up to 67% headline) | no documented infilling at 34B; 2023-era |
| **Code Llama 70B** (base/Python/Instruct) | 68.977B | 16,384 | 2024-01 | biggest Code Llama; 131 GB, MP 8 | Python/Instruct 70B don't get the 100k window (README) |
| **Llama 3 70B** (+ Instruct) | 70.554B | 8,192 | 2024-04 | HumanEval 81.7, MMLU 82.0 — the 2024 open leader | English-only, 8k ctx only |
| **Llama 3.1 70B** (+ Instruct) | 70.554B | 128,000 | 2024-07 | all-rounder: 128k + 8 languages + tool use (BFCL 77.5) | GPQA 48.0 — beaten by 3.3 at same size |
| **Llama 3.3 70B Instruct** | 70.554B | 128,000 | 2024-12 | **beats 405B** on IFEval/GPQA/MATH at 70B cost | Instruct-only (no base to fine-tune), text-only |

## Quick picks (within this bucket)

- **Best general-purpose Llama you can run on one big GPU box:** **Llama 3.3 70B Instruct** — IFEval 92.1, GPQA 50.5, MATH 77.0, i.e. 405B-class steerability/reasoning at 70B serving cost.
- **Best 70B *base* for fine-tuning / continued pretraining:** **Llama 3.1 70B** (3.3 has no base release).
- **Best local code model in this tier:** **Code Llama 34B Instruct** (63 GB official, MP 4) if you specifically need Code Llama's prompting/infill-era behaviour; otherwise a general 70B-class model beats it.
- **Cheapest "real" 70B to experiment with:** **Llama 2 70B** only for reproducing 2023-era work — capability-wise it is the weakest entry here.

## The honest trade-off of this tier

This is the tier where **one 141 GB (BF16, computed) weight set** — or roughly 40 GB at 4-bit — still runs on a single well-equipped server or a small multi-GPU box, and where Llama's official numbers were *genuinely competitive for their era*. All six families are 2023–2024 technology: knowledge cutoffs are Dec 2023 at best, there is **no vision** anywhere in this bucket (Llama 3.2 Vision 90B sits above it), and every model here has been superseded in 2025–2026 by newer open-weight 70B-class models from other labs. Choose this tier for **cost-per-quality inside the Llama ecosystem**, fine-tuning bases, or licensing continuity — not for 2026 frontier performance.

## Files

- [`llama-1.md`](llama-1.md) · [`llama-2.md`](llama-2.md) · [`codellama.md`](codellama.md) · [`llama-3.md`](llama-3.md) · [`llama-3.1.md`](llama-3.1.md) · [`llama-3.3.md`](llama-3.3.md)

**Sources:** official model cards, Llama 1/2/3 papers, Code Llama README, HF API (`expand[]=safetensors` for exact counts), [`../llama-models-complete-guide.md`](../llama-models-complete-guide.md).
