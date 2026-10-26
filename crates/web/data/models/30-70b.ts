import type { ModelGuide } from "./types";

export const midTierGuides: ModelGuide[] = [
  {
    slug: "llama-1-33b-65b",
    name: "LLaMA 1 — 33B & 65B",
    tier: "30-70b",
    tagline:
      "The original big Llamas (February 2023) — the models that powered the first wave of open-model fine-tuning, before 'chat' existed.",
    released: "24 February 2023",
    sizeLabel: "32.5B / 65.2B parameters (Meta called them 33B/65B)",
    contextLabel: "Short — about 2–3 pages of text",
    whatIsIt: [
      "The two large sizes of Meta's very first Llama release. (Meta's paper and blog rounded them to '33B' and '65B'; the actual counts are 32.5 and 65.2 billion parameters.)",
      "Like the smaller 6.7B/13B versions documented in the under-30B tier, these are **base models only** — text completion, no chat, no instruction following, no safety tuning. They were trained on **1.4 trillion tokens** of English text.",
      "For context on what they beat: the 65B was competitive with Google's PaLM-class models in 2023 at a fraction of the compute, and the 33B became the community's favourite fine-tuning size for over a year.",
    ],
    whyMade: [
      "Same research thesis as the rest of LLaMA 1 — data over parameters — but at serious scale. The 33B/65B sizes were Meta's proof that a mid-sized model trained obsessively well could trade blows with models several times its size.",
      "Historically, these two checkpoints seeded the entire open fine-tuning ecosystem: when the weights leaked in March 2023, an explosion of community fine-tunes (Vicuna-era alpacas, domain specialists, roleplay models) was built on exactly these sizes.",
    ],
    sizeInHumanTerms: [
      "32.5B ≈ **65 GB** full quality (computed), 65.2B ≈ **130 GB** — so one big 80 GB GPU or two of them respectively (at 4-bit: roughly 20 GB and 38 GB).",
      "In 2023 that meant renting cloud A100s; in 2026 it's a normal single-box setup.",
    ],
    goodFor: [
      {
        title: "Reproducing the original LLaMA paper",
        desc: "The exact checkpoints the 2023 research was about — nothing else substitutes.",
      },
      {
        title: "Scaling-law and data-mixture research",
        desc: "Raw pretraining with no alignment layer, ideal for studying what fine-tuning actually changes.",
      },
      {
        title: "Historical fine-tune archaeology",
        desc: "Many 2023-era community models descend from these — you may need them to reproduce someone's work.",
      },
      {
        title: "Learning the toolchain",
        desc: "Fully supported by llama.cpp and every quantization tool, since those tools were literally built for these shapes.",
      },
    ],
    notGoodFor: [
      {
        title: "Talking to it",
        desc: "No instruction tuning whatsoever — you must fine-tune it or wrap it in an external prompt template.",
      },
      {
        title: "Any long work",
        desc: "2,048 tokens of context — the worst in the whole family, shorter than a magazine article.",
      },
      {
        title: "Products",
        desc: "Non-commercial research licence, and Meta never officially published these weights — today's downloads are mirrors of the 2023 leak.",
      },
      {
        title: "Competing on capability",
        desc: "MMLU 63.4 (65B) is *below* Llama 3.1 8B's 73.0 — a 2024 model 8× smaller beats it.",
      },
    ],
    flaws: [
      "**No chat ability at all** — completion only.",
      "**2,048-token context**, the family's smallest.",
      "**English only**, no safety tuning, no system prompt, no tool use.",
      "**Non-commercial licence + leaked weights** — a compliance problem for any real product.",
      "**Capability frozen in early 2023**: maths 30.8 (65B) versus 51.9 for a 2024 8B.",
      "Benchmarks are Meta's internal 2023 harness, never independently standardised.",
    ],
    laterImprovements: [
      {
        label: "Llama 2 70B (July 2023)",
        text: "The first big Llama you could legally ship — commercial licence, chat training, 4k context (its own page in this tier).",
      },
      {
        label: "Llama 3 70B (April 2024)",
        text: "MMLU jumped 63.4 → 79.5 (base) with 15T tokens of training and a modern vocabulary.",
      },
      {
        label: "Llama 3.1 405B (July 2024)",
        text: "Meta scaled the same recipe to 405 billion parameters — 6× the biggest LLaMA 1, with 128k context (its own page in the 70B+ tier).",
      },
    ],
    whoShould:
      "Researchers reproducing 2023-era results and historians of the open-model movement — and nobody else.",
    whoShouldnt:
      "Practically everything else; usable 30B-class models start at Code Llama 34B, and quality starts at Llama 3.",
    facts: [
      { label: "Released", value: "24 Feb 2023" },
      { label: "Sizes", value: "32.5B / 65.2B" },
      { label: "Context", value: "2,048 tokens (~2–3 pages)" },
      { label: "Languages", value: "English only" },
      { label: "Training", value: "1.4T tokens" },
      { label: "Runs on", value: "≈65 GB / ≈130 GB (BF16, computed)" },
      { label: "Licence", value: "Research only, non-commercial" },
    ],
    sourceNote:
      "From the LLaMA paper (arXiv:2302.13971, Table 2 configs and token counts), the benchmark table re-published in the official Llama 2 model card, and the documented release/licence history.",
  },
  {
    slug: "llama-2-70b",
    name: "Llama 2 70B",
    tier: "30-70b",
    tagline:
      "July 2023: the first 70B-class model with a commercial licence — the release that created the open-model industry.",
    released: "18 July 2023",
    sizeLabel: "68.98B parameters",
    contextLabel: "Modest — 4,096 tokens (~5–6 pages)",
    whatIsIt: [
      "Llama 2 70B was a big deal in 2023: the first **70-billion-class** openly released model you could legally build a business on. It came as a base model and **Llama-2-Chat**, Meta's RLHF-tuned dialogue version.",
      "It also introduced a genuine architectural improvement: **Grouped-Query Attention (GQA)** — the model shares its memory-tracking apparatus across attention heads instead of keeping a copy per head. Meta enabled it *only* on the 70B (the 7B/13B didn't get it), because at this size the memory savings were what made serving practical. Every Llama since has GQA everywhere.",
      "Meta trained it on **2 trillion tokens** at a cost of 21,000 petaFLOP-days, and for 2023 the results were strong: MMLU 68.9, maths 35.2, and their claim that the chat variant was 'on par with some popular closed-source models like ChatGPT and PaLM' in human evaluations.",
    ],
    whyMade: [
      "To answer one question: could an *open* model be big and good enough for real products? In mid-2023 the answer from Meta was yes — and Microsoft was announced as the distribution partner, with Hugging Face hosting the weights.",
      "It worked commercially: 2023–2024's wave of open commercial assistants and API resellers ran substantially on Llama 2 70B.",
    ],
    sizeInHumanTerms: [
      "≈ **138 GB** full quality (computed) — needs two 80 GB GPUs (or four 40 GB). At 4-bit it shrinks to about 38–40 GB, which fits one large consumer card or runs on a serious CPU setup.",
      "GQA is why the full-precision figure is even servable — without it, memory traffic per token would be several times higher.",
    ],
    goodFor: [
      {
        title: "Keeping an old commercial pipeline alive",
        desc: "If your product was built on Llama 2's exact licence and behaviour, this is the model to stay on.",
      },
      {
        title: "2023-era reproduction",
        desc: "Papers, benchmarks and fine-tunes from that year assume these exact checkpoints.",
      },
      {
        title: "Understanding where GQA came from",
        desc: "The architectural decision that shapes every modern LLM started here.",
      },
      {
        title: "A well-understood fine-tuning target",
        desc: "Countless open 70B chat models descend from Llama-2-Chat 70B.",
      },
    ],
    notGoodFor: [
      {
        title: "Long documents",
        desc: "4,096 tokens — a fatal ceiling for modern retrieval-augmented work.",
      },
      {
        title: "Non-English products",
        desc: "Officially English-only scope (the card lists other languages as out of scope).",
      },
      {
        title: "Competing on capability",
        desc: "MMLU 68.9 loses to Llama 3.1 8B's 73.0 — a newer model more than 9× smaller wins.",
      },
      {
        title: "Vision or tool use",
        desc: "Neither exists in this generation.",
      },
    ],
    flaws: [
      "**4k context and English-only** — both disqualifying for modern deployments.",
      "**Capability age**: maths 35.2 versus 51.9 for a 2024 8B; its only remaining edge is 'it exists under Llama 2 terms'.",
      "**No tool use, no vision, no official compressed versions**, 2023-era safety work (no Llama Guard pairing in the original release).",
      "Knowledge frozen in **early 2023**; the chat variant shows classic early-RLHF behaviour (verbose templated answers, over-refusal).",
      "Tiny ongoing usage — single-digit monthly downloads on some original repos; the world has moved on.",
      "Licence is source-available, not OSI open source (AUP + the 700M-users clause).",
    ],
    laterImprovements: [
      {
        label: "Llama 3 70B (April 2024)",
        text: "MMLU 79.5 / 82.0 (base/instruct) — a generational leap on 15T tokens — though still stuck at 8k context and English-only.",
      },
      {
        label: "Llama 3.1 70B (July 2024)",
        text: "Added 128,000-token context, eight languages and tool calling — the full modern package at the same size.",
      },
      {
        label: "Llama 3.3 70B (December 2024)",
        text: "Post-training got so good the 70B beat Meta's own 405B on three headline measures (its own page in this tier).",
      },
      {
        label: "Llama 4 (April 2025)",
        text: "Mixture-of-experts at 17B-active means Maverick delivers 400B-class quality with 70B-class per-token speed — a different efficiency curve entirely.",
      },
    ],
    whoShould:
      "Teams pinned to Llama 2 licence terms, 2023-era reproductions, and anyone maintaining a derivative built on this checkpoint.",
    whoShouldnt:
      "New builds — Llama 3.1 70B (fine-tuneable base) or Llama 3.3 70B Instruct (best general) are the same size and generationally superior.",
    facts: [
      { label: "Released", value: "18 Jul 2023" },
      { label: "Size", value: "68.98B" },
      { label: "Context", value: "4,096 tokens (~5–6 pages)" },
      { label: "Languages", value: "English only" },
      { label: "Architecture", value: "GQA (first Llama to have it)" },
      { label: "Runs on", value: "≈138 GB BF16 · ≈40 GB 4-bit" },
      { label: "Licence", value: "Llama 2 Community — commercial OK" },
    ],
    sourceNote:
      "From the official Llama 2 model card (benchmarks, GQA and training cost, chat claim, out-of-scope languages) and the Llama 2 paper (arXiv:2307.09288); memory computed as parameters × 2 bytes.",
  },
  {
    slug: "codellama-34b-70b",
    name: "Code Llama — 34B & 70B",
    tier: "30-70b",
    tagline:
      "The big coding specialists (Aug 2023 / Jan 2024) — the models behind the 2023–24 wave of local code assistants.",
    released: "34B: 24 August 2023 · 70B: 29 January 2024",
    sizeLabel: "33.74B / 68.98B parameters",
    contextLabel: "16k trained (claimed useful to ~100k) — with exceptions",
    whatIsIt: [
      "The heavyweight members of Meta's Code Llama family (the 7B/13B live in the under-30B tier). Same recipe as the small ones — Llama 2 continued on 500 billion tokens of code plus long-context training — at sizes built for more demanding coding work.",
      "The **34B** (August 2023) carried the release headline: **'up to 67% HumanEval and 65% MBPP, state of the art among open models'** at the time. The **70B** followed five months later as Meta's answer to community 70B code models.",
      "Each size comes in the same three flavours: **base** (completion), **Python** (extra 100B Python tokens), **Instruct** (dialogue about code).",
      "Two catches straight from Meta's README: infilling is documented for **7B and 13B only** — support on 34B/70B is unverified; and *'All models, except the 70B Python and Instruct versions, support sequence lengths up to 100,000 tokens'* — meaning **the two most useful 70B flavours are the short-context ones**.",
    ],
    whyMade: [
      "2023's code-LLM race (Copilot, StarCoder, WizardCoder) needed an open, commercially licensed, self-hostable answer. Meta's twist was specialisation: rather than one general model, three prompting personalities per size, plus the Python-only variant that produced the famous '7B beats 70B' result.",
    ],
    sizeInHumanTerms: [
      "Official sizes from Meta's README: 34B = **63 GB** (4 GPUs in model-parallel mode), 70B = **131 GB** (8 GPUs). Compressed to 4-bit: roughly 20 GB and 38 GB.",
      "Practical translation: the 34B fits one 80 GB card or two 40 GB cards — the classic 'local powerhouse' of 2024; the 70B wants a full two-card box.",
    ],
    goodFor: [
      {
        title: "A self-hosted legacy code assistant",
        desc: "34B Instruct was the engine of countless 2023–24 local coding setups and remains reproducible today.",
      },
      {
        title: "Python-specific work (34B Python)",
        desc: "The extra 100B Python tokens make it noticeably stronger on Python-shaped tasks than the base.",
      },
      {
        title: "Reproducing the Code Llama paper",
        desc: "For research comparisons against that era's numbers.",
      },
      {
        title: "Continued code pretraining",
        desc: "A code-heavy starting point if you're building your own domain-specialised code model (licence permits commercial use).",
      },
    ],
    notGoodFor: [
      {
        title: "Modern libraries and frameworks",
        desc: "Knowledge base is Llama 2's early-2023 — it doesn't know post-2023 syntax, packages or APIs.",
      },
      {
        title: "Agent-style coding",
        desc: "No tool calling, no structured function calling, no multi-step agentic support.",
      },
      {
        title: "Long 70B Python/Instruct contexts",
        desc: "Per the README, those two don't get the 100k window — the flagship feature is unavailable in the flavours you'd most want.",
      },
      {
        title: "Being the best coder",
        desc: "Llama 3.1 8B Instruct (HumanEval 72.6) already beat this family's 67% headline, and Llama 4 Maverick reaches LiveCodeBench 43.4.",
      },
    ],
    flaws: [
      "**2023-era code quality** — the SOTA claim expired fast.",
      "**No documented infilling at 34B/70B** — the defining Code Llama feature is officially a small-size-only story.",
      "**The 70B Python/Instruct short-context exception** guts the two most useful big flavours.",
      "**Heavy for what you get**: 63 GB / 131 GB official sizes just to load, on a dense 2023 architecture.",
      "Legacy `<<SYS>>`/`[INST]` prompt formats — awkward to integrate alongside modern Llama tooling.",
      "2026 downloads are single/double digits for the big sizes — ecosystem momentum has fully moved on.",
    ],
    laterImprovements: [
      {
        label: "Llama 3.1 8B Instruct (July 2024)",
        text: "A general 8B outscored Code Llama's headline (HumanEval 72.6 vs 67%) while also being a normal assistant — specialist code models at 34B+ stopped being necessary for most uses.",
      },
      {
        label: "Llama 3.1 70B Instruct (July 2024)",
        text: "HumanEval 80.5, MBPP 86.0, 128k context and tool calling — strictly better than Code Llama 70B at the same size.",
      },
      {
        label: "Llama 4 Maverick (April 2025)",
        text: "LiveCodeBench 43.4 with screenshots as input — you can show it your UI and ask what's broken.",
      },
    ],
    whoShould:
      "Developers maintaining a Code Llama-based assistant, researchers reproducing the paper, and anyone wanting a commercial-licence code base model from that generation.",
    whoShouldnt:
      "New coding products — Llama 3.1 70B/8B Instruct or current dedicated code models are better in every dimension.",
    facts: [
      { label: "Released", value: "34B Aug 2023 · 70B Jan 2024" },
      { label: "Sizes", value: "33.74B / 68.98B" },
      { label: "Context", value: "16,384 (claimed ~100k; 70B Py/Instruct excluded)" },
      { label: "Official size", value: "63 GB (34B) / 131 GB (70B)" },
      { label: "Headline score", value: "Up to 67% HumanEval (34B)" },
      { label: "Infilling", value: "Documented for 7B/13B only" },
      { label: "Licence", value: "Llama 2 Community — commercial OK" },
    ],
    sourceNote:
      "From Meta's Code Llama README (sizes, model-parallel counts, 100k exception, infilling scope) and the Code Llama paper (arXiv:2308.12950) for the headline results.",
  },
  {
    slug: "llama-3-70b",
    name: "Llama 3 70B",
    tier: "30-70b",
    tagline:
      "April 2024's open-weight champion — the model that powered Meta AI's assistant rollout and beat Gemini Pro and Claude 3 Sonnet at launch.",
    released: "18 April 2024",
    sizeLabel: "70.55B parameters",
    contextLabel: "Short — 8,192 tokens (~12 pages)",
    whatIsIt: [
      "The big member of the Llama 3 launch, and for months the best openly available model in the world. Base and Instruct versions, trained on **15+ trillion tokens** with a 128k-word vocabulary, grouped-query attention, and **6.4 million H100 GPU-hours** of training behind it.",
      "At release Meta showed it beating **Gemini Pro 1.5** and **Claude 3 Sonnet** on most reported benchmarks — and it wasn't hype: HumanEval 81.7 (coding) and MMLU 82.0 (knowledge) were genuinely leading numbers for open weights in mid-2024.",
      "It also sat underneath Meta's biggest consumer play: the Meta AI assistant across Facebook, WhatsApp and Instagram ran on Llama 3 70B — a scale of real-world deployment almost no open model had seen.",
      "This was also the generation with a split cutoff: the official card notes **December 2023** knowledge for the 70B (the 8B got March 2023).",
    ],
    whyMade: [
      "Llama 2 70B's 4k context and English-only scope had already aged; GPT-4-class systems were pulling away. Meta's answer for the 70B tier: a generation-defining jump in data quality and scale, optimized for chat and assistant use — the card says the Instruct models are 'optimized for dialogue use cases'.",
    ],
    sizeInHumanTerms: [
      "≈ **141 GB** full quality (computed) — two 80 GB GPUs, or about 40 GB at 4-bit for a single big consumer card.",
      "Trained on 6.4M H100-hours: thousands of graphics cards working for months, one of the most expensive open-model training runs of its time.",
    ],
    goodFor: [
      {
        title: "Reproducing the Meta AI era",
        desc: "The exact checkpoint behind mid-2024's most-deployed open assistant.",
      },
      {
        title: "Base + Instruct pairs",
        desc: "One of the few strong 70Bs you could both deploy *and* fine-tune from scratch (Llama 3.3 later dropped the base).",
      },
      {
        title: "Battle-tested serving",
        desc: "Every serving stack's tensor/pipeline-parallel patterns were proven against this exact model at production scale.",
      },
      {
        title: "Strong code at 70B (2024)",
        desc: "HumanEval 81.7 made it a credible code assistant backbone.",
      },
    ],
    notGoodFor: [
      {
        title: "Long documents",
        desc: "8,192 tokens — the decisive flaw; Llama 3.1's 128k arrived three months later and made this obsolete for long work.",
      },
      {
        title: "Non-English use",
        desc: "Officially English-only scope.",
      },
      {
        title: "Cutting-edge reasoning",
        desc: "GPQA 39.5 is well behind where the field moved even within 2024.",
      },
      {
        title: "Anything current",
        desc: "Knowledge cutoff December 2023; no vision; no official compressed versions.",
      },
    ],
    flaws: [
      "**8k context was obsolete within three months** — the family's biggest misstep.",
      "**English-only** by official scope.",
      "**Reasoning was mid even for 2024** — GPQA 39.5, maths trailing 3.1/3.3.",
      "**Knowledge cutoff December 2023**; no vision, no tool-calling benchmarks of the 3.1 era.",
      "**Directly beaten by its successor at identical size**: Llama 3.1 70B (128k + languages + BFCL 77.5), then Llama 3.3 70B.",
      "Refusal/format behaviours feel dated versus Llama 4's tone work.",
    ],
    laterImprovements: [
      {
        label: "Llama 3.1 70B (July 2024)",
        text: "Same size, 16× the context (128k), eight languages, tool calling — the direct replacement (its own page in this tier).",
      },
      {
        label: "Llama 3.3 70B (December 2024)",
        text: "Better post-training at the same size: IFEval 92.1, GPQA 50.5, MATH 77.0 — beating even the 405B on those three.",
      },
      {
        label: "Llama 3.2 Vision 90B (September 2024)",
        text: "Gave the Llama 3 generation eyes (an adapter over this model's text brain, in the 70B+ tier).",
      },
    ],
    whoShould:
      "Reproducing 2024-era results, needing a base+Instruct pair you'll fine-tune yourself, or staying pinned to Llama 3 licence terms.",
    whoShouldnt:
      "New projects — Llama 3.1 70B (base, 128k) or Llama 3.3 70B Instruct replace it at the same size.",
    facts: [
      { label: "Released", value: "18 Apr 2024" },
      { label: "Size", value: "70.55B" },
      { label: "Context", value: "8,192 tokens (~12 pages)" },
      { label: "Languages", value: "English only" },
      { label: "Knowledge cutoff", value: "December 2023" },
      { label: "Training", value: "15T+ tokens · 6.4M H100 GPU-hours" },
      { label: "Runs on", value: "≈141 GB BF16 · ≈40 GB 4-bit" },
    ],
    sourceNote:
      "From the official Llama 3 model card (both benchmark tables, GPU-hours, English-only scope, December 2023 data freshness for 70B) and launch-era reporting on Meta AI.",
  },
  {
    slug: "llama-3-1-70b",
    name: "Llama 3.1 70B",
    tier: "30-70b",
    tagline:
      "The complete generalist of July 2024: 128k context, eight languages and tool calling — and the family's go-to fine-tuning base at the top end.",
    released: "23 July 2024",
    sizeLabel: "70.55B parameters",
    contextLabel: "Huge — 128,000 tokens (~300 pages)",
    whatIsIt: [
      "Llama 3.1 70B is what you get when the Llama 3 recipe gets the full modern package: **128,000-token context**, **eight supported languages**, **tool calling** (BFCL v2: 77.5), plus base **and** Instruct versions — everything a deployment or a fine-tuning program needs at one size.",
      "Architecture: 80 layers, 8,192-wide, grouped-query attention, RoPE stretched for 128k, 15T+ tokens of training, December 2023 knowledge cutoff.",
      "Two things make it special within the family: it's the **best base model** at the top end (Llama 3.3 shipped Instruct-only, so if you want to *train* a 70B you start here), and its licence **explicitly allows distillation** — you can legally use its outputs to train other models.",
    ],
    whyMade: [
      "Llama 3 70B proved the size class; Llama 3.1 was about closing the gaps in one release: context (128k), languages (8), tool use (BFCL), and a licence that made synthetic-data pipelines legitimate. Meta called it 'the first frontier-level open-source AI model'.",
    ],
    sizeInHumanTerms: [
      "≈ **141 GB** full quality (computed) — two 80 GB GPUs; ≈ 70 GB at 8-bit; ≈ 40 GB at 4-bit.",
      "128k tokens ≈ 300 pages — you can paste a full contract, manual or codebase and ask questions about any part of it.",
      "It's the size class most mid-size companies settle on: one or two GPUs, serious capability, no cloud dependency.",
    ],
    goodFor: [
      {
        title: "The one-model-for-everything slot",
        desc: "Long-context RAG, multilingual-lite work, tool calling, strong code (HumanEval 80.5) — the default 'big general Llama'.",
      },
      {
        title: "Fine-tuning at the top end",
        desc: "Base + Instruct both exist (3.3 has no base) — the practical starting point for training your own 70B.",
      },
      {
        title: "Distillation teacher",
        desc: "Licence explicitly permits using its outputs to train smaller models.",
      },
      {
        title: "Reliable deployment target",
        desc: "Every serving stack supports it natively; ~40 GB at 4-bit fits single-box setups.",
      },
    ],
    notGoodFor: [
      {
        title: "Best-in-class steerability/reasoning (if you don't need a base)",
        desc: "Llama 3.3 70B beats it on IFEval (92.1 vs 87.5), GPQA (50.5 vs 48.0) and MATH (77.0 vs 68.0) for the same weight.",
      },
      {
        title: "Cutting-edge science reasoning",
        desc: "GPQA 48.0 was competitive in mid-2024, not in 2026.",
      },
      {
        title: "Current knowledge / vision",
        desc: "December 2023 cutoff, text only — no images or audio.",
      },
      {
        title: "Ultra-cheap serving",
        desc: "Dense 70B economics: full memory footprint and one forward pass per token, versus Llama 4's 17B-active MoE.",
      },
    ],
    flaws: [
      "**Beaten by its own younger sibling** at identical size on steerability, reasoning and maths — if you don't need a base model, 3.3 is the better pick.",
      "**GPQA 48.0 is no longer competitive** against 2026's frontier.",
      "**Knowledge cutoff December 2023**; text-only; no official compressed checkpoint.",
      "**English-centric multilingual** — Meta's card warns against unsupported languages without fine-tuning.",
      "**141 GB BF16** = a two-GPU proposition; throughput is dense-70B-era, slower per token than MoE rivals of similar quality.",
    ],
    laterImprovements: [
      {
        label: "Llama 3.3 70B (December 2024)",
        text: "Same size, better post-training: beats this model on IFEval/GPQA/MATH and even beats the 405B on those three (its own page in this tier).",
      },
      {
        label: "Llama 3.1 405B (same day)",
        text: "The bigger sibling pushed breadth further (MMLU-Pro 73.3, BFCL 81.1) — in the 70B+ tier.",
      },
      {
        label: "Llama 4 Maverick (April 2025)",
        text: "GPQA 69.8 and native multimodality with only 17B parameters active per token — better numbers at lower per-token compute (with benchmark-controversy caveats).",
      },
    ],
    whoShould:
      "Anyone needing a 70B *base* to train on, a distillation teacher, or a licence-continuous general workhorse with 128k context.",
    whoShouldnt:
      "Pure chat serving where Llama 3.3 70B Instruct gives better results at identical cost — or multimodal needs, which mean Llama 4.",
    facts: [
      { label: "Released", value: "23 Jul 2024" },
      { label: "Size", value: "70.55B" },
      { label: "Context", value: "128,000 tokens (~300 pages)" },
      { label: "Languages", value: "8 supported" },
      { label: "Knowledge cutoff", value: "December 2023" },
      { label: "Tool calling", value: "BFCL v2: 77.5" },
      { label: "Runs on", value: "≈141 GB BF16 · ≈40 GB 4-bit" },
    ],
    sourceNote:
      "From the official Llama 3.1 model card (benchmark table, architecture, supported languages, distillation clause) and the Hugging Face API for exact parameter counts.",
  },
  {
    slug: "llama-3-3-70b",
    name: "Llama 3.3 70B Instruct",
    tier: "30-70b",
    tagline:
      "December 2024's headline act: a 70B chat model that beat Meta's own 405B flagship on steerability, science and maths.",
    released: "6 December 2024",
    sizeLabel: "70.55B parameters",
    contextLabel: "Huge — 128,000 tokens (~300 pages)",
    whatIsIt: [
      "Llama 3.3 is a single model: **70B, Instruct-only** (no base version), multilingual text in/out. Its entire story is 'flagship quality at a fifth of the cost'.",
      "Meta fine-tuned it on public instruction data **plus over 25 million synthetically generated examples**, spending **7.0 million H100 GPU-hours** (12.9 tonnes CO₂e) — an enormous post-training budget for one 70B checkpoint.",
      "The result, from the official card: it **beats Llama 3.1 405B Instruct on IFEval (92.1 vs 88.6), GPQA Diamond (50.5 vs 49.0) and MATH (77.0 vs 73.8)** — three of the headline axes — while costing 1/5th the memory. (On breadth measures like MMLU-Pro the 405B still leads: 73.3 vs 68.9.)",
      "The independent test: in **Rootly AI Labs' April 2025 coding benchmark** (100 real bug-fix issues), Llama 3.3 70B scored **72% — beating Llama 4 Maverick's 70%**. The previous generation beating the new flagship is the strongest outside evidence of this model's standing.",
    ],
    whyMade: [
      "By late 2024, distillation and better post-training had made 'smaller but smarter' obvious. Rather than only shipping a bigger model, Meta shipped a *better-tuned* 70B — and the card explicitly positions its outputs for synthetic-data generation and distillation, licensed accordingly.",
      "It also gave the community a current model without the 405B's brutal hardware bill.",
    ],
    sizeInHumanTerms: [
      "≈ **141 GB** full quality (computed), ≈ 40 GB at 4-bit — the same footprint as Llama 3.1 70B, with better results.",
      "Versus the 405B's 812 GB: you get the flagship's steerability, science and maths answers on **one-fifth the memory**.",
      "300k+ downloads a month (Oct 2026) — it's what people actually serve from the Llama line.",
    ],
    goodFor: [
      {
        title: "The main Llama to serve in 2026",
        desc: "Best quality-per-gigabyte in the family: strong enough to be a product's core model, small enough for one 2-node GPU box (or ~40 GB quantized).",
      },
      {
        title: "Reliable instruction following",
        desc: "IFEval 92.1 — top of the whole family — means it follows system prompts and output formats faithfully, which matters enormously for pipelines.",
      },
      {
        title: "Agents and tool use",
        desc: "BFCL 77.3 plus 128k context: solid function calling over long conversations.",
      },
      {
        title: "Science & maths questions",
        desc: "GPQA 50.5 and MATH 77.0 beat the 405B — rare for a model a fifth its size.",
      },
      {
        title: "A trustworthy benchmark anchor",
        desc: "Its 72% over Maverick's 70% in an independent coding eval makes it the Llama to calibrate against.",
      },
    ],
    notGoodFor: [
      {
        title: "Fine-tuning from scratch",
        desc: "There is no Llama 3.3 base model — for training, fall back to Llama 3.1 70B.",
      },
      {
        title: "Vision or audio",
        desc: "Text only.",
      },
      {
        title: "Facts after December 2023",
        desc: "Three-year-old knowledge cutoff — pair it with retrieval for anything current.",
      },
      {
        title: "Cheapest possible per-token cost",
        desc: "Dense 70B: full 141 GB footprint versus Llama 4 Maverick's 17B-active MoE achieving higher scores at similar per-token compute.",
      },
    ],
    flaws: [
      "**Instruct-only** — you cannot fine-tune Llama 3.3 from base weights.",
      "**Text-only** — no native multimodality.",
      "**Knowledge cutoff December 2023** — stale in 2026; needs RAG.",
      "**Dense-70B economics** — one full forward pass per token, versus MoE rivals' efficiency.",
      "**Not frontier-class in absolute terms by 2026** (GPQA 50.5 vs today's open models); no official quantized checkpoint (community GGUF/AWQ only).",
      "Same source-available licence caveats (AUP + 700M-users clause).",
    ],
    laterImprovements: [
      {
        label: "Llama 4 Scout & Maverick (April 2025)",
        text: "Mixture-of-experts with 17B active parameters, native image understanding, 1M/10M-token contexts — plus benchmark-gaming controversies that complicated their reception (see their pages).",
      },
      {
        label: "Llama 4 Behemoth (announced, never released)",
        text: "The 288B-active/2T-total teacher Meta promised alongside Llama 4 never shipped — this 70B remained the practical top of the line.",
      },
      {
        label: "Meta's Muse family (2026)",
        text: "After Llama stopped, Meta's model releases continued as Muse (Spark, Glimmer, Spark Open) — nothing further ever arrived under the Llama name.",
      },
    ],
    whoShould:
      "The default choice for serving a Llama model for chat, RAG, agents and tool use — especially when cost-conscious teams want near-405B behaviour at 70B cost.",
    whoShouldnt:
      "Base-model fine-tuning (use 3.1 70B), vision (use Llama 4), or cutting-edge reasoning and knowledge (consider newer non-Llama or Muse models).",
    facts: [
      { label: "Released", value: "6 Dec 2024" },
      { label: "Size", value: "70.55B (Instruct only — no base)" },
      { label: "Context", value: "128,000 tokens (~300 pages)" },
      { label: "Languages", value: "8 supported" },
      { label: "Knowledge cutoff", value: "December 2023" },
      { label: "Training", value: "7.0M H100 GPU-hours · 25M+ synthetic examples" },
      { label: "Killer stat", value: "Beats 405B on IFEval, GPQA & MATH" },
    ],
    sourceNote:
      "From the official Llama 3.3 model card (release date, 25M synthetic examples, 7.0M GPU-hours, full benchmark table) and Rootly AI Labs' independent coding benchmark (Apr 2025 / updated Jun 2026): 3.3 70B = 72% vs Maverick = 70%.",
  },
];
