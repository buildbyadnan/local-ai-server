# Llama 2 70B — base and Chat (30B–70B)

> **Family spans buckets:** Llama 2 7B / 13B are in [`../under-30b/llama-2.md`](../under-30b/llama-2.md).

**Released:** 18 Jul 2023 · **Type:** base + Llama-2-Chat · **Status:** discontinued (still mirrored) · **Licence:** Llama 2 Community Licence + AUP (commercial; >700M MAU needs a Meta licence)

## Variants in this bucket (4 of the 12 Llama 2 HF repos)

| Variant | Exact params | Context | GQA | Training | HF repo | Downloads/mo (2026-10) |
|---|---|---|---|---|---|---|
| Llama 2 70B (base) | 68.977B | 4,096 | **✓** (only size that got it) | 2.0T tokens, 21,000 pFLOP-days | `Llama-2-70b`, `Llama-2-70b-hf` | 16 / 22,396 |
| Llama-2-Chat 70B | 68.977B | 4,096 | ✓ | SFT + RLHF (Stable Reward Model + PPO) | `Llama-2-70b-chat`, `-chat-hf` | 1 / 3,815 |

**Why GQA matters here:** grouped-query attention (8 KV heads instead of 64) was introduced *only* on the 70B to make inference memory/throughput sane — the architectural seed of the GQA-everywhere policy in Llama 3+.

## Official benchmarks (Meta internal, base models — same harness as the smaller sizes)

| Model | Code | Commonsense | World knowledge | Reading comp. | Math | **MMLU** | BBH | AGI Eval |
|---|---|---|---|---|---|---|---|---|
| Llama 2 70B | **37.5** | **71.9** | **63.6** | **69.4** | **35.2** | **68.9** | **51.2** | **54.2** |
| *(compare Llama 3 70B, 2024)* | — | — | — | — | — | 79.5 base / 82.0 instruct | 81.3 | — |

Meta's chat-model claim for the era: Llama-2-Chat 70B was "on par with some popular closed-source models like ChatGPT and PaLM" in human helpfulness/safety evals (official card, 2023 framing).

## What it's good at (pros)

- **The model that made "open 70B" a product category** — first 70B-class weights with a *commercial* licence; it powered the first wave of open commercial assistants and API providers (2023).
- **RLHF-tuned 70B chat** with system-prompt persistence (GAtt) — strong for its time, and a well-understood fine-tuning target (many open 70B chat derivatives descend from it).
- **GQA at 70B** makes BF16 serving (≈138 GB, computed) far more practical than a pure-MHA 70B would be.
- Full quantization ecosystem (GGUF/AWQ/GPTQ/EXL2 all have canonical Llama-2-70B conversions).

## What it's NOT good at (cons)

- **4,096-token context and English-only** (card's Out-of-scope section) — both fatal for modern deployments.
- **Capability age:** MMLU 68.9 is *lower than Llama 3.1 8B's 73.0* — a 2024 model more than 9× smaller beats it; math 35.2 vs 51.9. Its only remaining advantage is "it exists under the Llama 2 licence."
- No tool use, no long context, no vision, no official quantized weights, safety work from 2023 (no Llama Guard pairing in the original release).
- Knowledge cutoff early 2023; heavy, dated refusal behaviour on the chat variant.
- Tiny ongoing usage: single-digit monthly downloads on the original unsuffixed repos — the world has moved on.

## Hardware & ecosystem

| | 70B |
|---|---|
| BF16 (computed) | ≈ 138 GB (2× 80 GB minimum, or 4× 40 GB) |
| 4-bit GGUF (community) | ≈ 38–40 GB |
| FP8/FP16 serving (2023-era practice) | vLLM/Text-Generation-Inference of that era, MP 8 like Code Llama 70B |

## Who should pick this
- **Yes:** reproducing 2023-era results, maintaining a derivative built on Llama 2, or when a licence/compliance constraint specifically pins you to Llama 2 terms.
- **No:** any new build — **Llama 3.1 70B** (fine-tuneable base) or **Llama 3.3 70B Instruct** (best general) are the same size and generationally superior.

## Sources
- Official card `models/llama2/MODEL_CARD.md` (benchmarks, GQA/21,000 pFLOP-days, chat claim, scope) — cached: `~/.cache/llama-research/cards/llama2_MODEL_CARD.md`
- Llama 2 paper arXiv:2307.09288 (RLHF, GAtt, reward model)
- HF API (params/downloads) · [`../llama-models-complete-guide.md`](../llama-models-complete-guide.md) §3.2
