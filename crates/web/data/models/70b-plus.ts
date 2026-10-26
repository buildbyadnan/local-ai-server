import type { ModelGuide } from "./types";

export const bigTierGuides: ModelGuide[] = [
  {
    slug: "llama-3-2-vision-90b",
    name: "Llama 3.2 Vision — 90B",
    tier: "70b-plus",
    tagline:
      "The big-sibling vision model of September 2024 — excellent at reading documents, but almost nobody uses it (499 downloads/month).",
    released: "25 September 2024",
    sizeLabel: "88.59B parameters",
    contextLabel: "128,000 tokens — text and images",
    ollamaTag: "llama3.2-vision:90b",
    pullSize: "55 GB",
    paramsBillions: [90],
    whatIsIt: [
      "The larger of the two Llama 3.2 Vision models (the 11B lives in the under-30B tier). Same design as the small one: an **untouched Llama 3.1 70B text model** with a cross-attention **vision adapter** bolted on, trained on 6 billion image+text pairs. Its text intelligence is literally the 70B's (the card's text MMLU column reads 86.0).",
      "It takes images plus text and answers in text. Trained uses: document Q&A, chart reading, image reasoning, captioning, grounding and retrieval.",
      "Language rule identical to the 11B: text-only tasks support eight languages; **image+text work is English-only**.",
      "Adoption is the story here: **42 and 499 downloads per month** (October 2026) — the weakest uptake of any non-safety model in Meta's 70-repo Llama library. The community largely skipped it.",
    ],
    whyMade: [
      "Enterprises wanted a serious document-reading model on the Llama 3.1 foundation, and the adapter approach shipped it fast without touching the text model everyone already trusted.",
    ],
    sizeInHumanTerms: [
      "≈ **177 GB** full quality (computed) — two 80 GB GPUs minimum; about 60 GB at 4-bit community quantization.",
      "Translation: real server hardware, for a model almost nobody ended up running — thin ecosystem support follows the low usage.",
    ],
    goodFor: [
      {
        title: "Best-in-generation document reading",
        desc: "DocVQA 90.1, AI2 Diagram 92.3 — strong extraction from scans, contracts and infographics on the Llama 3.1 foundation.",
      },
      {
        title: "Long multimodal analysis",
        desc: "It carries the full 70B text brain: MMLU 86.0, maths 68.0, and 128k context for image-plus-long-text questions.",
      },
      {
        title: "Harder visual reasoning than the 11B",
        desc: "MMMU 60.3 vs 50.7 and MMMU-Pro 45.2 vs 33.0 — the gap where the bigger text brain pays off.",
      },
      {
        title: "Staying inside the Llama 3.1 world",
        desc: "Text-side tooling and fine-tune recipes still apply; commercial licence.",
      },
    ],
    notGoodFor: [
      {
        title: "Non-English image tasks",
        desc: "English-only understanding of images, explicitly per the card.",
      },
      {
        title: "New multimodal projects",
        desc: "Llama 4 Maverick beats it on every vision metric *and* runs cheaper per token.",
      },
      {
        title: "Ecosystem-dependent work",
        desc: "499 downloads/month means comparatively thin community tooling, quants and examples.",
      },
      {
        title: "Cutting-edge visual reasoning",
        desc: "MMMU-Pro Vision 33.8 is entry-level for a model this size; no video or audio.",
      },
    ],
    flaws: [
      "**English-only image understanding** — a hard blocker for global document AI.",
      "**Bolted-on vision outclassed by Llama 4's native approach** — Maverick: MMMU 73.4, ChartQA 90.0, DocVQA 94.4.",
      "**Nobody is using it** — 42/499 monthly downloads; correspondingly thin quant and tooling support.",
      "**Heavy**: ≈177 GB BF16 for an adapter model; no official FP8/INT4 version.",
      "**Multimodal reasoning ceiling**: MMMU-Pro Vision 33.8; no documented multi-image behaviour.",
      "Knowledge cutoff December 2023; a 2024 adapter architecture versus 2025+ native multimodal models.",
    ],
    laterImprovements: [
      {
        label: "Llama 4 Scout/Maverick (April 2025)",
        text: "Early-fusion multimodality: images enter the token stream natively, in 12 languages, with multi-image support — Maverick posts DocVQA 94.4 and MMMU 73.4.",
      },
      {
        label: "Llama Guard 4 (April 2025)",
        text: "Even moderation became natively multimodal: one 12B model for text and images.",
      },
    ],
    whoShould:
      "Teams standardized on Llama 3.1/3.2 that need the best document/chart OCR-VQA of that generation with 128k context.",
    whoShouldnt:
      "New multimodal projects — Llama 4 Maverick beats it everywhere; the 11B covers most document tasks at 1/6 the memory.",
    facts: [
      { label: "Released", value: "25 Sep 2024" },
      { label: "Size", value: "88.59B" },
      { label: "Context", value: "128,000 tokens, image + text in" },
      { label: "Image languages", value: "English only" },
      { label: "Best scores", value: "DocVQA 90.1 · ChartQA 85.5 · MMMU 60.3" },
      { label: "Runs on", value: "≈177 GB BF16 (2× 80 GB)" },
      { label: "Adoption", value: "499 downloads/month (Oct 2026)" },
    ],
    sourceNote:
      "From the official Llama 3.2 Vision model card (both benchmark columns, adapter architecture, English-only image note) and the Hugging Face API for parameter counts and download figures.",
  },
  {
    slug: "llama-3-1-405b",
    name: "Llama 3.1 405B",
    tier: "70b-plus",
    tagline:
      "July 2024: the largest openly released LLM of its time — the model the whole industry benchmarked against, and a licensed 'teacher' for training smaller models.",
    released: "23 July 2024",
    sizeLabel: "405.85B parameters",
    contextLabel: "Huge — 128,000 tokens (~300 pages)",
    ollamaTag: "llama3.1:405b",
    pullSize: "243 GB",
    paramsBillions: [405],
    whatIsIt: [
      "When Meta released Llama 3.1 405B in July 2024 it was **the largest openly available language model in the world** — a dense (non-mixture-of-experts) model with 126 layers, a 16,384-wide brain, grouped-query attention, trained on 15+ trillion tokens at roughly **440,000 petaFLOP-days** of compute.",
      "It came in four flavours: base and Instruct in BF16, plus **FP8** versions of both (an 8-bit format that halves the memory). The FP8 base is the practical form — **463,000 downloads a month** (Oct 2026) versus 28,921 for the BF16 base.",
      "Its role was threefold: flagship showcase, industry benchmark anchor, and — via a licence that **explicitly permits distillation** — the legal 'teacher model' for the whole ecosystem's synthetic-data pipelines.",
      "Meta's own paper holds a crucial caveat (§6.1): in full BF16 precision, 405B *'does not fit in the GPU memory of a single machine with 8 Nvidia H100 GPUs'* — they had to spread inference across **16 GPUs on two machines**, using FP8 (§6.2) to get it onto one.",
    ],
    whyMade: [
      "Two motives: (1) prove open weights could reach the frontier — 'we are releasing the first frontier-level open-source AI model' — and (2) anchor the ecosystem. Being the biggest open model made every lab compare against it, and the distillation licence meant the whole open-model world could build on it legally.",
    ],
    sizeInHumanTerms: [
      "BF16: ≈ **812 GB** (computed) — two 8-GPU H100 servers, per Meta's own paper. FP8: ≈ **405 GB** of weights — fits one 8×H100 node with activations and KV cache. 4-bit community versions: ~200–220 GB (multi-GPU or CPU offload).",
      "Put plainly: this is data-center hardware, not a workstation. It's the size class where you rent by the hour or own a rack.",
      "Training it cost 39.3 million H100 GPU-hours across the Llama 3 project and 11,390 tonnes of CO₂e.",
    ],
    goodFor: [
      {
        title: "Distillation teacher",
        desc: "The licensed way to manufacture your own smaller models: generate millions of examples from the 405B and train a student on them.",
      },
      {
        title: "The benchmark anchor",
        desc: "Everyone measured against it in 2024–25; being on its leaderboard row makes comparisons easy.",
      },
      {
        title: "Maximum-breadth answers",
        desc: "Best-in-family MMLU-Pro 73.3, HumanEval 89.0, MBPP 88.6, and BFCL 81.1 — the best tool-calling score of any dense Llama.",
      },
      {
        title: "Reproducing 2024-era frontier results",
        desc: "Papers and comparisons from that period assume exactly this checkpoint.",
      },
    ],
    notGoodFor: [
      {
        title: "Everyday serving",
        desc: "3.3 70B matches or beats it on IFEval, GPQA and MATH at 1/5 the memory.",
      },
      {
        title: "Budget-conscious deployment",
        desc: "Even FP8 is a full 8-GPU node; energy and ops costs are an order of magnitude over 70B-class.",
      },
      {
        title: "Vision or current knowledge",
        desc: "Text only, December 2023 cutoff.",
      },
      {
        title: "Single-GPU dreams",
        desc: "Meta's own paper says BF16 doesn't fit one 8×H100 machine — only FP8/quantized forms do.",
      },
    ],
    flaws: [
      "**Hardware reality, in Meta's own words** (paper §6.1): BF16 doesn't fit one 8×H100 node — 16 GPUs across two machines minimum at full precision.",
      "**Beaten by its own 70B child** on three headline axes: IFEval (88.6 vs 92.1), GPQA (49.0 vs 50.5), MATH (73.8 vs 77.0) — 5× smaller and cheaper. Its case is breadth, not 'best at everything'.",
      "**Dense-model economics**: full forward pass per token; slow decode versus MoE rivals; heavy energy/ops burden.",
      "**Knowledge cutoff December 2023**; no vision; no official INT4/GGUF.",
      "**GPQA 49.0 in absolute terms is modest by 2026** — the model is 2+ years old and Meta's attention moved on.",
      "Gated access (licence acceptance) plus source-available licence caveats.",
    ],
    laterImprovements: [
      {
        label: "Llama 3.3 70B (December 2024)",
        text: "Proved better post-training beats more parameters: beats the 405B on IFEval, GPQA and MATH at 1/5 the size (its own page in the 30–70B tier).",
      },
      {
        label: "Llama 4 Behemoth (announced April 2025)",
        text: "Meta's planned successor at 288B-active/2T-total — **never released**, so the 405B remained the largest Llama you can actually download.",
      },
      {
        label: "Llama 4 Maverick (April 2025)",
        text: "Took the 'frontier open model' crown with 400B total (17B active) plus native vision — along with benchmark-gaming controversies (its own page).",
      },
    ],
    whoShould:
      "Distillation/synthetic-data pipelines, benchmark references, and maximum-quality Llama text pipelines where 405B-class breadth justifies a full node.",
    whoShouldnt:
      "Everyday serving (3.3 70B is the smarter buy), tight budgets, vision, or post-2023 knowledge.",
    facts: [
      { label: "Released", value: "23 Jul 2024" },
      { label: "Size", value: "405.85B (dense)" },
      { label: "Context", value: "128,000 tokens (~300 pages)" },
      { label: "Hardware (BF16)", value: "≈812 GB — 2 nodes × 8×H100 (paper §6.1)" },
      { label: "Hardware (FP8)", value: "≈405 GB — 1 node × 8×H100 (paper §6.2)" },
      { label: "Killer scores", value: "MMLU-Pro 73.3 · HumanEval 89.0 · BFCL 81.1" },
      { label: "Licence", value: "Commercial + distillation allowed" },
    ],
    sourceNote:
      "From the official Llama 3.1 model card (benchmarks, architecture, licence), the Llama 3 paper arXiv:2407.21783 §6.1–6.2 (BF16 two-machine requirement, FP8 method), and the Hugging Face API for exact counts and downloads.",
  },
  {
    slug: "llama-4-scout",
    name: "Llama 4 Scout — 17B active / 109B total",
    tier: "70b-plus",
    tagline:
      "April 2025's 'one-GPU wonder': 109B parameters where only 17B work per answer, a claimed 10-million-token context — and a share of the family's benchmark scandal.",
    released: "5 April 2025",
    sizeLabel: "108.64B total · 17B active · 16 experts",
    contextLabel: "Claimed up to 10,000,000 tokens (tens of thousands of pages)",
    ollamaTag: "llama4:scout",
    pullSize: "67 GB",
    paramsBillions: [109],
    whatIsIt: [
      "Scout is a **mixture-of-experts (MoE)** model: instead of one giant network, it has 16 'expert' sub-networks, and for each word it writes only **17 billion of its 109 billion parameters** are activated. Translation: answers cost about as much to generate as a 17B model, while *memory* still follows the full 109B.",
      "It's also **natively multimodal** — images join the text stream at the very input layer ('early fusion') rather than being bolted on via an adapter like Llama 3.2 Vision. It was trained on roughly **40 trillion tokens** (the largest Llama corpus), with knowledge cutoff August 2024, 12 supported languages, and image inputs tested up to 5 images.",
      "The headline spec: a **10-million-token context window** — the largest of any Llama, roughly the text of 15 novels held in mind at once.",
      "Meta's quantization claim: BF16 weights that *'can fit within a single H100 GPU with on-the-fly int4 quantization'* — a 109B-class model on one accelerator.",
    ],
    whyMade: [
      "Meta needed a 2025 flagship story after two years of dense models. MoE gave them the narrative: big-model quality, small-model speed, and enough context to swallow entire codebases. Scout was the efficient entry point; Maverick (its own page) was the muscle.",
    ],
    sizeInHumanTerms: [
      "Memory follows the total: ≈ **217 GB** BF16 (computed) — but Meta's on-the-fly int4 brings it onto a **single H100** (official claim). Community 4-bit versions: ~60–70 GB.",
      "The '10M context' is a capacity claim, not a memory formula — KV-cache memory at full depth is a separate, large problem (long contexts need dramatically more memory than weights alone).",
      "Trained with 5.0 million H100 GPU-hours.",
    ],
    goodFor: [
      {
        title: "Extreme-context retrieval",
        desc: "The largest context window in the Llama family — for huge-document or whole-codebase workflows where you verify quality at your actual length.",
      },
      {
        title: "Single-GPU hosting of a big model",
        desc: "Official int4 claim: fits one H100 — thanks to 17B-active decoding.",
      },
      {
        title: "Document vision on a budget",
        desc: "DocVQA 94.4 (matching Maverick), ChartQA 88.8, MMMU 69.4 — better document reading than Llama 3.2 Vision 90B.",
      },
      {
        title: "Science questions at the smaller tier",
        desc: "GPQA 57.2 — beats both 3.3 70B (50.5) and the 405B (49.0).",
      },
    ],
    notGoodFor: [
      {
        title: "Trusting extreme-context performance",
        desc: "Nothing in the official card is evaluated anywhere near 10M tokens — its own long-context benchmark uses book-length inputs. A search of Hacker News and DuckDuckGo (Oct 2026) found **no independent evaluation of the full 10M window**.",
      },
      {
        title: "Code-heavy work",
        desc: "LiveCodeBench 32.8 is flat versus Llama 3.3's 33.3 despite being newer and bigger — and an independent eval ranked Llama 4 last among tested models on coding.",
      },
      {
        title: "Bulletproof published benchmarks",
        desc: "The family's benchmark conduct is documented — see flaws below.",
      },
      {
        title: "Work where Maverick fits the budget",
        desc: "Scout loses to Maverick on essentially every quality measure.",
      },
    ],
    flaws: [
      "**The 10M window is capacity, not proven quality** — no official evaluation anywhere near that depth, and no independent one found (searched Oct 2026). Test it at your real length before trusting it.",
      "**It inherits the Llama 4 benchmark scandal**: the family's LMArena #2 result came from an *unreleased experimental variant*; Meta VP Ahmad Al-Dahle acknowledged **'mixed quality'** across hosting providers at launch (TechCrunch, 7 Apr 2025); and Yann LeCun later told the Financial Times that Llama 4 **'results were fudged a little bit'** — 'used different models for different benchmarks' (reported 2 Jan 2026).",
      "**Coding underperforms the previous generation**: in Rootly AI Labs' independent 100-issue benchmark (Apr 2025), Llama 4 placed **last (69.5%)** and below Llama 3.3 70B's 72%.",
      "**Launch-week instability**: Al-Dahle said implementations needed 'several days… to get dialed in' — early hosted versions differed in quality.",
      "**Memory follows the total**: ≈217 GB BF16 — 'fits one H100' only with int4; deep 10M context multiplies KV memory far beyond weights.",
      "Weaker than Maverick on every axis except price/context; knowledge cutoff Aug 2024; gated weights.",
    ],
    laterImprovements: [
      {
        label: "Llama 4 Maverick (same day)",
        text: "The bigger sibling with 128 experts and 1M context — stronger on every quality axis (its own page in this tier).",
      },
      {
        label: "Llama 4 Behemoth (announced, never released)",
        text: "The intended 288B-active successor to teach the family — it never shipped.",
      },
      {
        label: "Meta's Muse family (2026)",
        text: "Meta's post-Llama releases (Muse Spark April 2026, Glimmer August 2026, Spark Open October 2026) — the line Scout belongs to ended with it.",
      },
    ],
    whoShould:
      "Extreme-context workloads you'll benchmark yourself at real length, and single-GPU hosting of a 109B-class multimodal model.",
    whoShouldnt:
      "Code-heavy work (Llama 3.3 beat it independently), unverified extreme-context trust, or anything where Maverick's quality fits the budget.",
    facts: [
      { label: "Released", value: "5 Apr 2025" },
      { label: "Size", value: "108.64B total · 17B active · 16 experts" },
      { label: "Context", value: "10M claimed (no independent eval found)" },
      { label: "Languages", value: "12 supported · cutoff Aug 2024" },
      { label: "Runs on", value: "1× H100 (official on-the-fly int4)" },
      { label: "Training", value: "≈40T tokens · 5.0M H100 GPU-hours" },
      { label: "Licence", value: "Llama 4 Community — commercial OK" },
    ],
    sourceNote:
      "From the official Llama 4 model card (specs, quantization claim, benchmarks, 5-image note), TechCrunch 7 Apr 2025 (Al-Dahle 'mixed quality'), The Verge 8 Apr 2025 (LMArena experimental variant), FT via Slashdot 2 Jan 2026 (LeCun 'fudged a little bit'), Rootly AI Labs' independent coding benchmark, and a documented negative search for 10M-window evaluations (HN + DDG, Oct 2026).",
  },
  {
    slug: "llama-4-maverick",
    name: "Llama 4 Maverick — 17B active / 400B total",
    tier: "70b-plus",
    tagline:
      "The most capable model Meta ever shipped as Llama — and the one at the centre of a benchmark-gaming scandal that reshaped how the industry reads leaderboards.",
    released: "5 April 2025",
    sizeLabel: "401.58B total · 17B active · 128 experts",
    contextLabel: "1,000,000 tokens (~1,500 pages)",
    ollamaTag: "llama4:maverick",
    pullSize: "245 GB",
    paramsBillions: [400],
    whatIsIt: [
      "Maverick is Meta's strongest Llama: a **128-expert mixture-of-experts** model where only **17B of 401.6B parameters** activate per word, wrapped in natively multimodal early fusion (images and text share one stream from the input layer). Trained on ~22 trillion tokens, **co-distilled from the never-released Llama 4 Behemoth**, knowledge cutoff August 2024, 12 supported languages, up to 5 input images.",
      "Its official numbers top every Llama family table: **GPQA Diamond 69.8** (vs 50.5 for 3.3 70B), **LiveCodeBench 43.4**, **MMMU 73.4**, ChartQA 90.0, DocVQA 94.4, MGSM 92.3 — reasoning, code, math, multilingual and *all* vision metrics.",
      "Precision story: released in BF16 and **FP8**, with the official claim that *'the FP8 quantized weights fit on a single H100 DGX host while still maintaining quality'* — 400B-class quality on one 8-GPU box. The FP8 Instruct repo pulls 42k+ downloads a month (Oct 2026).",
    ],
    whyMade: [
      "To reclaim 'best open model' in April 2025 against a field of strong Chinese and American rivals — and to demonstrate MoE + early fusion + distillation in one flagship. The problem: the way Meta demonstrated it became a lasting controversy.",
    ],
    sizeInHumanTerms: [
      "Memory follows the total: BF16 ≈ **803 GB** (computed, multi-node territory); **FP8 ≈ 401 GB → one 8×H100 DGX host** (official); int4 ≈ 200 GB.",
      "Compute per token follows the *active* 17B — so generation speed resembles a mid-size model while quality targets 400B. That's the MoE promise: memory is the expensive part, not speed.",
      "Trained on 2.38 million H100 GPU-hours.",
    ],
    goodFor: [
      {
        title: "The strongest in-family assistant",
        desc: "Best Llama scores in reasoning (GPQA 69.8), code (LiveCodeBench 43.4), maths, multilingual and every vision metric — if you need the best Llama, this is it.",
      },
      {
        title: "Native multimodality",
        desc: "Charts, documents, screenshots and multi-image inputs with *multilingual* image understanding (12 languages) — fixing Llama 3.2 Vision's English-only images.",
      },
      {
        title: "FP8 on one host",
        desc: "Official: quality-preserving FP8 that fits a single DGX H100 box — the practical way to run it.",
      },
      {
        title: "Cheap-per-token decoding",
        desc: "17B active per answer means decode cost is 17B-class despite 400B-class quality.",
      },
      {
        title: "Distillation",
        desc: "Licence permits using its outputs to train your own smaller models.",
      },
    ],
    notGoodFor: [
      {
        title: "Uncaveated benchmark trust",
        desc: "Its famous #2 LMArena rank used an unreleased experimental variant — see flaws.",
      },
      {
        title: "Low-memory environments",
        desc: "Even FP8 is a full 8-GPU node; BF16 is multi-node.",
      },
      {
        title: "Facts after August 2024",
        desc: "Add retrieval for anything newer.",
      },
      {
        title: "Teams burned by launch week",
        desc: "Meta's own VP admitted mixed quality across providers — many teams waited, and by 2026 Meta itself moved to Muse.",
      },
    ],
    flaws: [
      "**The benchmark controversy is documented, not rumour**: Meta highlighted Maverick's **#2 LMArena rank (ELO 1417)**, but the submitted model was `Llama-4-Maverick-03-26-Experimental` — an *unreleased* chat variant 'optimized for conversationality', not the public weights. LMArena responded: *'Meta's interpretation of our policy did not match what we expect from model providers'* and rewrote its leaderboard policies (The Verge, *Meta got caught gaming AI benchmarks*, 8 Apr 2025). Researcher Simon Willison: *'The model score that we got there is completely worthless to me. I can't even use the model that they got a high score on.'*",
      "**Meta's own VP admitted uneven quality**: Ahmad Al-Dahle acknowledged users saw **'mixed quality'** across cloud providers, blaming stabilization and saying it would take 'several days for all the public implementations to get dialed in' (TechCrunch, 7 Apr 2025). He denied training on test sets.",
      "**Confirmed by a Meta founder, a year later**: Yann LeCun told the Financial Times Llama 4 **'results were fudged a little bit'** and that the team 'used different models for different benchmarks to give better results'; Zuckerberg was reportedly 'really upset' (reported 2 Jan 2026).",
      "**Independent coding eval contradicts the marketing**: Rootly AI Labs (Apr 2025) couldn't reproduce Meta's wins over GPT-4o/Gemini/DeepSeek — Maverick scored **70% versus Llama 3.3 70B's 72%**, with Qwen2.5-Coder-32B ~20 points ahead.",
      "**Memory follows the total**: ≈803 GB BF16; MoE serving adds real engineering overhead (expert parallelism, all-to-all communication).",
      "**Knowledge cutoff August 2024**; gated weights; source-available licence.",
    ],
    laterImprovements: [
      {
        label: "Nothing came after — this is the last real Llama",
        text: "Behemoth (the promised 288B-active/2T teacher) was announced the same day and never shipped; no Llama model has been released since 5 April 2025.",
      },
      {
        label: "Meta's Muse family (April–October 2026)",
        text: "Meta's releases continued under a new brand: Muse Spark (8 Apr 2026), Muse Glimmer under Apache-2.0 (10 Aug 2026) and Muse Spark Open (15 Oct 2026) — the Llama name itself was retired with Maverick.",
      },
      {
        label: "Industry response to the scandal",
        text: "LMArena changed its submission policies after the incident — a lasting effect of this model's launch on how leaderboards are governed.",
      },
    ],
    whoShould:
      "The strongest in-family multimodal assistant where Llama must be the answer — FP8 single-host serving, vision-heavy work, and licensed distillation.",
    whoShouldnt:
      "Anyone needing trustworthy published benchmark claims without the caveats above; teams happy with Llama 3.3-level quality at 1/4 the memory; anything needing post-Aug-2024 facts without retrieval.",
    facts: [
      { label: "Released", value: "5 Apr 2025 (last Llama model)" },
      { label: "Size", value: "401.58B total · 17B active · 128 experts" },
      { label: "Context", value: "1,000,000 tokens (~1,500 pages)" },
      { label: "Best scores", value: "GPQA 69.8 · LiveCodeBench 43.4 · MMMU 73.4" },
      { label: "Runs on", value: "1× 8-GPU H100 host (FP8, official)" },
      { label: "Knowledge cutoff", value: "August 2024" },
      { label: "Famous caveat", value: "LMArena rank used an unreleased variant" },
    ],
    sourceNote:
      "From the official Llama 4 model card (all specs and scores), The Verge 8 Apr 2025 (LMArena experimental variant + statements), TechCrunch 7 Apr 2025 (Al-Dahle quotes), FT via Slashdot 2 Jan 2026 (LeCun 'fudged a little bit'), and Rootly AI Labs' independent coding benchmark (Apr 2025 / Jun 2026).",
  },
  {
    slug: "llama-4-behemoth",
    name: "Llama 4 Behemoth — announced, never released",
    tier: "70b-plus",
    tagline:
      "The 2-trillion-parameter teacher Meta promised in April 2025 — the one Llama with no weights, no downloads, and no release. Ever.",
    released: "Announced 5 April 2025 · never released",
    sizeLabel: "288B active / ~2T total (announced) · 16 experts",
    contextLabel: "n/a — no model exists to run",
    whatIsIt: [
      "Behemoth is the Llama that stayed a slide deck. On 5 April 2025, alongside Scout and Maverick, Meta announced a third model: **288 billion active parameters, ~2 trillion total, 16 experts** — positioned as the flagship teacher that would compete with GPT-4.5-class systems.",
      "Crucially, one part of it *did* ship: the official Llama 4 card states Maverick was **co-distilled from Behemoth** — so the strongest Llama's knowledge exists only as a derivative, inside Maverick.",
      "At launch Meta said Behemoth was 'still training' and would be released later after safety and quality checks. **That release never came.** As of 26 October 2026 there are no Behemoth weights anywhere.",
    ],
    whyMade: [
      "The plan: a giant teacher to distil into the smaller students (Maverick being the first), and a statement piece against GPT-4.5/Gemini-Pro-class systems. The announcement also served the broader strategy of Meta's push into 'superintelligence'-scale models under its reorganised AI division.",
      "What actually happened fits the era: reports of launch pushbacks for models 'failing to meet internal expectations', LeCun's later 'results were fudged a little bit' comments about Llama 4, his departure, and Meta's pivot — first to the 'Behemoth'-era superintelligence lab framing, then to the Muse model family in 2026.",
    ],
    sizeInHumanTerms: [
      "Announced at **~2 trillion parameters** — about 5× the 405B flagship; in BF16 that would be roughly 4 TB of weights (computed from the announced figure) — a multi-node installation.",
      "In practice these numbers are historical footnotes: there is nothing to download, run, measure or host.",
    ],
    goodFor: [
      {
        title: "Its knowledge lives on in Maverick",
        desc: "Maverick was co-distilled from Behemoth — GPQA 69.8, LiveCodeBench 43.4 and MMMU 73.4 are the practical way to access what Behemoth taught it.",
      },
      {
        title: "A case study in 'announced ≠ released'",
        desc: "The cleanest modern example of why roadmaps should count only models you can download.",
      },
      {
        title: "The distillation strategy template",
        desc: "The teacher→student approach Meta describes (and the Llama 3.1 licence's distillation clause) is the legal pattern you can run yourself with the 405B.",
      },
    ],
    notGoodFor: [
      {
        title: "Literally everything else",
        desc: "It cannot be run, benchmarked, fine-tuned or served — the weights do not exist publicly.",
      },
      {
        title: "Trusting capability claims",
        desc: "With no model and no independent evaluation of any kind, every capability statement is launch marketing.",
      },
      {
        title: "Roadmap planning",
        desc: "Any plan that assumed a 2T open teacher from Meta is void as of October 2026.",
      },
    ],
    flaws: [
      "**There is no model.** Any 'Behemoth' API, download or leaderboard entry you find is not Meta's.",
      "**Zero independent evaluation** — impossible without weights.",
      "**The never-release became a symbol** of the Llama 4 era's troubles: benchmark manipulation findings, LeCun's 'fudged' comments, his departure, and the GenAI reorganisation that followed.",
      "Its stated role (teacher) means the family's best model was *designed* to stay private — the openness promise ended with it.",
      "Meta's Llama HF organisation stopped at 70 repositories, newest weights **28 April 2025** (Prompt Guard 2) — no Behemoth upload ever.",
    ],
    laterImprovements: [
      {
        label: "Nothing — the line ended here",
        text: "No Behemoth release, and no further Llama models at all: Meta pivoted to the Muse family (Muse Spark 8 Apr 2026, Glimmer Apache-2.0 10 Aug 2026, Spark Open 15 Oct 2026).",
      },
      {
        label: "The practical successors",
        text: "For what Behemoth was meant to be, the downloadable answers are Llama 4 Maverick (distilled from it) and Llama 3.1 405B (the released large-scale teacher whose licence permits distillation).",
      },
    ],
    whoShould:
      "Nobody can use it. Read its story as a cautionary exhibit — and reach for Maverick or the 405B instead.",
    whoShouldnt:
      "Anyone who needs a working model today; anyone assuming it will eventually ship (nothing through 25 Oct 2026).",
    facts: [
      { label: "Announced", value: "5 Apr 2025" },
      { label: "Released", value: "Never — no weights exist" },
      { label: "Announced size", value: "288B active / ~2T total · 16 experts" },
      { label: "Role", value: "Teacher — Maverick was co-distilled from it" },
      { label: "Verified via", value: "HF API (70 repos) · llama.com · GitHub · news record" },
      { label: "What to use instead", value: "Llama 4 Maverick · Llama 3.1 405B" },
    ],
    sourceNote:
      "From the official Llama 4 model card (Maverick co-distilled from Behemoth; announced specs), the Hugging Face API (70-repo inventory, newest 28 Apr 2025), llama.com navigation and the meta-llama/llama-models GitHub repo (both checked 26 Oct 2026), plus the news record through 25 Oct 2026 — four independent checks documented in models/llama-models-complete-guide.md §10.",
  },
];
