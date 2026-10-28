# Code Llama — 7B and 13B (under-30B sizes)

> **Family spans buckets:** Code Llama **34B and 70B** are in [`../30b-to-70b/codellama.md`](../30b-to-70b/codellama.md).

**Released:** 24 Aug 2023 (70B followed 29 Jan 2024) · **Type:** Llama 2 fine-tunes specialised for code · **Status:** discontinued / dated · **Licence:** Llama 2 Community Licence (commercial use allowed)

## Variants in this bucket (6 of the 12 Code Llama HF repos)

| Variant | Params | Context | What it's for | HF repo |
|---|---|---|---|---|
| **Code Llama 7B** (base) | 6.739B | 16,384 (claimed useful to 100k) | completion / continuation prompting | `CodeLlama-7b-hf` |
| **Code Llama – Python 7B** | 6.739B | ditto | Python-only specialist (+100B Python tokens) | `CodeLlama-7b-Python-hf` |
| **Code Llama – Instruct 7B** | 6.739B | ditto | programming dialogue (→prompt format) | `CodeLlama-7b-Instruct-hf` |
| **Code Llama 13B** (base) | 13.016B | ditto | better completion than 7B | `CodeLlama-13b-hf` |
| **Code Llama – Python 13B** | 13.016B | ditto | Python specialist | `CodeLlama-13b-Python-hf` |
| **Code Llama – Instruct 13B** | 13.016B | ditto | programming dialogue | `CodeLlama-13b-Instruct-hf` |

**Training recipe (paper arXiv:2308.12950):** Llama 2 → +500B code tokens → +20B long-context (16k) tokens; Python flavour inserts +100B Python-only tokens before the long-context stage; Instruct adds +5B instruction tokens.

**Infilling (FIM):** Meta's README states *"7B and 13B Code Llama and Code Llama - Instruct variants support infilling based on surrounding content."* (i.e. base + Instruct, not the Python flavour; support on 34B/70B is **not stated in the README — treat as unverified**.) Infilling is the killer feature here: complete a hole *inside* an existing file rather than only continuing it.

**Official download sizes / model-parallel values (README):** 7B ≈ 12.55 GB, MP 1 · 13B = 24 GB, MP 2. `All models, except the 70B python and instruct versions, support sequence lengths up to 100,000 tokens` (README) — but the cache is pre-allocated, so set `max_seq_len` to what your hardware can hold.

## Official benchmarks (paper headline results)

- **Up to 67% HumanEval and 65% MBPP** — state of the art among *open* models at release (the 34B/70B sizes carry the top numbers; see the sibling file).
- **Code Llama – Python 7B beat Llama 2 70B** on HumanEval and MBPP — the release's headline "small beats big" result (Python-specialisation + code data at 1/10 the size).
- All variants outperformed every publicly available model on **MultiPL-E** (multilingual code) at release.

## What it's good at (pros)

- **Infilling inside existing files** — makes it a natural fit for IDE completion, "fix this function", and agent-style edit loops, at sizes that run on one small GPU.
- **Long code context for its era:** 16k trained, usable to 100k — you can feed a whole small codebase (README's own framing), far beyond Llama 2's 4k.
- **Three prompt styles to choose from:** continuation (base), Python-specialised continuation, or instruction dialogue — the base/Python models are good for low-level completion, the Instruct ones for chat-with-code.
- **Cheap and battle-tested in tooling:** 7B ≈ 12.55 GB / 13B = 24 GB official sizes; MP 1/2; llama.cpp, HF transformers, vLLM, every code-assistant integration from 2023–2024 already speaks it.
- Commercially usable under the Llama 2 licence; heavy community derivative ecosystem (fine-tuned code assistants, continued-pretraining recipes).

## What it's NOT good at (cons)

- **It is a 2023 model.** By the Llama family's own later numbers, Llama 3.1 **8B Instruct reaches HumanEval 72.6** on the official 3.1 card — above Code Llama's 67% headline (measured on different harnesses, but the direction is unambiguous). In 2026, current code models are far ahead again.
- **16k *training* window:** the "100k" figure is Meta's claimed improvement on long inputs, not a benchmarked guarantee; quality at the far end of the window degrades (standard for the era).
- **No tool use / agentic support, no system-prompt discipline** of the Llama 3.1+ generation, no vision, knowledge frozen at Llama 2's early-2023 cutoff — it knows nothing about libraries released since.
- **Instruct variants use the legacy `<<SYS>>`/`[INST]` prompt format**, separate from Llama 3+'s chat template; the 70B Instruct even needs a different turn-based format (README) — annoying to integrate today.
- Infilling support beyond 7B/13B is undocumented; Python flavour doesn't get it per the README.
- No official quantized weights (community GGUF/AWQ only), no safety stack pairing (pre-Purple-Llama-guardrails era guidance).

## Hardware & ecosystem

| | 7B | 13B |
|---|---|---|
| Official size (README) | ≈ 12.55 GB | 24 GB |
| Model-parallel GPUs (README) | 1 | 2 |
| 4-bit GGUF (community) | ≈ 4–5 GB | ≈ 8–9 GB |

**Popularity (HF downloads/month, 2026-10):** Python 7B 8,403 · Instruct 7B 2,719 · base 7B 169 — the *Python 7B* remains the most-used, which fits its "small Python specialist" niche.

## Who should pick this
- **Yes:** a lightweight local code-completion/infilling model, reproducing 2023 code-LLM research, or a base for further code continual-pretraining where you want a code-heavy starting point.
- **No:** any new coding assistant — **Llama 3.1 8B Instruct** (or Llama 4 Maverick, LiveCodeBench 43.4) is the in-family answer; current non-Llama coding models are stronger still.

## Sources
- `github.com/facebookresearch/codellama` README (sizes, MP, 100k note, infilling scope, prompt-format notes) — cached: `~/.cache/llama-research/cards/codellama.md`
- Code Llama paper: arXiv:2308.12950 (recipe, HumanEval/MBPP/MultiPL-E claims, Python-7B-vs-70B result)
- HF API for exact params/downloads/licences · benchmark cross-reference: [`../llama-models-complete-guide.md`](../llama-models-complete-guide.md) §3.3
