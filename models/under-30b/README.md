# Under 30B parameters — every Llama model below 30B total

**Bucket rule:** total parameters < 30B (see [`../README.md`](../README.md)). All dense models; every Llama safety classifier also lands here.

**Compiled:** 2026-10-26 · Benchmarks = official Meta model cards unless noted · Downloads = HF "downloads last month", fetched 2026-10-26

## All models and variants in this bucket

| Model (variant) | Exact params | Ctx | Released | Officially good at | Main not-good-at |
|---|---|---|---|---|---|
| **LLaMA 1 6.7B / 13B** (base only) | 6.7B / 13.0B | 2,048 | 2023-02 | research pretraining, "small+data beats big" | no chat tuning, non-commercial, leaked weights |
| **Llama 2 7B / 13B** (+ Chat) | 6.738B / 13.016B | 4,096 | 2023-07 | first Llama you could legally ship; RLHF chat | English-only, 4k ctx, weak reasoning/math |
| **Code Llama 7B / 13B** (base, Python, Instruct) | 6.739B / 13.016B | 16,384 (to ~100k) | 2023-08 | code completion + **infilling**, long-context code | 2023-era quality, 16k training length |
| **Llama 3 8B** (+ Instruct) | 8.030B | 8,192 | 2024-04 | big jump in code/reasoning at 8B | English-only, 8k ctx, Dec-2023 knowledge |
| **Llama 3.1 8B** (+ Instruct) | 8.030B | 128,000 | 2024-07 | 128k ctx + 8 languages + tool use at 8B | GPQA 31.8 ≈ weak on hard reasoning |
| **Llama 3.2 1B** (+ Instruct, +2 quants) | 1.236B | 128,000 | 2024-09 | on-device summarization/RAG/rewrite | MMLU 49.3 (instruct) — shallow knowledge |
| **Llama 3.2 3B** (+ Instruct, +2 quants) | 3.213B | 128,000 | 2024-09 | best small edge model of the family | GPQA 32.8 ≈ chance; tool use marginal on 1B |
| **Llama 3.2 Vision 11B** (+ Instruct) | 10.643B / 10.670B | 128,000 | 2024-09 | charts/docs/VQA on modest hardware | image+text is **English-only**; 11B caps (MMMU 50.7) |
| **Prompt Guard 86M** / **Prompt Guard 2 22M, 86M** | 278.8M / 70.8M, 278.8M | **512** | 2024-07 / 2025-04 | prompt-injection & jailbreak filtering, CPU-cheap | 512-token window; adaptive attacks bypass it |
| **Llama Guard 1 7B** (`LlamaGuard-7b`) | 6.738B | 4,096 | 2023-12 | first open content-moderation LLM | own 6-category taxonomy, Llama-2-era |
| **Llama Guard 2 8B** | 8.030B | — | 2024-04 | moved moderation to MLCommons taxonomy | superseded within 3 months |
| **Llama Guard 3 1B** (+INT4) | **1.498B** / 1.123B | — | 2024-09 | cheap moderation, mobile INT4 | 13 categories only (no S14); shallow judgment |
| **Llama Guard 3 8B** (+INT8) | 8.030B | — | 2024-07 | 14 MLCommons categories, 8 languages, tool-use | FPR 0.040; jailbreak-able like any LLM guard |
| **Llama Guard 3 11B-Vision** | 10.670B | — | 2024-11 | text+image prompt classification | replaced by Llama Guard 4 |
| **Llama Guard 4 12B** | 12.001B | — | 2025-04 | single multimodal (text+image) moderator | 2025-newest, fewer independent evals |

## Quick picks (within this bucket)

- **Best small general assistant:** **Llama 3.1 8B Instruct** — 128k context, 8 languages, BFCL tool use 65.4; the 8B workhorse.
- **On-device / phone / browser:** **Llama 3.2 3B Instruct** (or **1B** + the official `SpinQuant`/`QLoRA` INT4 repos — the only official 4-bit Llama weights).
- **Local code completion + infilling:** **Code Llama 13B Instruct** (7B if you want infilling at minimum latency; 34B/70B live in the bigger buckets).
- **Vision on one modest GPU:** **Llama 3.2 Vision 11B Instruct**.
- **Prompt-injection filter in front of any LLM:** **Prompt Guard 2 86M** (or 22M for latency) — 2.4M downloads/month, runs on CPU.
- **Text content moderation:** **Llama Guard 3 8B**; **with images:** **Llama Guard 4 12B**; **mobile:** **Llama Guard 3 1B INT4**.

## The honest trade-off of this tier

Under 30B is where Llama's *ecosystem* is strongest (every size has GGUF/Ollama/AWQ conversions, the 1B/3B have official INT4) and where **latency and cost** win. It is also where Llama is *furthest behind* the 2026 frontier at the same size — these models are 1–3 years old, knowledge cutoffs are 2023 (Dec 2023 for all Llama 3.x), and the reasoning benchmarks in each file show it. Use them for **classification, rewriting, summarization, RAG, moderation, and on-device work** — not for hard reasoning or up-to-date knowledge.

## Files

- [`llama-1.md`](llama-1.md) · [`llama-2.md`](llama-2.md) · [`codellama.md`](codellama.md) · [`llama-3.md`](llama-3.md) · [`llama-3.1.md`](llama-3.1.md) · [`llama-3.2-text.md`](llama-3.2-text.md) · [`llama-3.2-vision-11b.md`](llama-3.2-vision-11b.md) · [`safety-classifiers.md`](safety-classifiers.md)

**Sources for this table:** official model cards (see each file), HF API `models?author=meta-llama` (+ `expand[]=safetensors` for exact counts), [`../llama-models-complete-guide.md`](../llama-models-complete-guide.md).
