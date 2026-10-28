# Code Llama — 34B and 70B (30B–70B sizes)

> **Family spans buckets:** Code Llama 7B / 13B are in [`../under-30b/codellama.md`](../under-30b/codellama.md).

**Released:** 34B on 24 Aug 2023 · 70B on 29 Jan 2024 · **Type:** Llama 2 code fine-tunes (base / Python / Instruct) · **Status:** discontinued / dated · **Licence:** Llama 2 Community Licence (commercial)

## Variants in this bucket (6 of the 12 Code Llama HF repos)

| Variant | Exact params | Official size | MP (GPUs) | Context | HF repo | Downloads/mo (2026-10) |
|---|---|---|---|---|---|---|
| Code Llama 34B (base) | 33.744B | 63 GB | 4 | 16,384 (~100k) | `CodeLlama-34b-hf` | 3,688 |
| Code Llama – Python 34B | 33.744B | 63 GB | 4 | ditto | `CodeLlama-34b-Python-hf` | 7 |
| Code Llama – Instruct 34B | 33.744B | 63 GB | 4 | ditto | `CodeLlama-34b-Instruct-hf` | 267 |
| Code Llama 70B (base) | 68.977B | 131 GB | 8 | 16,384 (~100k*) | `CodeLlama-70b-hf` | 8 |
| Code Llama – Python 70B | 68.977B | 131 GB | 8 | **100k *not* supported** | `CodeLlama-70b-Python-hf` | 4 |
| Code Llama – Instruct 70B | 68.977B | 131 GB | 8 | **100k *not* supported** | `CodeLlama-70b-Instruct-hf` | 18 |

\* README: *"All models, except the 70B python and instruct versions, support sequence lengths up to 100,000 tokens."*
† **Infilling (FIM):** Meta's README documents it for **7B and 13B** base/Instruct only — support at 34B/70B is **unverified**; assume continuation-only unless you test it.

**Release context:** the 34B was the original launch's top size (the "67% HumanEval" headline belongs to it); the 70B arrived five months later (29 Jan 2024) as Meta's answer to community 70B code models.

## Official benchmarks (paper arXiv:2308.12950)

- **Up to 67% HumanEval and 65% MBPP — state of the art among open models at release** (34B carries the top numbers).
- **Code Llama – Python 7B beat Llama 2 70B** on HumanEval/MBPP — the small-specialist headline.
- All sizes outperformed every public model on **MultiPL-E** at release.

For 2026 perspective: Llama 3.1 8B *Instruct* scores **HumanEval 72.6** on the official 3.1 card — a general 8B from 18 months later beats the Code Llama headline (different harnesses, but the gap is real), and Llama 4 Maverick reaches LiveCodeBench 43.4.

## What it's good at (pros)

- **The classic local code specialist:** 34B at 63 GB (MP 4) fits one fat GPU or a 2×GPU box and was *the* code-completion model for the 2023–2024 tooling wave (continue.dev, early editor assistants, code agents).
- **Three prompt personalities:** base (continuation/completion), Python (Python-heavy corpora), Instruct (dialogue about code with the `<<SYS>>`/`[INST]` format).
- **Long code context:** 16k trained with usable inputs to ~100k (34B and all non-70B-Python/Instruct sizes) — feed whole modules/files.
- Deep community entrenchment: every quant format, countless code fine-tunes descended from it, and reproducible numbers from the paper.
- Commercial licence (Llama 2 terms).

## What it's NOT good at (cons)

- **2023-era code quality.** The SOTA claim died quickly; today it is outclassed *within Llama* by Llama 3.1 8B (HumanEval 72.6) and Llama 4 Maverick (LiveCodeBench 43.4), and massively by current non-Llama code models.
- **No documented infilling at 34B/70B** — the feature that defines Code Llama is officially only a 7B/13B story, so the *biggest* Code Llamas can't do the flagship task (per README).
- **70B Python/Instruct lose the 100k window** (README) — the two most useful 70B flavours are short-context variants.
- 68.977B/33.744B with old dense architecture = heavy for what you get: 131 GB / 63 GB official sizes, MP 8 / MP 4 just to load.
- Llama 2 knowledge base (early 2023): it doesn't know post-2023 libraries, APIs, or language features; no tool use, no vision, legacy prompt format, no official quants.
- Downloads in 2026 are tiny (single/double digits for 70B) — ecosystem momentum is gone.

## Hardware & ecosystem

| | 34B | 70B |
|---|---|---|
| Official size / MP (README) | 63 GB / MP 4 | 131 GB / MP 8 |
| BF16 (computed) | ≈ 67.5 GB | ≈ 138 GB |
| 4-bit GGUF (community) | ≈ 20 GB | ≈ 38 GB |
| Typical target | 1× 80 GB or 2× 40 GB | 2× 80 GB |

## Who should pick this
- **Yes:** 34B Instruct as a self-hosted legacy code assistant you've already tuned; reproducing the paper; a base for further code continual-pretraining.
- **No:** new coding products — use **Llama 3.1 70B/8B Instruct** (in-family) or a current dedicated code model.

## Sources
- `github.com/facebookresearch/codellama` README (sizes, MP, 100k exception, infilling scope) — cached: `~/.cache/llama-research/cards/codellama.md`
- Code Llama paper arXiv:2308.12950 (HumanEval/MBPP/MultiPL-E, Python-7B-vs-70B) · HF API · [`../llama-models-complete-guide.md`](../llama-models-complete-guide.md) §3.3
