# Llama 3.3 70B Instruct — the family's best 70B (30B–70B)

**Released:** 6 Dec 2024 · **Type:** **Instruct only — there is no Llama 3.3 base model** · **Status:** active — still Meta's recommended general 70B (llama.com listed it as current as of 2026-10-26) · **Licence:** Llama 3.3 Community Licence (commercial; explicitly allows synthetic data / distillation)

## Variant in this bucket (the only Llama 3.3 repo)

| Variant | Exact params | Context | GQA | Tokens | Languages | Cutoff | HF repo | Downloads/mo (2026-10) |
|---|---|---|---|---|---|---|---|---|
| Llama 3.3 70B Instruct | 70.554B | 128,000 | ✓ | 15T+ | 8 supported | Dec 2023 | `Llama-3.3-70B-Instruct` | **300,174** |

**Training (official card):** pretrained on ~15T tokens; fine-tuned on public instruction data **plus >25M synthetically generated examples**; **7.0M H100 GPU-hours**, 12.9 tCO₂e. Input/output: multilingual text and code.

## Official benchmarks — "405B-class at 70B cost" (Llama 3.3 card)

| Metric | (3.1 8B) | (3.1 70B) | **3.3 70B** | (3.1 405B) |
|---|---|---|---|---|
| MMLU (CoT) | 73.0 | 86.0 | **86.0** | 88.6 |
| MMLU-Pro (CoT) | 48.3 | 66.4 | **68.9** | 73.3 |
| **IFEval (steerability)** | 80.4 | 87.5 | **92.1** | 88.6 |
| **GPQA Diamond (CoT)** | 31.8 | 48.0 | **50.5** | 49.0 |
| HumanEval | 72.6 | 80.5 | **88.4** | 89.0 |
| MBPP EvalPlus | 72.8 | 86.0 | **87.6** | 88.6 |
| **MATH (CoT)** | 51.9 | 68.0 | **77.0** | 73.8 |
| BFCL v2 (tool use) | 65.4 | 77.5 | 77.3 | **81.1** |
| MGSM (multilingual math) | 68.9 | 86.9 | 91.1 | **91.6** |

**It beats the 405B on IFEval, GPQA Diamond and MATH** — the entire point of the release, and it is why the independent coding benchmark below still used it as the Llama to beat.

## What it's good at (pros)

- **Best quality-per-GB in the whole Llama line:** steerability (92.1), science reasoning (50.5) and math (77.0) all above the 5×-larger 405B, in 141 GB (computed) instead of 812 GB.
- **The sweet spot for deployment:** strong enough to be the main model of a product, small enough for one 2-node GPU box or ~40 GB at 4-bit; 300k monthly downloads show it's what people actually serve.
- **Best in-family general chat/agent model:** top-tier IFEval = follows system prompts and formats reliably; BFCL 77.3 = solid function calling; 128k context; 8 languages.
- Independent corroboration: in **Rootly AI Labs' April 2025 coding benchmark** (100 real Mastodon bug issues → pick the fixing PR), Llama 3.3 70B scored **72%**, beating **Llama 4 Maverick's 70%** — the previous generation beating the new flagship is the strongest external evidence for this model's standing.
- Licence explicitly supports using its outputs for distillation.

## What it's NOT good at (cons)

- **No base model — you cannot fine-tune Llama 3.3 from scratch weights** (Instruct-only release). For fine-tuning you must fall back to Llama 3.1 70B.
- **Text-only:** no vision, audio, or native multimodality (Llama 4 covers that, at 109B+ total).
- **Knowledge cutoff Dec 2023** — 3 years stale in 2026; needs RAG for anything current.
- Dense-70B economics: 141 GB BF16 and one-forward-pass-per-token cost, versus Llama 4 Maverick's 17B-active MoE delivering higher benchmark numbers (GPQA 69.8, LiveCodeBench 43.4) with similar per-token compute.
- Still not frontier-class in absolute terms by 2026 (GPQA 50.5 vs today's open models), and no official quantized checkpoint (community GGUF/AWQ only).
- Same source-available licence caveats (AUP + 700M-MAU clause).

## Hardware & ecosystem

| | 70B |
|---|---|
| BF16 (computed) | ≈ 141 GB (2× 80 GB) |
| FP8/INT8 (community) | ≈ 70 GB |
| 4-bit GGUF (community) | ≈ 40 GB |
| Typical target | 2× H100/A100 80GB; single 8×H100 node with tensor parallel; quantized single-node consumer setups exist |

Ecosystem: the default model in most Llama-oriented tutorials/evals of 2025; vLLM/SGLang/llama.cpp/Ollama all have canonical support.

## Who should pick this
- **Yes:** the main Llama to *serve* for general chat, RAG, agents, and tool use in 2026; the cost-conscious alternative to 405B; the model to benchmark your stack against.
- **No:** fine-tuning from a base (use 3.1 70B), vision (use Llama 4), or cutting-edge reasoning/knowledge (consider newer non-Llama or Muse models).

## Sources
- Official card `models/llama3_3/MODEL_CARD.md` (release date, 25M synthetic examples, 7.0M GPU-hours, benchmark table) — cached: `~/.cache/llama-research/cards/llama3_3_MODEL_CARD.md`
- Independent eval: Rootly AI Labs, *Llama 4 Benchmarked Against Coding-Centric Models* (2025-04-11, updated 2026-06-18): 3.3 70B = 72% vs Maverick = 70%
- HF API · llama.com current nav (2026-10-26) · [`../llama-models-complete-guide.md`](../llama-models-complete-guide.md) §3.8
