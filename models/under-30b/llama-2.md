# Llama 2 — 7B and 13B (under-30B sizes)

> **Family spans buckets:** Llama 2 **70B** (base + chat) lives in [`../30b-to-70b/llama-2.md`](../30b-to-70b/llama-2.md).

**Released:** 18 Jul 2023 · **Type:** base + **Llama-2-Chat** (first RLHF-tuned Llama) · **Status:** discontinued but still widely mirrored/fine-tuned · **Licence:** Llama 2 Community Licence + Acceptable Use Policy — commercial use allowed; >700M monthly active users requires a separate Meta licence

## Variants in this bucket (8 of the 12 Llama 2 HF repos)

| Variant | Params | Context | GQA | Training tokens | HF repos |
|---|---|---|---|---|---|
| Llama 2 7B (base) | 6.738B | 4,096 | ✗ | 2.0T | `Llama-2-7b`, `Llama-2-7b-hf` |
| Llama-2-Chat 7B | 6.738B | 4,096 | ✗ | 2.0T | `Llama-2-7b-chat`, `-chat-hf` |
| Llama 2 13B (base) | 13.016B | 4,096 | ✗ | 2.0T | `Llama-2-13b`, `-13b-hf` |
| Llama-2-Chat 13B | 13.016B | 4,096 | ✗ | 2.0T | `Llama-2-13b-chat`, `-chat-hf` |

*`-hf` = converted to standard Hugging Face `transformers` format; unsuffixed = Meta's original consolidated weights. Chat models = SFT + RLHF (reward model trained on ~1.4M preference comparisons, ~40k of them human-written) + "Ghost Attention" to keep system-prompt instructions alive across turns.*

**Popularity signal (HF downloads/month, 2026-10):** `Llama-2-7b-hf` 419,550 · `Llama-2-7b-chat-hf` 132,956 · `Llama-2-13b-chat-hf` 175,402 — still downloaded in 2026, mostly for education/fine-tuning.

## Official benchmarks (Meta internal, base models)

| Model | Code | Commonsense | World knowledge | Reading comp. | **Math** | MMLU | BBH | AGI Eval |
|---|---|---|---|---|---|---|---|---|
| Llama 2 7B | 16.8 | 63.9 | 48.9 | 61.3 | **14.6** | 45.3 | 32.6 | 29.3 |
| Llama 2 13B | 24.5 | 66.9 | 55.4 | 65.8 | **28.7** | 54.8 | 39.4 | 39.1 |

Meta's own claim for the chat models: Llama-2-Chat "outperform[s] open-source chat models on most benchmarks we tested" and in human helpfulness/safety evals was "on par with some popular closed-source models like ChatGPT and PaLM" (official card — 2023-era comparisons).

## What it's good at (pros)

- **The first Llama you could legally ship in a product.** Public weights + a licence permitting commercial use; announced with Microsoft as distribution partner. This is the model that made "open LLM startup" possible.
- **Proper RLHF chat behaviour** in a small footprint: 7B/13B chat models that hold a system prompt across turns (GAtt), usable for customer-service-style dialogue and fine-tuning.
- **A canonical fine-tuning base.** The 2T-token pretraining + gentle size made Llama 2 7B/13B the default starting point for a generation of fine-tunes (Vicuna-lineage, WizardLM-era, domain adapters) and for teaching fine-tuning pipelines.
- Cheap to run: 7B ≈ 13.5 GB, 13B ≈ 26 GB BF16 (computed), GGUF/AWQ/GPTQ everywhere, CPU-viable with 4-bit.

## What it's NOT good at (cons)

- **Officially English-only.** The card's Out-of-scope section: *"Use in languages other than English."* Fine-tuning for other languages is allowed by the licence but was never Meta's training target.
- **4,096-token context** — a hard ceiling for RAG over real documents; nothing like the 128k of Llama 3.1+.
- **Weak by any modern standard.** MMLU 45.3 (7B) / 54.8 (13B) and **math 14.6 / 28.7** are far below Llama 3.1 8B (MMLU 73.0, MATH 51.9). If you are picking a model in 2026 on capability alone, there is no reason to choose these over Llama 3.1 8B.
- **2023 knowledge and 2023 safety work:** no system-level safeguards out of the box (Meta's later guidance is to pair models with Llama Guard / Prompt Guard), no official quantized weights, no vision, no tool-use benchmark support, dated refusal behaviour.
- Knowledge cutoff is early 2023; the chat models are prone to the generic 2023-era assistant failure modes (verbose templated answers, over-refusal after RLHF).
- Licence is *source-available*, not OSI open source (AUP + 700M MAU clause).

## Hardware & ecosystem

| | 7B | 13B |
|---|---|---|
| BF16 (computed) | ≈ 13.5 GB | ≈ 26 GB |
| 4-bit GGUF (community) | ≈ 4–5 GB | ≈ 8–9 GB |
| Typical target | laptop CPU, 8–12 GB GPU | 1× 24 GB GPU |

Ecosystem is complete but frozen: every quant format, every serving stack, no new official work since 2023.

## Who should pick this
- **Yes:** you need a small commercial-licence base model for a pipeline you started years ago; you are reproducing 2023-era research; you want the *classic* RLHF fine-tuning base.
- **No:** any new 2026 project — use **Llama 3.1 8B** (128k ctx, 8 languages, far stronger) or a current non-Llama small model.

## Sources
- Official card: `github.com/meta-llama/llama-models/models/llama2/MODEL_CARD.md` (intended use, out-of-scope, chat claim, benchmark table) — cached copy: `~/.cache/llama-research/cards/llama2_MODEL_CARD.md`
- Llama 2 paper: arXiv:2307.09288 (RLHF recipe, GAtt, reward-model data)
- HF API (repo list, exact params, downloads, licences): `huggingface.co/api/models?author=meta-llama`
- Licence/OSI discussion: [`../llama-models-complete-guide.md`](../llama-models-complete-guide.md) §7
