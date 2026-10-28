# Safety classifiers — Llama Guard 1–4 and Prompt Guard 1–2 (all under 30B)

**These are not chat models.** They are the **Purple Llama** safety line: small models that sit *in front of / behind* any LLM (Llama or not) and classify content. Every one of them lands under 30B, so the whole family is documented here.

**Compiled:** 2026-10-26 · Numbers below are from the official model cards (fetched from the public HF model pages on 2026-10-26 — the raw files are gated) and the Purple Llama repo.

## Complete inventory

| Model | Exact params | Base | Taxonomy / labels | Released | HF repo | Downloads/mo (2026-10) |
|---|---|---|---|---|---|---|
| **Llama Guard 1 (7B)** | 6.738B | Llama 2 7B | **6** harm types (own taxonomy) | 2023-12 | `LlamaGuard-7b` | 2,791 |
| **Llama Guard 2 (8B)** | 8.030B | Llama 3 8B | MLCommons PoC | 2024-04 | `Meta-Llama-Guard-2-8B` | 1,889 |
| **Llama Guard 3 8B** | 8.030B | Llama 3.1 8B | **14** (S1–S14, incl. Code Interpreter Abuse), 8 languages | 2024-07 | `Llama-Guard-3-8B` | 27,379 |
| **Llama Guard 3 8B INT8** | 8.032B | *" | 14 | 2024-07 | `Llama-Guard-3-8B-INT8` | 9,063 |
| **Llama Guard 3 1B** | **1.498B** | Llama 3.2 1B | **13** (no S14) | 2024-09 | `Llama-Guard-3-1B` | 27,199 |
| **Llama Guard 3 1B INT4** | 1.123B (pruned) | *" | 13, mobile | 2024-09 | `Llama-Guard-3-1B-INT4` | 14 |
| **Llama Guard 3 11B-Vision** | 10.670B | Llama 3.2 Vision | text+image prompts | 2024-11 | `Llama-Guard-3-11B-Vision` | 1,227 |
| **Llama Guard 4 12B** | 12.001B | pruned from **Llama 4 Scout** | MLCommons, **multimodal** | 2025-04 | `Llama-Guard-4-12B` | 42,384 |
| **Prompt Guard 86M** | **278.8M** total (86M backbone + 192M embeddings) | mDeBERTa-v3-base | `benign` / `injection` / `jailbreak` | 2024-07 | `Prompt-Guard-86M` | **2,416,595** |
| **Prompt Guard 2 22M / 86M** | 70.8M / 278.8M | DeBERTa-v3 | 3-label refresh (en/fr/de/hi/it/pt/es/th) | 2025-04 | `Llama-Prompt-Guard-2-*` | 6,987 / 101,763 |

> The "86M" in Prompt Guard's name counts only the backbone; HF's safetensors total is 278.8M because of the embedding table. Likewise "Llama Guard 3 1B" is really 1.498B (1.123B after pruning for INT4, whose output head was cut from 262.6M to 40.96k params).

## How they work

- **Llama Guard family = a generative classifier.** You give it a prompt *or* a response; it *writes back* `safe` or `unsafe: <categories>` (for LG3-8B: 14 categories S1 Violent Crimes … S13 Elections, S14 Code Interpreter Abuse, aligned to the MLCommons hazard taxonomy). Scoring trick from the card: take the first token's probability as the "unsafe" score and threshold it.
- **Prompt Guard = a classic encoder classifier** (not an LLM): 3 labels, runs on CPU in front of every LLM call. *injection* = out-of-place instructions in third-party content; *jailbreak* = explicit system-prompt overrides from users. **Context window: 512 tokens** — Meta says to chunk longer inputs and scan segments in parallel.

## Official performance (from the cards)

**Llama Guard 3 8B vs predecessors (internal English test, response classification):**

| | F1 ↑ | AUPRC ↑ | FPR ↓ |
|---|---|---|---|
| Llama Guard 2 | 0.877 | 0.927 | 0.081 |
| **Llama Guard 3** | **0.939** | 0.985 | **0.040** |
| GPT-4 zero-shot baseline | 0.805 | — | 0.152 |

Tool-use safety: search-tool calls F1 0.856 (FPR 0.174), code-interpreter abuse F1 0.885 (FPR 0.125). INT8 quantization cuts the checkpoint ~40% with F1 0.939 → 0.936.

**Prompt Guard (official card):**

| Set | TPR | FPR |
|---|---|---|
| Eval — jailbreaks | 99.9% | 0.4% |
| Eval — injections | 99.5% | 0.8% |
| OOD jailbreaks | 97.5% | 3.9% |
| Multilingual jailbreaks | 91.5% | 5.3% |
| **CyberSecEval indirect injections** | **71.4%** | 1.0% |

