import type { ModelGuide } from "./types";

export const under30bGuides: ModelGuide[] = [
  {
    slug: "llama-1-6-7b-13b",
    name: "LLaMA 1 — 6.7B & 13B",
    tier: "under-30b",
    tagline:
      "The very first Llama (February 2023): small, research-only models that proved smart training beats sheer size.",
    released: "24 February 2023",
    sizeLabel: "6.7B & 13B parameters",
    contextLabel: "Short — about 2–3 pages of text",
    whatIsIt: [
      "This is where the whole Llama family began. LLaMA 1 was a set of four text models (6.7B, 13B, 33B and 65B) released by Meta in February 2023 purely as a **research project**. The two smaller sizes — 6.7B and 13B — are the ones documented here; their bigger siblings sit in the 30–70B tier.",
      "Think of a 'parameter' as one tiny dial inside the model that gets tuned during training. A 6.7 billion parameter model has 6.7 billion of these dials. In 2023 that was considered small — for comparison, OpenAI's famous GPT-3 had 175 billion.",
      "There was **no chat version**. You gave it text and it continued your text — it did not answer questions the way today's assistants do. That ability only arrived with the next generation.",
    ],
    whyMade: [
      "Meta's team wanted to test a simple but then-controversial idea: **a smaller model trained on far more text could beat a much bigger model trained on less.** The 6.7B model was trained on 1 trillion words of text — an enormous amount for its size.",
      "It worked. The paper (arXiv:2302.13971) showed 7B beating GPT-3 (175B) on most benchmarks, which helped shift the entire industry's thinking: data quality and quantity matter more than raw size.",
    ],
    sizeInHumanTerms: [
      "6.7B needs about **13.5 GB** of memory in full quality (computed as parameters × 2 bytes) — it fits on a single 16 GB graphics card, or a strong laptop running slowly. The 13B needs about 26 GB, so a 24–32 GB card.",
      "Both are trivially runnable today with free tools like llama.cpp, but you would only do that for historical interest.",
    ],
    goodFor: [
      {
        title: "Understanding LLM history",
        desc: "This is the 'first exhibit' of the open-model era — reading its paper and running it shows exactly where modern AI assistants came from.",
      },
      {
        title: "Research on unfiltered models",
        desc: "Because it has no chat tuning and no safety training, researchers use it to study what a raw, 'unaligned' model actually does.",
      },
      {
        title: "A lightweight experiment bed",
        desc: "Small enough to fine-tune on modest hardware if you want to practise the mechanics without spending much.",
      },
    ],
    notGoodFor: [
      {
        title: "Actually talking to it",
        desc: "It has no instruction following. Ask it a question and it will more likely ramble or complete your sentence than answer.",
      },
      {
        title: "Any long document",
        desc: "It only remembers about 2–3 pages at a time (2,048 tokens) — the worst context window in the entire family.",
      },
      {
        title: "Products or business use",
        desc: "The licence is non-commercial research-only, and the weights were never officially published — downloads today come from the famous March 2023 leak.",
      },
      {
        title: "Non-English work",
        desc: "Trained on English data only.",
      },
    ],
    flaws: [
      "**No chat or instruction tuning** — it completes text, it doesn't help you.",
      "**2,048-token context** — unusable for modern long-document tasks.",
      "**Non-commercial, gated licence** and weights that were never officially released, so using them in anything real is a legal grey area.",
      "**Dated capability by a mile**: MMLU (a general-knowledge test) scores of 35.1 (6.7B) and 46.9 (13B) — roughly half of what a 2024 8B model achieves.",
      "Benchmarks are Meta's own internal numbers from 2023, never independently standardised at release.",
      "No safety guardrails of any kind.",
    ],
    laterImprovements: [
      {
        label: "Llama 2 (July 2023)",
        text: "Added a commercial licence, proper chat training (RLHF), double the training text (2 trillion tokens) and twice the context length (4,096). It became the first Llama you could legally ship in a product.",
      },
      {
        label: "Llama 3 (April 2024)",
        text: "A giant leap: 15 trillion tokens of training (15× more than Llama 1), a much better vocabulary, and code ability that went from 'toy' to 'genuinely useful' — the 8B model scores more than double LLaMA 13B's MMLU.",
      },
      {
        label: "Llama 3.1 (July 2024)",
        text: "128,000-token context (64× this model) and eight officially supported languages.",
      },
      {
        label: "Llama 3.2 (September 2024)",
        text: "Meta released official 4-bit versions of the small models so they could run on phones — the opposite of LLaMA 1's research-only distribution.",
      },
    ],
    whoShould:
      "Historians of AI, researchers who specifically need a raw pre-2023 model, and anyone learning how LLMs work who wants to start at the beginning.",
    whoShouldnt:
      "Anyone building something real. Every practical use of this model has been superseded — start at Llama 3.1 8B instead.",
    facts: [
      { label: "Released", value: "24 Feb 2023" },
      { label: "Sizes", value: "6.7B / 13B (this tier)" },
      { label: "Context", value: "2,048 tokens (~2–3 pages)" },
      { label: "Languages", value: "English only" },
      { label: "Knowledge cutoff", value: "Early 2023" },
      { label: "Runs on", value: "16 GB GPU (6.7B) / 24–32 GB (13B)" },
      { label: "Licence", value: "Research only, non-commercial" },
    ],
    sourceNote:
      "From Meta's LLaMA paper (arXiv:2302.13971), the benchmark table re-published in the official Llama 2 model card, and the repo/licence record. Memory figures computed as parameters × 2 bytes.",
  },
  {
    slug: "llama-2-7b-13b",
    name: "Llama 2 — 7B & 13B",
    tier: "under-30b",
    tagline:
      "The first Llama you could legally put in a product (July 2023) — and the first with a proper chat mode.",
    released: "18 July 2023",
    sizeLabel: "6.7B / 13B parameters",
    contextLabel: "Modest — about 5–6 pages of text",
    ollamaTag: "llama2:7b",
    pullSize: "3.8 GB",
    paramsBillions: [7, 13],
    whatIsIt: [
      "Llama 2 was Meta's 'now it's for everyone' release. Where LLaMA 1 was a gated research curiosity, Llama 2 shipped **weights anyone could download and a licence that allowed commercial use** — announced alongside Microsoft as a distribution partner. This release is what made 'we'll build our startup on an open model' a viable plan in 2023.",
      "Each size came in two flavours: a plain **base** model (continues text) and **Llama-2-Chat** — the first Llama trained with RLHF, a technique where human raters teach the model which answers are good. That chat training is why it behaves like an assistant rather than an autocomplete.",
      "The 7B and 13B sizes are the small members; the 70B has its own page in the 30–70B tier.",
    ],
    whyMade: [
      "After LLaMA 1 leaked and the community ran with it, Meta decided to compete openly and deliberately: release with a real licence, a real chat model, and a safety commitment (it arrived with a paper on safety tuning and an Acceptable Use Policy).",
      "Meta's own claim at the time: the chat models 'outperform open-source chat models on most benchmarks' and were 'on par with some popular closed-source models like ChatGPT and PaLM' in human evaluations — a claim that sounds dated now but was true of mid-2023 open models.",
    ],
    sizeInHumanTerms: [
      "7B ≈ **13.5 GB** full quality, 13B ≈ **26 GB** (both computed from parameter counts). With modern 4-bit compression they shrink to roughly 4–5 GB and 8–9 GB — laptop-class.",
      "In 2023 this was the model you ran on a single consumer GPU; today it's considered tiny, which means fast answers even on modest hardware.",
    ],
    goodFor: [
      {
        title: "The classic fine-tuning playground",
        desc: "For a year, Llama 2 7B/13B was THE starting point for teaching people to fine-tune — countless domain models were built on it.",
      },
      {
        title: "A legally clean small base model",
        desc: "Commercial licence from day one — no research-only clause to worry about.",
      },
      {
        title: "Lightweight scripted assistants",
        desc: "With RLHF chat training and system-prompt persistence (it remembers your standing instructions across turns), it can run simple customer-service-style dialogue.",
      },
      {
        title: "Education",
        desc: "Still downloaded (hundreds of thousands of times monthly in 2026) to demonstrate how RLHF chat models work.",
      },
    ],
    notGoodFor: [
      {
        title: "Non-English products",
        desc: "The model card explicitly lists 'use in languages other than English' as out of scope.",
      },
      {
        title: "Anything with real documents",
        desc: "4,096 tokens of context (~5–6 pages) makes retrieval-augmented work over real document sets painful.",
      },
      {
        title: "Maths or hard reasoning",
        desc: "Its maths score (14.6 for 7B, 28.7 for 13B on Meta's test) is far below even the smallest 2024 Llama.",
      },
      {
        title: "A new 2026 project on capability grounds",
        desc: "Llama 3.1 8B beats it at every measure while costing the same to run.",
      },
    ],
    flaws: [
      "**English-only** by official scope, despite the licence allowing you to fine-tune other languages yourself.",
      "**4,096-token context** — a hard wall for modern long-context work.",
      "**Weak by today's standards**: MMLU 45.3 (7B) / 54.8 (13B) versus Llama 3.1 8B's 73.0 — a newer, smaller model beats the bigger one comfortably.",
      "**2023-era safety work**: no built-in guardrail pairing guidance in the original release; refusal behaviour is dated and over-eager in places.",
      "Knowledge frozen at **early 2023**; no vision, no tool use, no official compressed versions.",
      "Licence is source-available, not true open source (acceptable-use policy + a clause requiring a separate deal if you pass 700 million monthly users).",
    ],
    laterImprovements: [
      {
        label: "Llama 3 (April 2024)",
        text: "7.5× more training text (15T tokens), a 128k-word vocabulary, and a giant capability jump: HumanEval (coding) went from 7.9 → 62.2 at the small size on the same test.",
      },
      {
        label: "Llama 3.1 (July 2024)",
        text: "Context went 4,096 → 128,000 tokens (31×) and eight languages became officially supported.",
      },
      {
        label: "Llama 3.2 (September 2024)",
        text: "Smaller, distilled 1B/3B models with official 4-bit versions arrived for on-device use — a niche Llama 2 could never serve.",
      },
      {
        label: "Llama 4 (April 2025)",
        text: "Natively multimodal (sees images as well as text) with a 40-trillion-token training corpus — though that release came with its own controversies.",
      },
    ],
    whoShould:
      "People maintaining pipelines built in 2023, educators demonstrating RLHF, and anyone who needs a small model specifically under Llama 2's licence terms.",
    whoShouldnt:
      "New builds — Llama 3.1 8B gives 31× the context, official multilingual support, and far stronger reasoning for the same hardware cost.",
    facts: [
      { label: "Released", value: "18 Jul 2023" },
      { label: "Sizes", value: "6.7B / 13B (this tier)" },
      { label: "Context", value: "4,096 tokens (~5–6 pages)" },
      { label: "Languages", value: "English only" },
      { label: "Knowledge cutoff", value: "Early 2023" },
      { label: "Runs on", value: "16 GB GPU (7B) / 24–32 GB (13B)" },
      { label: "Licence", value: "Llama 2 Community — commercial OK" },
    ],
    sourceNote:
      "From the official Llama 2 model card (benchmarks, out-of-scope language note, chat claim), the Llama 2 paper (arXiv:2307.09288 — RLHF recipe), and the Hugging Face API for exact parameter counts and download figures.",
  },
  {
    slug: "codellama-7b-13b",
    name: "Code Llama — 7B & 13B",
    tier: "under-30b",
    tagline:
      "The first dedicated coding Llamas (August 2023): specialists that could fill in the middle of your files, not just continue them.",
    released: "24 August 2023",
    sizeLabel: "6.7B / 13B parameters",
    contextLabel: "Long for its era — 16k tokens, claimed useful to ~100k",
    ollamaTag: "codellama:7b",
    pullSize: "3.8 GB",
    paramsBillions: [7, 13],
    whatIsIt: [
      "Code Llama took the Llama 2 models and taught them programming: Meta first continued training them on **500 billion tokens of code**, then added 20 billion more tokens of very long code files so they could handle big contexts. The result was three personalities in each size:",
      "The **base** model for raw completion (finish this function), **Python** (an extra 100 billion Python-only tokens — a Python specialist), and **Instruct** (talk to it in plain English about your code).",
      "Its headline feature was **infilling**: instead of only continuing text at the end, it could fill a hole in the middle of a file — exactly what an editor assistant needs when completing code inside an existing program. Meta's README confirms infilling for the 7B and 13B base and Instruct versions.",
    ],
    whyMade: [
      "In mid-2023, code assistants were exploding (GitHub Copilot had launched in 2021) and open models for coding were weak. Meta wanted an openly licensed code model that individuals and companies could run themselves.",
      "The small-size gamble paid off: **Code Llama Python 7B beat Llama 2 70B** on coding tests — a 10× smaller model winning on specialisation. That result became the release's headline.",
    ],
    sizeInHumanTerms: [
      "Meta's official download sizes: 7B ≈ **12.55 GB**, 13B = **24 GB** — they fit one GPU each (the 13B uses two GPUs in Meta's model-parallel setup).",
      "At 4-bit compression, roughly 4–5 GB and 8–9 GB — light enough to run inside an IDE locally.",
    ],
    goodFor: [
      {
        title: "Local code completion",
        desc: "The infilling feature makes it a natural fit for 'complete this function inside my file' workflows, on hardware you own.",
      },
      {
        title: "Python-heavy projects (13B Python)",
        desc: "The Python specialist was trained on an extra 100 billion Python tokens and was the most downloaded Code Llama variant in 2026 for a reason.",
      },
      {
        title: "Chatting about code (Instruct)",
        desc: "The Instruct flavour handles 'explain this error' style dialogue at sizes that run on one small GPU.",
      },
      {
        title: "Long single files",
        desc: "16k trained context (about 24 pages of code), with Meta claiming usefulness up to ~100k tokens — you can feed an entire module.",
      },
    ],
    notGoodFor: [
      {
        title: "Modern library questions",
        desc: "Its knowledge base is Llama 2's (early 2023) — it doesn't know libraries, syntax or APIs released since.",
      },
      {
        title: "Agentic coding",
        desc: "No tool use, no structured function calling, no multi-step agent support — those arrived with Llama 3.1.",
      },
      {
        title: "Being today's best code model",
        desc: "Llama 3.1 8B Instruct — a general model — already scored higher (HumanEval 72.6) than Code Llama's 'up to 67%' headline, and 2026's coding models are far beyond both.",
      },
    ],
    flaws: [
      "**2023-era quality** — its 'state of the art among open models' claim was true for about five minutes.",
      "**16k training window**: the 100k figure is a claim, not a benchmark; quality at the far end of long inputs degrades (normal for the era).",
      "**Legacy prompt formats** — the Instruct models use the old `<<SYS>>`/`[INST]` style, a different conversation format from every later Llama, which is annoying to integrate today.",
      "**Infilling only documented for 7B/13B** — the flagship feature isn't officially confirmed for the bigger sizes, and the Python flavour doesn't get it.",
      "No official compressed versions, no vision, no safety-stack pairing guidance from this era.",
    ],
    laterImprovements: [
      {
        label: "Code Llama 70B (January 2024)",
        text: "Five months later Meta added a 70B version for more demanding coding work — it sits in the 30–70B tier (with the catch that its Python and Instruct versions lose the 100k window).",
      },
      {
        label: "Llama 3.1 8B (July 2024)",
        text: "A general-purpose model that outscored Code Llama's headline on HumanEval while also being a normal assistant — specialist coding Llamas stopped being necessary at small sizes.",
      },
      {
        label: "Llama 3.3 70B (December 2024)",
        text: "Added real tool-calling and instruction following (IFEval 92.1) — the foundation for modern coding-agent workflows.",
      },
      {
        label: "Llama 4 Maverick (April 2025)",
        text: "Reached LiveCodeBench 43.4 with natively multimodal input — it can read screenshots of your UI and reason about them, something Code Llama never could.",
      },
    ],
    whoShould:
      "Developers wanting lightweight local completion/infilling under a commercial licence, and researchers reproducing the 2023 code-LLM era.",
    whoShouldnt:
      "Anyone building a coding product today — use Llama 3.1 8B/70B Instruct or a current dedicated coding model instead.",
    facts: [
      { label: "Released", value: "24 Aug 2023" },
      { label: "Sizes", value: "6.7B / 13B (this tier)" },
      { label: "Context", value: "16,384 tokens (claimed to ~100k)" },
      { label: "Special flavours", value: "Base / Python / Instruct" },
      { label: "Infilling", value: "Yes — 7B & 13B documented" },
      { label: "Runs on", value: "≈12.55 GB (7B) / 24 GB (13B)" },
      { label: "Licence", value: "Llama 2 Community — commercial OK" },
    ],
    sourceNote:
      "From Meta's Code Llama README (sizes, model-parallel counts, infilling scope, 100k note) and the Code Llama paper (arXiv:2308.12950) for the training recipe and headline results.",
  },
  {
    slug: "llama-3-8b",
    name: "Llama 3 — 8B",
    tier: "under-30b",
    tagline:
      "April 2024's 'small but mighty' leap — the 8B that finally made local code assistance feel real.",
    released: "18 April 2024",
    sizeLabel: "8.03B parameters",
    contextLabel: "Short — 8,192 tokens (about a long chapter)",
    ollamaTag: "llama3:8b",
    pullSize: "4.7 GB",
    paramsBillions: [8],
    whatIsIt: [
      "Llama 3 was Meta's third generation, and the jump from Llama 2 was huge. This 8B model was trained on **over 15 trillion tokens** of text (7.5× more than Llama 2) with a much better data pipeline and a 128,000-word vocabulary so it represents language more efficiently.",
      "It comes as a **base** model and an **Instruct** (chat) version, the latter trained with Meta's improved pipeline that included **more than 10 million human-annotated examples**.",
      "The headline: its coding ability exploded. On Meta's test, Llama 3 8B Instruct scored **HumanEval 62.2** where Llama 2 7B chat scored **7.9** — the same test, same table, an eightfold jump. For the first time an 8B model could plausibly finish your code.",
      "The 70B sibling of this generation has its own page in the 30–70B tier.",
    ],
    whyMade: [
      "By early 2024 open models were falling behind closed ones (GPT-4, Claude 3, Gemini). Meta's response was 'The Llama 3 Herd of Models' — one generation trained with obsessively better data quality, designed to compete across every size.",
      "Meta leaned on it heavily: Llama 3 70B powered the Meta AI assistant across Facebook, WhatsApp and Instagram — the 8B was the small sibling in the same recipe.",
    ],
    sizeInHumanTerms: [
      "≈ **16.1 GB** full quality (computed: 8.03B × 2 bytes) — fits a single 16–24 GB consumer GPU, or roughly 5 GB at 4-bit compression for CPU use.",
      "This is the classic 'one good graphics card' size, and it responds fast enough for chat.",
    ],
    goodFor: [
      {
        title: "A cheap local assistant",
        desc: "Real instruction following after RLHF — usable chat without heroic prompt engineering, on one consumer GPU.",
      },
      {
        title: "Code completion and small coding help",
        desc: "HumanEval 62.2 was the moment small models became genuinely useful for code.",
      },
      {
        title: "The fine-tuning base of its era",
        desc: "The 128k-vocabulary Llama 3 architecture is what most tools, quantizations and adapters from 2024 onward target.",
      },
      {
        title: "Learning the ecosystem",
        desc: "GGUF formats, Ollama, llama.cpp, vLLM — every tool's default path runs this model well.",
      },
    ],
    notGoodFor: [
      {
        title: "Long documents",
        desc: "8,192 tokens of context (~12 pages) — real RAG over document sets overflows it immediately.",
      },
      {
        title: "Non-English use",
        desc: "Officially scoped to English only; Llama 3.1 added eight supported languages a quarter later.",
      },
      {
        title: "Hard reasoning",
        desc: "GPQA (PhD-level science questions) at 34.2 is only modestly above guessing.",
      },
      {
        title: "Anything needing 2023+ facts",
        desc: "Knowledge cutoff: March 2023 for the 8B (per the official card).",
      },
    ],
    flaws: [
      "**8k context was quickly obsolete** — Llama 3.1's 128k arrived three months later and made this model a poor choice for long work.",
      "**English-only** by official scope.",
      "**Knowledge cutoff March 2023** — over three years stale as of 2026.",
      "**No vision, no official compressed versions** (Meta only started shipping official 4-bit weights with Llama 3.2), no tool-calling benchmarks of the 3.1 era.",
      "Reasoning was entry-level even for 2024; hard multi-step problems need a bigger model.",
      "Beaten on essentially every axis by its own successor, Llama 3.1 8B, at identical size and cost.",
    ],
    laterImprovements: [
      {
        label: "Llama 3.1 8B (July 2024)",
        text: "Same 8B size, but 128,000-token context (16×), eight supported languages, official tool-use support (BFCL 65.4) and HumanEval 72.6 — the direct replacement.",
      },
      {
        label: "Llama 3.2 1B/3B (September 2024)",
        text: "Distilled the 8B's knowledge into phone-sized models, with official 4-bit releases.",
      },
      {
        label: "Llama 3.3 70B (December 2024)",
        text: "Pushed steerability and reasoning so far at 70B that it beat Meta's own 405B on three headline measures.",
      },
    ],
    whoShould:
      "Anyone reproducing Llama 3-era results, needing the original Llama 3 (not 3.1) recipe for compatibility, or running a proven small model on modest hardware.",
    whoShouldnt:
      "New projects — Llama 3.1 8B costs the same to run and beats it on context, languages, tool use and code.",
    facts: [
      { label: "Released", value: "18 Apr 2024" },
      { label: "Size", value: "8.03B" },
      { label: "Context", value: "8,192 tokens (~12 pages)" },
      { label: "Languages", value: "English only" },
      { label: "Knowledge cutoff", value: "March 2023 (8B)" },
      { label: "Training", value: "15T+ tokens · 1.3M H100 GPU-hours" },
      { label: "Licence", value: "Llama 3 Community — commercial OK" },
    ],
    sourceNote:
      "From the official Llama 3 model card (both benchmark tables, training hours, English-only scope, March 2023 data freshness note) and the Llama 3 paper (arXiv:2407.21783).",
  },
  {
    slug: "llama-3-1-8b",
    name: "Llama 3.1 — 8B",
    tier: "under-30b",
    tagline:
      "The family's default small workhorse: 128k context, eight languages and tool-calling — and still the most downloaded Llama today.",
    released: "23 July 2024",
    sizeLabel: "8.03B parameters",
    contextLabel: "Huge — 128,000 tokens (about a 300-page book)",
    ollamaTag: "llama3.1:8b",
    pullSize: "4.9 GB",
    paramsBillions: [8],
    whatIsIt: [
      "Llama 3.1 is the July 2024 refresh of Llama 3, and the release that turned 'small Llama' into a serious all-rounder. The 8B here has the **same size** as Llama 3 8B but far more capability around it:",
      "**128,000-token context** (16× more to remember), **eight officially supported languages** (English, German, French, Italian, Portuguese, Hindi, Spanish, Thai), and official support for **tool use** — the structured function-calling that lets an assistant actually do things (look up data, call your APIs).",
      "It also has a formal **licence that permits using its outputs to train other models** (distillation/synthetic data), which is why so many small models in the wild are 'distilled from Llama 3.1 8B'.",
      "Popularity check: **4.83 million downloads per month** on Hugging Face (October 2026) — the most downloaded Llama of any size. It is the de-facto small default across tooling.",
    ],
    whyMade: [
      "Three jobs at once: (1) give the 8B class the long context and multilingual support that had become table stakes by mid-2024; (2) make it a building block for agents via tool-use benchmarks; (3) create a licence-clean teacher model so others could distil from it legally.",
    ],
    sizeInHumanTerms: [
      "≈ **16.1 GB** full quality (computed), ≈ 5 GB at 4-bit — runs on one 16–24 GB GPU or quantized on a laptop CPU.",
      "128,000 tokens ≈ **300 pages of text** it can hold in mind at once — you can paste a whole manual or a fat contract.",
      "Its 4.8M monthly downloads show it's one of the most-used AI models on the planet, mostly in servers but increasingly on personal machines.",
    ],
    goodFor: [
      {
        title: "Long-document chat and RAG",
        desc: "128k context at 8B means whole-document questions on cheap hardware — the single biggest practical upgrade over Llama 3.",
      },
      {
        title: "Tool calling / light agents",
        desc: "BFCL v2 score of 65.4 — respectable function calling for its size, enough for structured API pipelines.",
      },
      {
        title: "Code help",
        desc: "HumanEval 72.6 / MBPP 72.8 — better than the entire Code Llama family's headline, on a general model.",
      },
      {
        title: "Multilingual-lite tasks",
        desc: "Eight supported languages with a real MGSM (multilingual maths) score of 68.9 to back it up.",
      },
      {
        title: "Being a teacher model",
        desc: "The licence explicitly allows using its outputs to train other models — the legal way to distil a mini-model of your own.",
      },
    ],
    notGoodFor: [
      {
        title: "Hard science or deep reasoning",
        desc: "GPQA Diamond 31.8 (chance is 25) — don't pick it for PhD-level Q&A or complex planning.",
      },
      {
        title: "Facts after 2023",
        desc: "Knowledge cutoff December 2023 — nothing from 2024–2026 without a search tool.",
      },
      {
        title: "Seeing images",
        desc: "Text only — vision needs Llama 3.2 Vision 11B or a Llama 4 model.",
      },
      {
        title: "Deep fluency in unsupported languages",
        desc: "Meta's card warns against conversing in languages beyond the eight without your own fine-tuning.",
      },
    ],
    flaws: [
      "**Reasoning remains its ceiling** — GPQA 31.8 means genuinely hard problems need a bigger model.",
      "**Knowledge cutoff December 2023**.",
      "**Text only** — no vision or audio.",
      "Multilingual is 'supported', not 'equal' — English-centric performance under the hood.",
      "At 8B, hallucination and shallow world knowledge persist; knowledge-heavy tasks need retrieval regardless.",
      "Now itself dated against 2026's small models (Meta's own Muse line and current open-weight rivals at ~8B have moved on).",
    ],
    laterImprovements: [
      {
        label: "Llama 3.1 70B / 405B (same day)",
        text: "The same recipe at bigger sizes — the 70B became the default serious workhorse, the 405B the flagship (both have their own pages).",
      },
      {
        label: "Llama 3.3 70B (December 2024)",
        text: "Beat the 405B on steerability, science reasoning and maths — but only exists as a 70B chat model; the 8B tier kept 3.1 as its best.",
      },
      {
        label: "Llama 3.2 Vision (September 2024)",
        text: "Added eyes at 11B/90B via an adapter, since the 3.1 text models couldn't see.",
      },
      {
        label: "Llama 4 (April 2025)",
        text: "Native multimodality, 10M/1M-token contexts and mixture-of-experts efficiency — at 109B+ total size, so a different league of hardware.",
      },
    ],
    whoShould:
      "Almost everyone who wants 'a small local Llama' — long-context RAG, summarizing, rewriting, tool-calling, a distillation teacher, or a cheap default model in a pipeline.",
    whoShouldnt:
      "Hard reasoning, vision, or post-2023 knowledge — step up to Llama 3.3 70B (or a newer non-Llama model) for those.",
    facts: [
      { label: "Released", value: "23 Jul 2024" },
      { label: "Size", value: "8.03B" },
      { label: "Context", value: "128,000 tokens (~300 pages)" },
      { label: "Languages", value: "8 supported (en, de, fr, it, pt, hi, es, th)" },
      { label: "Knowledge cutoff", value: "December 2023" },
      { label: "Downloads", value: "4.83M/month (Oct 2026) — family #1" },
      { label: "Licence", value: "Commercial + distillation allowed" },
    ],
    sourceNote:
      "From the official Llama 3.1 model card (benchmark table, supported-languages note, distillation clause, data freshness) and the Hugging Face API for exact counts and download figures.",
  },
  {
    slug: "llama-3-2-1b-3b",
    name: "Llama 3.2 — 1B & 3B",
    tier: "under-30b",
    tagline:
      "The pocket-size pair (September 2024): tiny models distilled from big ones, with Meta's first official 4-bit weights.",
    released: "25 September 2024",
    sizeLabel: "1.24B / 3.21B parameters",
    contextLabel: "Huge for their size — 128,000 tokens",
    ollamaTag: "llama3.2:3b",
    pullSize: "2.0 GB",
    paramsBillions: [1, 3],
    whatIsIt: [
      "These are the smallest Llamas ever released — the 1B is about the size of a fingernail compared to the 405B flagship. They were built for **phones, browsers, and other constrained devices**, where a 16 GB model simply cannot live.",
      "The clever part: they weren't trained from scratch. Meta **pruned** the bigger Llama 3.1 lineage down and used **knowledge distillation** — the 8B and 70B models' outputs were used as teaching targets during training, so the little models learned to predict text the way the big ones do.",
      "They came with Meta's **first-ever officially published compressed weights**: four 4-bit repos (two methods — QLoRA and SpinQuant) that cut memory to roughly 1 GB and 2 GB while keeping almost all the quality.",
      "Meta's own honest framing: these are *'smaller and less capable derivatives of Llama 3.1'* expected to be *'deployed in highly constrained environments, such as mobile devices.'*",
    ],
    whyMade: [
      "Two forces: device makers wanted on-device AI (privacy, cost, offline), and Meta needed small models for its own mobile apps. Distillation let Meta deliver genuinely capable 1B/3B models without paying full pretraining cost — pruning first, then recovering performance by learning from the teachers.",
    ],
    sizeInHumanTerms: [
      "1B ≈ **2.5 GB** full quality, ≈ **1 GB** official 4-bit (computed). 3B ≈ **6.4 GB** full, ≈ **2 GB** official 4-bit.",
      "Translation: the 1B runs comfortably on a modern phone; the 3B runs on a laptop CPU with usable speed.",
      "Context of 128,000 tokens at this size is remarkable — they can hold ~300 pages in mind despite weighing under a gigabyte at 4-bit.",
    ],
    goodFor: [
      {
        title: "On-device summarizing and rewriting",
        desc: "The card positions them for summarization, rewriting, and retrieval tasks on-device — private, offline, free.",
      },
      {
        title: "The 3B as a mini-assistant",
        desc: "IFEval 77.4 (close to the 8B's 80.4), GSM8K maths 77.7, and BFCL tool-calling 67.0 — instructions and light tool use genuinely work.",
      },
      {
        title: "Query rewriting in front of a big model",
        desc: "A classic pattern: the tiny model rewrites/extends your search query, the big model answers. Cheap and effective.",
      },
      {
        title: "Official, trustworthy compression",
        desc: "Both QLoRA and SpinQuant 4-bit repos come from Meta itself — no guessing which community quant is sane.",
      },
    ],
    notGoodFor: [
      {
        title: "Anything knowledge-heavy",
        desc: "MMLU 49.3 (1B) / 63.4 (3B) — thin world knowledge compared to the 8B's 69.4.",
      },
      {
        title: "Tool use on the 1B",
        desc: "BFCL 25.7 — function calling on the 1B is effectively broken. Build agents on the 3B at minimum.",
      },
      {
        title: "Hard reasoning (either size)",
        desc: "GPQA 27.2 (1B) and 32.8 (3B) are at/near chance — both are equal to or worse than the 8B on hard science questions.",
      },
      {
        title: "Vision",
        desc: "Text only.",
      },
    ],
    flaws: [
      "**The 1B's knowledge is thin** — MMLU 49.3 and broken tool-calling mean it can only handle narrow, well-defined tasks.",
      "**Hard reasoning is out of reach** at both sizes; Meta itself calls them 'less capable derivatives'.",
      "**1B summarization is mediocre** — rougeL 16.8 versus the 8B's 17.2 even though summarizing was a target task (distillation has ceilings).",
      "**Knowledge cutoff December 2023**; officially supported languages only.",
      "The official 4-bit repos are **Instruct-only** (no quantized base models) and downloads of those repos are tiny — most people use community GGUF instead.",
      "Safety in constrained deployments needs the matching guardrail: Meta recommends **Llama Guard 3 1B** alongside them.",
    ],
    laterImprovements: [
      {
        label: "Llama 3.3 70B (December 2024)",
        text: "Showed what 'same family, better post-training' can do — beating even the 405B on several measures.",
      },
      {
        label: "Llama 4 Scout (April 2025)",
        text: "Applied the opposite strategy: instead of shrinking models down, use mixture-of-experts so only 17B of 109B parameters work per answer — big-model quality with smaller-model speed (though it needs much more memory).",
      },
      {
        label: "Meta's Muse line (2026)",
        text: "After the Llama line stopped, Meta's newer small-model efforts continued under the Muse brand (Muse Spark, Glimmer).",
      },
    ],
    whoShould:
      "On-device and edge AI, privacy-local summarizing/rewriting/classifying, query rewriting in front of bigger models, and tiny-model experiments.",
    whoShouldnt:
      "Knowledge Q&A, science/math reasoning, agents (especially on the 1B), vision, or anything needing 2024+ facts.",
    facts: [
      { label: "Released", value: "25 Sep 2024" },
      { label: "Sizes", value: "1.24B / 3.21B" },
      { label: "Context", value: "128,000 tokens (~300 pages)" },
      { label: "Built by", value: "Pruning + distillation from 3.1 8B/70B" },
      { label: "Official 4-bit", value: "Yes — QLoRA & SpinQuant repos" },
      { label: "Knowledge cutoff", value: "December 2023" },
      { label: "Licence", value: "Llama 3.2 Community — commercial OK" },
    ],
    sourceNote:
      "From the official Llama 3.2 model card (benchmarks, distillation recipe, quantization table, constrained-environment framing) and the Hugging Face API for exact parameter counts.",
  },
  {
    slug: "llama-3-2-vision-11b",
    name: "Llama 3.2 Vision — 11B",
    tier: "under-30b",
    tagline:
      "The small Llama that learned to see (September 2024): documents, charts and screenshots on one modest GPU.",
    released: "25 September 2024",
    sizeLabel: "10.64B / 10.67B parameters",
    contextLabel: "128,000 tokens — text and images",
    ollamaTag: "llama3.2-vision:11b",
    pullSize: "7.8 GB",
    paramsBillions: [11],
    whatIsIt: [
      "Until this release, Llamas were blind — text only. Llama 3.2 Vision fixed that with an elegant trick: **the language model underneath is an untouched Llama 3.1**, and Meta bolted on a separately trained **vision adapter** — 'a series of cross-attention layers [that] feed image encoder representations into the core LLM'.",
      "In plain terms: a camera module was attached to a normal Llama's brain without rewiring the brain itself. It was trained on **6 billion image+text pairs**.",
      "Two sizes exist: this 11B (small, one GPU) and the 90B (big, two GPUs — see the 70B+ tier). It takes pictures plus text in, and text out. Use cases listed on the card: visual recognition, image reasoning, captioning, visual grounding ('point to the region you mean'), document Q&A and image-text retrieval.",
      "Important language caveat from the card: text-only tasks support the usual eight languages, but **for image+text applications English is the only supported language**.",
    ],
    whyMade: [
      "By late 2024, multimodal models were expected everywhere (documents, screenshots, charts). Rather than retraining Llama from scratch with vision, Meta's adapter approach let them ship eyes quickly while keeping every Llama 3.1 tooling and fine-tune recipe working on the text side.",
    ],
    sizeInHumanTerms: [
      "≈ **21.3 GB** full quality (computed) — a single 24 GB GPU is the natural home; about 7 GB at 4-bit community quantization.",
      "The vision adapter adds almost nothing: base 10.643B → Instruct 10.670B (about 27 million parameters — a rounding error).",
      "Translation: it's basically Llama 3.1 8B's brain with a camera, needing one solid GPU.",
    ],
    goodFor: [
      {
        title: "Reading documents and forms",
        desc: "DocVQA 88.4, AI2 Diagram 91.1 — invoices, contracts, scans and infographics read accurately.",
      },
      {
        title: "Charts and graphs",
        desc: "ChartQA 83.4 — 'what does this chart say' questions answered from the image itself.",
      },
      {
        title: "Screenshot understanding",
        desc: "Useful for UI review, bug reports and 'what's wrong with this screen' loops.",
      },
      {
        title: "Vision + long text together",
        desc: "It keeps the full 3.1 text brain: MMLU 73.0, maths 51.9 and 128k context come along for the ride.",
      },
    ],
    notGoodFor: [
      {
        title: "Non-English image work",
        desc: "Image+text is English-only per the official card — a hard product limitation.",
      },
      {
        title: "Hard multimodal reasoning",
        desc: "MMMU 50.7 (college-level multimodal) is mid-tier — a competent document reader, not a strong visual reasoner.",
      },
      {
        title: "Multi-image workflows",
        desc: "The card documents no multi-image capability (Llama 4 later made 'up to 5 images' explicit) — treat extended multi-image use as untested.",
      },
      {
        title: "Audio or video",
        desc: "Pictures only.",
      },
    ],
    flaws: [
      "**English-only understanding of images.**",
      "**Bolted-on vision, not native**: the cross-attention adapter is weaker than Llama 4's early-fusion approach (Maverick scores MMMU 73.4).",
      "**~21 GB at full quality** for an adapter model is heavy for laptops; no official compressed version exists (community quants only).",
      "**Multimodal reasoning ceiling** — MMMU-Pro 33.0 is entry-level for a 90B-class task at 11B.",
      "Knowledge cutoff December 2023 (inherited from Llama 3.1).",
      "Dated: a 2024 adapter design versus 2025+ natively multimodal models.",
    ],
    laterImprovements: [
      {
        label: "Llama 3.2 Vision 90B (same day)",
        text: "The bigger sibling with a 70B text brain — MMMU 60.3 vs 50.7 here (its own page in the 70B+ tier).",
      },
      {
        label: "Llama 4 (April 2025)",
        text: "Replaced adapters with **early fusion**: images join the text stream natively at the input layer, adding multilingual image understanding (12 languages) and multi-image input (tested up to 5 images). Maverick hits DocVQA 94.4 and MMMU 73.4.",
      },
      {
        label: "Llama Guard 4 (April 2025)",
        text: "Even the safety line went multimodal — a single 12B model that moderates both text and images.",
      },
    ],
    whoShould:
      "Document/chart/screenshot extraction pipelines — especially if you already run Llama 3.1 8B and want a vision twin with matching behaviour.",
    whoShouldnt:
      "Non-English image tasks, hard visual reasoning, multi-image agent loops, or new projects where Llama 4 Maverick's vision is worth the bigger footprint.",
    facts: [
      { label: "Released", value: "25 Sep 2024" },
      { label: "Size", value: "10.67B (Instruct)" },
      { label: "Context", value: "128,000 tokens, image + text in" },
      { label: "Image languages", value: "English only" },
      { label: "Best scores", value: "DocVQA 88.4 · ChartQA 83.4 · MMMU 50.7" },
      { label: "Runs on", value: "1× 24 GB GPU (≈21.3 GB BF16)" },
      { label: "Licence", value: "Llama 3.2 Community — commercial OK" },
    ],
    sourceNote:
      "From the official Llama 3.2 Vision model card (adapter architecture, benchmark tables, English-only image note, intended uses); memory computed as parameters × 2 bytes.",
  },
  {
    slug: "safety-classifiers",
    name: "Safety classifiers — Llama Guard 1–4 & Prompt Guard 1–2",
    tier: "under-30b",
    tagline:
      "Not chat models at all: the small guard models that check what humans and other AIs say — one of them is the most downloaded model on all of Hugging Face.",
    released: "December 2023 – April 2025",
    sizeLabel: "70.8M – 12B parameters",
    contextLabel: "Prompt Guard: 512 tokens · Llama Guard: 8,192",
    whatIsIt: [
      "These are **bodyguards, not assistants** — small models that sit in front of (or behind) any AI system and classify what they see. Meta publishes them under its **Purple Llama** safety brand, and every one of them lands in the under-30B tier.",
      "Two families:",
      "**Llama Guard** (7B → 8B → 1B → 12B over time) is a *generative* classifier: you hand it a prompt or a reply, and it writes back `safe` or `unsafe: <categories>`. From version 3 its categories follow the **MLCommons hazard taxonomy** — 14 categories from violent crime to code-interpreter abuse — so moderation rules are standardised instead of vibes.",
      "**Prompt Guard** is a classic tiny classifier (not an LLM): it labels input text as `benign`, `injection` (instructions hidden in third-party content) or `jailbreak` (someone trying to override the system prompt). It's mDeBERTa-based with a **512-token window** and runs on a CPU.",
      "Naming gotcha: 'Prompt Guard 86M' counts only its backbone — the full model is **278.8M parameters** including embeddings (the 'Llama Guard 3 1B' is likewise really 1.498B).",
    ],
    whyMade: [
      "Every LLM deployment needs moderation, and closed APIs made you depend on someone else's filter. Meta's answer: open guard models anyone can self-host, with an auditable category system (MLCommons) that regulators and enterprises can point at.",
      "They demonstrably work: in Meta's eval, Llama Guard 3 cut the false-positive rate to **0.040** versus GPT-4 zero-shot's 0.152 — and Prompt Guard 86M has racked up **2.4 million downloads per month** (October 2026), making it one of the most-used models anywhere.",
    ],
    sizeInHumanTerms: [
      "Prompt Guard: 278.8M parameters ≈ **~1 GB** at full precision — runs on a CPU, in front of every single model call without anyone noticing.",
      "Llama Guard 3 1B: 1.498B (1.123B pruned for the official mobile 4-bit version). Llama Guard 3 8B: 8.03B ≈ 16 GB; an official INT8 cuts the checkpoint ~40%. Llama Guard 4 12B: 12.001B ≈ 24 GB.",
      "Practical shape: a **ladder** — CPU-cheap input filtering → small content moderation → a bigger multimodal moderator when images are involved.",
    ],
    goodFor: [
      {
        title: "Input filtering for any LLM",
        desc: "Prompt Guard catches prompt-injection and jailbreak attempts at the door — CyberSecEval: 99.5% detection of in-eval injections at 0.8% false alarms.",
      },
      {
        title: "Content moderation of outputs",
        desc: "Llama Guard 3 8B: F1 0.939 across 14 categories in 8 languages, including tool-abuse categories that matter for agents.",
      },
      {
        title: "Image moderation",
        desc: "Llama Guard 4 12B handles text and images in one model, replacing both the 8B text and 11B vision guards.",
      },
      {
        title: "Mobile / constrained moderation",
        desc: "Llama Guard 3 1B INT4 (1.123B) brings moderation to the device itself.",
      },
      {
        title: "Standardised, auditable policy",
        desc: "MLCommons categories mean your moderation rules are interoperable and documentable — and you can fine-tune them to your own policy.",
      },
    ],
    notGoodFor: [
      {
        title: "Being unbeatable security",
        desc: "Both families state in their own Limitations sections that adversarial/prompt-injection attacks can bypass them.",
      },
      {
        title: "Zero false positives",
        desc: "LG3 warns deployments 'might increase refusals to benign prompts'; Prompt Guard runs 3–5% false alarms on out-of-distribution/multilingual text unless you fine-tune it.",
      },
      {
        title: "Categories needing fresh facts",
        desc: "Defamation, IP and election-related categories 'require factual, up-to-date knowledge' — Meta says deploy more complex systems for those.",
      },
      {
        title: "Sophisticated indirect injections (as-is)",
        desc: "Prompt Guard detects 71.4% on CyberSecEval's indirect injections — roughly 1 in 4 slips through without fine-tuning.",
      },
    ],
    flaws: [
      "**Bypassable by design-adjacent attacks** — LG3: 'susceptible to adversarial attacks or prompt injection attacks that could bypass or alter its intended use'; Prompt Guard: 'not immune to adaptive attacks' (worse, since it's open and attackers can iterate against it).",
      "**False positives are the tax** you pay for filtering; thresholds need tuning to your traffic.",
      "**The 512-token window** means long documents must be chunked — and chunk boundaries are themselves a bypass surface.",
      "**Generative Llama Guards are slow-ish** (each check is a text generation) and English-centric — F1 varies by language (Thai 0.834 vs French 0.943).",
      "**Superseded versions everywhere** — LG1's own 6-category taxonomy and LG2 were replaced within months; using an old one means an outdated policy.",
      "**All repos are gated**, and none has been updated since **April 2025** (Prompt Guard 2 was Meta's last-ever weights upload to the Llama org).",
    ],
    laterImprovements: [
      {
        label: "Llama Guard 2 (April 2024)",
        text: "Moved from LG1's homemade 6-category list to the MLCommons taxonomy within months of LG1's launch.",
      },
      {
        label: "Llama Guard 3 (July–September 2024)",
        text: "14 categories (adding code-interpreter abuse for the agent era), 8 languages, tool-use benchmarks, and official INT8/INT4 versions.",
      },
      {
        label: "Llama Guard 4 + Prompt Guard 2 (April 2025)",
        text: "LG4 became one multimodal moderator (pruned from Llama 4 Scout) replacing both the text and vision guards; Prompt Guard 2 refreshed the injection/jailbreak classifier in 22M and 86M sizes across eight languages — the last weights Meta ever published for this family.",
      },
    ],
    whoShould:
      "Anyone shipping an LLM feature: Prompt Guard 2 in front of every request, Llama Guard 3 behind responses, Llama Guard 4 when users upload images.",
    whoShouldnt:
      "People expecting a security guarantee — these reduce risk and standardise policy; they don't eliminate attacks, and they're not chat models you can converse with.",
    facts: [
      { label: "Released", value: "Dec 2023 – Apr 2025" },
      { label: "Sizes", value: "70.8M – 12B total" },
      { label: "Taxonomy", value: "MLCommons (14 categories, LG3+)" },
      { label: "Prompt Guard window", value: "512 tokens" },
      { label: "Best-known number", value: "LG3 FPR 0.040 vs GPT-4's 0.152" },
      { label: "Adoption", value: "Prompt Guard: 2.4M downloads/month" },
      { label: "Licence", value: "Llama 3.1 Community (gated repos)" },
    ],
    sourceNote:
      "From the official Llama Guard 3 and Prompt Guard model cards (fetched from their Hugging Face pages: taxonomy, F1/AUPRC/FPR and TPR/FPR tables, Limitations sections), the Purple Llama repo, papers arXiv:2312.06674 and arXiv:2404.12241, and the Hugging Face API.",
  },
];
