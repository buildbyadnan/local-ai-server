# Llama models by size — what each one is good at, what it is NOT good at

**Compiled:** 2026-10-26 (research cutoff: 25 Oct 2026)
**Companion documents:**
- [`llama-models-complete-guide.md`](llama-models-complete-guide.md) — the full reference: timeline, all 70 official repos, architecture, licensing, the "no Llama 5" debunk. The tier files below **cite and link back to it** instead of duplicating it.

## Directory layout

| Directory | Bucket | What's inside |
|---|---|---|
| [`under-30b/`](under-30b/) | fewer than 30B total parameters | Llama 1 6.7B/13B · Llama 2 7B/13B · Code Llama 7B/13B · Llama 3 8B · Llama 3.1 8B · Llama 3.2 1B/3B (+official INT4) · Llama 3.2 Vision 11B · all safety classifiers (Llama Guard 1–4, Prompt Guard 1–2) |
| [`30b-to-70b/`](30b-to-70b/) | 30B up to and including the 70B class | Llama 1 32.5B/65.2B · Llama 2 70B · Code Llama 34B/70B · Llama 3 70B · Llama 3.1 70B · Llama 3.3 70B |
| [`70b-plus/`](70b-plus/) | above the 70B class (90B+) | Llama 3.2 Vision 90B · Llama 3.1 405B (+FP8) · Llama 4 Scout (109B total) · Llama 4 Maverick (400B total) · Llama 4 Behemoth (announced, never released) |

Each directory has a `README.md` with a comparison table and quick picks, plus one file per model family covering **every variant in that bucket**: specs, official benchmarks, **good at / not good at, pros, cons**, hardware footprint, ecosystem notes, and sources.

## Bucketing rules (so the tiers are unambiguous)

1. **Buckets use *total* parameters**, not active parameters. Examples from the official HF safetensors metadata: Llama 3.3 70B Instruct = 70.554B, Llama 3.1 405B = 405.853B, Llama 4 Scout = 108.642B, Maverick = 401.584B.
2. **The middle bucket is "30B–70B class".** It includes the models the whole world calls "70B" even though their exact counts are 70.554B (Llama 3/3.1/3.3) and 68.977B (Llama 2 / Code Llama 70B). Anything at 90B and above goes to `70b-plus/`.
3. **Mixture-of-experts note.** Llama 4 Scout is 109B total but only **17B activated per token** (16 experts); Maverick is 400B total / **17B active** (128 experts). Both live in `70b-plus/` because *storage and memory* scale with total parameters — but *compute per token* and per-token latency look like a 17B-class model. Read their files for the split picture.
4. **Families that span buckets** (Llama 1, Llama 2, Code Llama, Llama 3, Llama 3.1, Llama 3.2 Vision) appear in more than one directory; each file covers that bucket's variants and cross-links its siblings.
5. **Safety classifiers are not chat models.** All of them (Llama Guard 1/2/3/4, Prompt Guard 1/2) are under 30B, so the whole family is documented in `under-30b/safety-classifiers.md`.

## How this was researched (authenticity notes)

- **Primary sources first:** official Meta model cards (`github.com/meta-llama/llama-models`), the Code Llama README and paper (arXiv:2308.12950), the Llama 1/2/3 papers (2302.13971, 2307.09288, 2407.21783), Purple Llama safety cards, and the Hugging Face API (`?author=meta-llama` → exactly 70 repos; safetensors parameter counts retrieved with `expand[]=safetensors`).
- **Benchmarks are quoted from the official model cards** and labelled as such — they are Meta's own numbers, which matters most for Llama 4 (see below).
- **Weaknesses and cons are sourced, not guessed.** Where a con is about real-world quality rather than a spec, it is attributed: e.g. the Llama 4 benchmark-gaming investigation (The Verge, 8 Apr 2025), Meta VP Ahmad Al-Dahle's own admission of "mixed quality" (TechCrunch, 7 Apr 2025), Yann LeCun's later confirmation that results "were fudged a little bit" (Financial Times interview, reported 2 Jan 2026), an independent coding evaluation (Rootly AI Labs, Apr 2025), and the Llama 3 paper's own statement that 405B BF16 does not fit one 8×H100 node (§6.1).
- **Negative findings were checked too** (e.g. "is there any independent evaluation of Llama 4 Scout's full 10M-token window?" — searched Hacker News/Algolia and DuckDuckGo lite, Oct 2026: nothing found; stated as such rather than papered over).
- Numbers that are computed (memory footprints) are marked as computed: *params × 2 bytes for BF16*.

## Two caveats before you pick a model

1. **The Llama line stopped in April 2025.** No Llama model has shipped since Llama 4 (5 Apr 2025); Meta pivoted to the **Muse** family (Muse Spark 2026-04-08, Muse Glimmer Apache-2.0 2026-08-10, Muse Spark Open 2026-10-15). Every "pros vs 2026 competitors" note here reflects that.
2. **"Best Llama" ≠ "best model."** By Oct 2026 the open-weight frontier includes Qwen 3.x/3.6, DeepSeek, GLM, Kimi, Mistral/Gemma, and Meta's own Muse Spark Open — several are newer and stronger than any Llama at a given size.