## What they're good at (pros)

- **The default open safety stack.** Llama Guard + Prompt Guard + Code Shield are what Meta's own reference implementations ship with, and cloud providers distribute them — integrate once, matches everyone's expectations.
- **Right-sized ladder:** Prompt Guard 22M/86M (CPU, 2.4M downloads/month — one of the most-used models on HF) for *input* filtering → Llama Guard 1B/8B for *content* moderation → Llama Guard 4 12B when images are involved.
- **Standardized taxonomy:** from LG2 onward they follow MLCommons, so your moderation categories are interoperable/auditable instead of vibes; LG3 adds tool-abuse categories (S14) that matter for agents.
- **Quantized officially** (INT8 for 8B, INT4-pruned for mobile at 1.123B) and **low false-positive rate relative to baselines** (LG3 FPR 0.040 vs GPT-4's 0.152 in Meta's eval).
- **Llama Guard 4 consolidates** text + image moderation in one 12B model, replacing both LG3-8B and LG3-11B-Vision.
- Fine-tunable to your own policy (Meta explicitly recommends fine-tuning Prompt Guard on your traffic for high precision).

## What they're NOT good at (cons — mostly from the models' own Limitations sections)

- **They can be bypassed by adversarial/prompt-injection attacks** — stated outright in LG3's card: *"as an LLM, Llama Guard 3 may be susceptible to adversarial attacks or prompt injection attacks that could bypass or alter its intended use."* Prompt Guard's card likewise: *"not immune to adaptive attacks,"* made worse by the model being open (attackers can iterate against it).
- **False positives are the tax:** LG3's card warns deployment "might increase refusals to benign prompts"; Prompt Guard's real-world FPR without fine-tuning is 3–5% (OOD/multilingual), which the card says may be too high unless you raise the threshold or fine-tune.
- **Some categories need up-to-date knowledge the model doesn't have** — LG3 card: S5 Defamation, S8 IP, S13 Elections "require factual, up-to-date knowledge… we believe more complex systems should be deployed"; it is "a good baseline," not a solution.
- **Prompt Guard misses harder injections:** 71.4% TPR on CyberSecEval indirect injections (i.e. ~28% of sophisticated indirect injections pass), and its 512-token window means long documents must be chunked (chunk boundaries are a bypass surface).
- **Generative Llama Guards are slow-ish** (each classification is a text generation) and English-centric: multilingual FPRs and F1s vary (e.g. LG3 Thai F1 0.834 vs French 0.943), and the taxonomy itself is Western/MLCommons-shaped — custom policies need fine-tuning.
- **Fixed, non-configurable policy out of the box:** you get *their* categories; niche orgs (e.g. finance, health-specific moderation) must fine-tune or layer their own rules.
- **Superseded versions everywhere** — LG1's 6-category taxonomy and LG2 were both replaced within months; LG3-11B-Vision was replaced by LG4. Using an old one means an outdated taxonomy.
- All repos are **gated** (licence acceptance), and none has been updated since **2025-04-28** (Prompt Guard 2 = the last weights Meta ever published to the org).

## How to combine them (Meta's intended pattern)

1. **Prompt Guard 2** (86M, or 22M for latency) on every incoming string → catch *injection/jailbreak* at the door (chunk anything >512 tokens).
2. **Llama Guard 3 8B** (or **1B INT4** on-device) on model outputs (and optionally inputs) → content-policy classification across 14 categories / 8 languages.
3. **Llama Guard 4 12B** instead of #2 if users upload images.
4. **Code Shield** for code-execution safety in agent loops. Pair with the generation model of your choice — these are model-agnostic.

## Sources
- Llama Guard 3 8B model card (HF public page, fetched 2026-10-26): taxonomy S1–S14, F1/AUPRC/FPR tables, tool-use table, quantization table, Limitations section
- Prompt Guard model card (HF public page, fetched 2026-10-26): 3 labels, 512-token window, mDeBERTa backbone/embedding split, TPR/FPR table, Limitations
- `github.com/meta-llama/PurpleLlama` (Llama Guard 1/2 READMEs, taxonomy history)
- Paper: arXiv:2312.06674 (Llama Guard) · MLCommons taxonomy arXiv:2404.12241 (LG3) / 2503.05731 (LG4)
- HF API for exact params, repos, downloads · family history: [`../llama-models-complete-guide.md`](../llama-models-complete-guide.md) §3.10
