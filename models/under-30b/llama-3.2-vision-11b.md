# Llama 3.2 Vision — 11B (under-30B, the small "seeing" Llama)

> **Family spans buckets:** Llama 3.2 Vision **90B** is in [`../70b-plus/llama-3.2-vision-90b.md`](../70b-plus/llama-3.2-vision-90b.md).

**Launched:** 25 Sept 2024 (Connect 2024) · **Type:** base + Instruct, image+text in / text out · **Status:** active · **Licence:** Llama 3.2 Community Licence

## Variants in this bucket (2 of the 4 Vision repos)

| Variant | Exact params | Input | Context | HF repo | Downloads/mo (2026-10) |
|---|---|---|---|---|---|
| Llama 3.2 Vision 11B (base) | 10.643B | text + image | 128,000 | `Llama-3.2-11B-Vision` | 12,818 |
| Llama 3.2 Vision 11B Instruct | 10.670B | text + image | 128,000 | `Llama-3.2-11B-Vision-Instruct` | 57,014 |

**How it works (official card):** built *on top of* **Llama 3.1** — the base LLM is unchanged; a separately trained **vision adapter** ("a series of cross-attention layers [that] feed image encoder representations into the core LLM") adds sight. Trained on 6B image+text pairs. The text backbone behaves like Llama 3.1 8B (its MMLU/MATH columns in the card are literally 73.0 / 51.9).

**Languages:** text-only tasks support the usual 8 (en/de/fr/it/pt/hi/es/th); **for image+text applications, English is the only language supported** (card's exact wording).

## Official benchmarks (Instruct; 11B column, 90B sibling in parentheses)

| Task | **11B** | (90B) |
|---|---|---|
| **DocVQA (test)** | **88.4** | (90.1) |
| **ChartQA (test, CoT)** | **83.4** | (85.5) |
| AI2 Diagram (test) | 91.1 | (92.3) |
| VQAv2 (test) | 75.2 | (78.1) |
| MMMU (val, CoT) | 50.7 | (60.3) |
| MMMU-Pro Standard | 33.0 | (45.2) |
| MathVista (testmini) | 51.5 | (57.3) |
| *(text)* MMLU (CoT) | 73.0 | (86.0) |

## What it's good at (pros)

- **Documents and charts at a sane size:** DocVQA 88.4, ChartQA 83.4, AI2 Diagram 91.1 — invoice/contract/map/chart reading on one modest GPU (≈21.3 GB BF16, computed).
- **Keeps the full 3.1-8B text brain:** MMLU 73.0, MATH 51.9, 128k context — you get long-context text reasoning *plus* vision, not a crippled multimodal sidecar.
- **Visual grounding, captioning, and image-text retrieval** are explicit intended uses — useful for "point at the region you mean" UIs and search-over-images.
- **Adapter design = cheap and safe to adopt:** base LLM untouched, so Llama-3.1-era tooling/fine-tune recipes still apply to the text side; the adapter adds ~0.03B params (10.643B → 10.670B Instruct).
- First *affordable* open Llama with eyes; commercial licence; GGUF/llama.cpp vision support in the community ecosystem.

## What it's NOT good at (cons)

- **Image understanding is English-only** — hard product limitation for non-English VQA/captioning (Llama 4 fixed this with 12 supported languages).
- **MMMU 50.7 / MMMU-Pro 33.0** — college-level multimodal reasoning is mid; it is *not* a strong visual-reasoning model, just a competent document reader.
- **Bolted-on vision, not native:** the cross-attention adapter approach is weaker than Llama 4's early-fusion multimodality (Llama 4 Maverick MMMU 73.4) and gives no audio/video.
- **No documented multi-image story:** unlike Llama 4's explicit "tested up to 5 input images", this card documents no multi-image capability or limit — treat extended multi-image use as untested.
- Knowledge cutoff Dec 2023 (from Llama 3.1); ~21 GB at BF16 is heavy for laptops; no official quantized repo (community quants only).
- Dated: a 2024 adapter model against 2025+ natively-multimodal open models.

## Hardware & ecosystem

| | 11B |
|---|---|
| BF16 (computed) | ≈ 21.3 GB |
| 4-bit GGUF (community) | ≈ 7 GB |
| Typical target | 1× 24 GB GPU |

## Who should pick this
- **Yes:** document/chart/table extraction, screenshot understanding, image-caption pipelines, and grounding — especially where you already run Llama 3.1 8B and want a vision twin.
- **No:** non-English image tasks, hard multimodal reasoning, multi-image agent loops, or anything where Llama 4 Maverick's numbers (DocVQA 94.4, MMMU 73.4) are worth the bigger footprint.

## Sources
- Official card `models/llama3_2/MODEL_CARD_VISION.md` (architecture, benchmark tables, English-only image note, intended uses) — cached: `~/.cache/llama-research/cards/llama3_2_VISION_MODEL_CARD.md`
- HF API (params, downloads, repos) · [`../llama-models-complete-guide.md`](../llama-models-complete-guide.md) §3.6
