# What colibri does that makes huge models run small — a deep audit

**Audit dates:** 2026-10-25 and 2026-10-26 (two passes)
**Subject:** `/home/aden/ai/colibri` — pure-C MoE inference engines (13 engines, one C file per model family)
**Question answered:** how does this codebase run models like Qwen3.6-35B-A3B (23 GB download) or GLM-5.2 (429 GB) on a laptop-class machine?
**Status:** *local analysis of the working tree as of the dates above.* Every claim below is traced to a `file:line` in this repository or to a measured number in `docs/`. Claims that could not be confirmed are marked **unverified**.

---

## 0. Audit method — two passes, and what "verified" means here

### Pass 1 — structural read-through
Read the README's *How it works* section, `docs/CACHE_ROUTE.md`, and the four core headers/engines: `c/tier.h`, `c/expert_store.h`, `c/st.h`, `c/qwen36.c` (header comment, LRU/Slot/LCache/Model structs). Measured engine sizes (`wc -l`), grepped every `O_DIRECT`, `pread`, `posix_fadvise`, `mmap`, `PILOT`, `prefetch` site in `c/`.

**Pass 1 conclusion:** the mechanism is *residency management of a sparse model*, not a new kernel trick. The dense part stays in RAM; the routed experts are streamed from disk behind a per-layer LRU with a learned pinned set.

### Pass 2 — claim-by-claim verification
Every sentence of the README's *How it works* was independently re-derived from source, plus the subsystems Pass 1 did not open: the quantization/kernel header, the GPU chain, the sizing planner (`setup_catalog.py`, `resource_plan.py`), the build flags, speculation, KV/attention memory, the test corpus, and every measured number quoted in the README tables.

**Pass 2 rule applied:** a README claim counts as verified only if (a) the code that implements it exists at a citable line, and (b) the *scope* of the claim is stated exactly — including where the README is looser than the code. Discrepancies are collected in §12 rather than smoothed over.

**Pass 1 → Pass 2 changes:** three README statements were narrowed in this document (see §12.1–12.3). No claim was found to be false.

---

## 1. The one-sentence answer

**A mixture-of-experts model only uses a few percent of its weights per token, so colibri keeps exactly that fraction resident — the dense trunk plus the routing-hot experts in RAM (and a still-hotter set in VRAM) — and reads the rest from NVMe on demand, at int4, one slab per expert, with a prefetch thread that is usually one layer ahead.**

Everything else in this document is the precise engineering of that sentence.

---

## 2. The invariant the whole design hangs on

> "Every layer of every token walks the same five steps: route, union, place, overlap, learn. The design goal is that **placement only ever decides speed**: the router's decisions and the weights' precision are the same whether an expert answered from VRAM, from RAM or from disk."
> — `README.md:478-481`

This is the load-bearing claim, and it is what makes the rest safe: **cache state must not change numerics.** Verified consequences in code:

- The expert slot holds the *same* weight bytes whether it was just read or has been resident for an hour — `load_expert_merged()` (`c/qwen36.c:2642`) always produces the same container layout, and the kernel (`c/expert_ffn.h`) is layout-driven, not residency-driven.
- Routing is decided *before* residency is consulted. Cache-aware routing is **opt-in and off by default**: *"Default: OFF. Stock full top-K router behavior unless `CACHE_ROUTE=1`"* (`docs/CACHE_ROUTE.md:3`).
- Same for the prefetch: PILOT "prefetches weights; does not change expert IDs" (`docs/CACHE_ROUTE.md:10`).
- The build never uses `-ffast-math` / `-Ofast` — grepped across every `Makefile*`, no matches. `-O3 -fopenmp [-march=…] [-flto]` only.

**Policy:** *"an optimisation earns its place with a reproducible end-to-end measurement, and the default policy never silently changes model [precision/routing]"* — `README.md:179-180`.

---

## 3. What is resident and what streams

### 3.1 The dense trunk (always in RAM, as float32)

From the engine header (`c/qwen36.c:12-16`):

> `DENSE (embed, attn/dn q/k/v/o & projections, q/k norms, RMSNorm, router gate, shared expert, lm_head, final norm) resident in RAM (float32). Expert weights read from disk on-demand via pread + posix_fadvise(DONTNEED), cached LRU per-layer, with a PILOT prefetch thread — the same mechanism that fits GLM-5.2 in 15 GB.`

Concretely resident per token of compute: **embedding table, all attention/DeltaNet projections, both norms, the router gate, the shared expert, lm_head, final norm**. What streams: **only the routed experts**.

The measured size of that trunk, from the catalog (`c/setup_catalog.py`):

| Model | On disk | `dense_gb` (always resident) | resident share |
|---|---|---|---|
| Qwen3.6-35B-A3B | 23.1 GB | **3.5 GB** | 15% |
| Qwen3-Coder-30B-A3B | 19.4 GB | 3.6 GB | 19% |
| DeepSeek V4 Flash (284B) | 166.9 GB | 7.9 GB | **4.7%** |
| GLM-5.2 (744B) | 429.3 GB | 9.9 GB | **2.3%** |
| Kimi K3 (2.8T) | 1561 GB | 20.0 GB | **1.3%** |

That ratio is the whole trick: **the dense part is a small, fixed cost; everything else is a cache problem, not a memory problem.**

### 3.2 The exact sizing formula (the planner, `c/resource_plan.py`)

`setup_catalog.py` only decides what to *offer* — its docstring is explicit that its RAM figures are **hand-measured, not computed**: *"The RAM figures come from the measurements quoted in README.md and the per-model docs"* (`c/setup_catalog.py:18-23`), and *"After the download, `coli setup` runs the real planner (resource_plan.py) on the files, which is the authority; these numbers only decide what to offer"* (`c/setup_catalog.py:26-28`).

The authority, `resource_plan.py`, scans every shard's safetensors header, classifies each tensor into **dense / expert-fixed / expert**, and computes per-layer expert cost as the **median** expert size of that layer (`max` for qwen38, which has heterogeneous dtypes — `resource_plan.py:1551-1555`). Then:

```
# RAM budget: 88% of available memory — a 12% OS reserve
ram_budget = available_memory * 0.88                       # resource_plan.py:3123

# Fixed runtime on top of the dense trunk:
runtime = 1.2GB + 2.5GB + 64*max_expert + expert_fixed
        + kv_bytes + kv_buffer + shared_dense_bytes        # resource_plan.py:3069-3071

# What is left for cached experts:
cache_bytes = max(0, ram_budget - dense_bytes - runtime)   # resource_plan.py:3131

# How many experts per LAYER fit:
cap = cache_bytes // per_cap                               # resource_plan.py:3132
#     where per_cap = Σ_layers median(expert_bytes[layer])  # resource_plan.py:1553-1554
cap = min(cap, configured_experts)                         # resource_plan.py:3134

warm_bytes = min(expert_bytes - hot_bytes, cache_bytes)    # resource_plan.py:3139
cold_bytes = expert_bytes - hot_bytes - warm_bytes         # resource_plan.py:3140
projected_hit = (hot_bytes + warm_bytes) / expert_bytes    # resource_plan.py:3182
```

VRAM side — the **dense trunk goes to the GPU first** because it is read every token, experts get what is left (`resource_plan.py:3077-3084`), with a 2 GB free-VRAM reserve per device (`:3081`):

```
usable = gpu.free_bytes - 2GB                              # resource_plan.py:3081
vram_budget = min(requested_vram, vram_limit, expert_bytes)# resource_plan.py:3101
vram_experts = vram_budget // typical_expert_bytes         # resource_plan.py:3102
```

The output is a three-tier plan — `disk: cold-backing`, `ram: resident+warm-experts`, `vram: hot-experts` (`resource_plan.py:3226-3244`) — plus `expected_bottleneck`, `projected_hit_rate`, tuned knobs, and a human-readable `decisions` list (`:3257-3265`).

**Bottleneck classification drives the recommendations** (`resource_plan.py:3183-3197`, `:3252`): `disk expert misses` → "you need a faster SSD / bigger cache"; `CPU expert tail and GPU compute` → mixed; `RAM bandwidth` for dense models; `compute` when fully resident. `_auto_tune()` and `_next_actions()` then pick the knobs (`:3204-3210`).

**Key insight from Pass 2:** the planner does *not* assume the model fits in RAM. It assumes the **dense part fits** and then spends whatever remains on expert slots — and it *warns* rather than lies when it cannot (`resource_plan.py:3144-3156`): "RAM budget cannot hold one expert slot per sparse layer".

### 3.3 Cache states: cold → warm → hot → VRAM → pinned

The catalog's `assess()` maps the plan onto a machine in five states (`c/setup_catalog.py:198-219`):

| status | meaning |
|---|---|
| `good` | runs as measured — small: "the whole model fits in RAM"; large: "**dense part X GB stays in RAM, the experts stream from the SSD**" (`:216-219`) |
| `tight` | "runs with a small expert cache" (`:213-215`) |
| `needs-ram` | below `ram_min_gb`: "does not start or swaps" (`:206-209`) |
| `needs-disk` | `disk_gb * 1.02 + 2GB` free required (`:205`, `:210-212`) |
| `unsupported` | the Makefile itself refuses that family on that platform (`:188-195`) |

Recommendation policy (`setup_catalog.py:226-250`): *"the most capable model that runs from RAM on this machine; if no small model fits, the smallest download among the large ones that do. A 20 GB download that answers at several tokens per second is the better first experience than a 400 GB one at a fraction of a token."*

---

## 4. The disk path — why reading 400 GB from SSD does not melt the machine

### 4.1 `pread` + `posix_fadvise(DONTNEED)`, explicitly **not** `mmap`

`c/st.h:1-6` states the reason outright (in Italian, as much of the original commentary is):

> *"legge con pread (niente mmap) + posix_fadvise(DONTNEED) -> le pagine NON restano residenti nel processo. E' la correzione del bug di RSS: cosi' la RAM di picco resta densa+cache, non l'intero modello."*
>
> (reads with pread, no mmap, plus fadvise DONTNEED → the pages do **not** stay resident in the process. This is the fix for the RSS bug: peak RAM stays *dense + cache*, not the whole model.)

**Why this matters:** `mmap` a 400 GB file and touch it once and the kernel counts those pages against your RSS until it decides to reclaim them — so a "streaming" engine appears to need 400 GB. Reading with `pread` into a buffer you own, then telling the kernel `POSIX_FADV_DONTNEED` (`st.h:1091`, `st.h:1170`), makes the page cache an *advisory* resident rather than an accounted one. Peak RSS = dense trunk + expert cache, and nothing else.

(`POSIX_FADV_WILLNEED` at `st.h:1045`, `st.h:1055` is the readahead path.)

### 4.2 `O_DIRECT` twin file descriptors

Every shard has a buffered fd and a lazily opened **O_DIRECT twin** (`st.h:47`, opened at `st.h:273-274`):

> *"fd gemello O_DIRECT dello stesso file (bypassa la page cache: il buffered read su ext4-in-VHDX si strozza a ~0.8 GB/s, O_DIRECT arriva a 2.3+; misurato)."* — `st.h:284-285`

i.e. bypassing the page cache took a measured **0.8 GB/s → 2.3+ GB/s** on that filesystem. The setting is deliberately **not** a default, because it is drive-dependent (`docs/ENVIRONMENT.md:89`):

> `DIRECT` — *"**Drive-dependent — measure it on your hardware.** On real NVMe with DRAM cache and headroom it is often a large win (measured +34% decode with `PIPE=1` on a Blackwell/Windows box, and 4.25→9.69 GB/s in iobench on a GB10); on QLC/DRAM-less drives or slow/virtualised disks it can be neutral to negative."*

### 4.3 One slab per expert → one read for all three matrices

The container stores an expert as **one concatenated tensor**, so reading it is one call (`c/qwen36.c:785-786`):

> *"One slab per expert, `[gate int4 packed | up int4 packed | down int8]`, 2*inter*hidden…"*

`load_expert_merged()` (`c/qwen36.c:2642`) resolves `…mlp.experts.<e>.merged_weight` and `…mlp.experts.<e>.qs`, checks size against `ng+ng+nd` (or the int4 / mixed variants), then issues:

- **one** `st_read_raw(...)` for the whole gate|up|down blob (`c/qwen36.c:2694`, `:2725`)
- **one** `st_read_f32(...)` for the per-row/per-block scales (`c/qwen36.c:2700`, `:2726`)

**Pass 2 narrowing (§12.1):** the README says *"An expert's three matrices are read in one `pread`"* (`README.md:494`). Strictly it is **one pread for the three matrices (the merged weight slab) plus a second, much smaller read for the quantization scales.** For a gs64 int4 expert the weight blob dominates by ~2 orders of magnitude, so the README's "never wait for the disk twice" claim holds in substance; the exact count is two reads.

`st_read_raw`/`st_read_f32` internally chunk their loop because a single `pread` caps near 2³¹ bytes on Linux (`st.h:379`, `inkling.c:894-895`, `tests/test_st_pread.c:3`).

### 4.4 Multiple SSDs — an explicit mirror, not RAID

`st.h:52-55` holds `mfds[ST_MAX_MIR][512]` (mirror fds), `mdfds` (their O_DIRECT twins), `nmirror`, `nrep`. `st_mirror_add()` (`st.h:324`) registers a replica directory; it tolerates a **partial** mirror — a shard missing from the second drive just stays on the primary (`st.h:338`), and refuses copies whose **size or header differ** (`st.h:341`, `st.h:354`).

Usage: `COLI_MODEL_MIRROR=/second/glm52_i4 ./coli chat --model /fast/glm52_i4` (`README.md:500`).
Measured: **two NVMe drives on independent controllers → +37.5% decode** (0.80 → 1.10 tok/s), `docs/multidisk.md:90`. A slower third drive was *neutral* after weighted striping — reported honestly in the README's own research table (`README.md:616`).

---

## 5. The cache — a per-layer LRU that learns your routing

### 5.1 Structures

`c/qwen36.c:851-855` — an LRU slot:

```c
typedef struct { int eid; int pinned; int is_int4;
                 int8_t *g, *u, *d; uint8_t *g4, *u4, *d4; uint8_t *pw;
                 float *gs, *us, *ds; uint64_t used; ... } Slot;
```

`pw` is the planar-int4 copy for the shared kernel — *"the only weight copy a slot holds when the shared kernel is active"* (`qwen36.c:852-854`).

Per-layer: `LCache` of `Slot`s; global: `Model` with `clock`, `is_pinned[]`, `seen[]`, `is_queued[]` (`qwen36.c:919-924`).

### 5.2 Eviction rule — pinned first, never a busy or pinned slot

`slot_victim()` (`c/qwen36.c:1051-1055`) skips slots that are `eid < 0` (empty), `slot_busy(s)` (a lease is held), or `s->pinned && !allow_pinned`. Under the lock, the eviction order is documented at `qwen36.c:2844`:

> *"LRU eviction: an unpinned slot first, else the oldest pinned one; …"*

…and the comment at `qwen36.c:2850-2856` shows the concurrency care: a slot may not be evicted while *either* the demand load *or* the PILOT worker is about to publish into it; the loser re-loops (`:2866-2870`). Cache publish then stamps `used = ++m->clock` (`:2883`).

### 5.3 The pinned hot set — learned, from *your* conversations

Warmup pins the top-N experts per layer after `warmup_tokens` (`qwen36.c:2894-2943`), logging `[HOT] Pinned %d experts (top-%d/layer) after %d warmup tokens` (`:2943`). Thereafter routing heat updates it (`:2948-2966`).

The heat file is **`.coli_usage`**, defined engine-agnostically in `c/route_trace.h:18-31`:

```
-1 <n_layers>   <n_experts>       ← dimensions
-2 <fmt_version> <engine_id>      ← identity (a 32-bit hash)
 <layer> <expert> <count>          ← sparse, non-zero only
```

Two deliberately forced design choices, both documented at `route_trace.h:27-35`:
- the header records use a **negative layer** so legacy `while(fscanf(...)==3)` readers guarded by `l>=0` skip them and keep parsing — old engines read new files;
- `engine_id` must be the **third** field because old readers parse it with `%u`, and a string in any slot would make `fscanf` return `<3` and **silently drop every record after it**.

It also shims `rename()` through `compat.h` because on Windows the CRT `rename` fails with `EEXIST` and *"would otherwise silently stop updating the history after its first write"* (`route_trace.h:13-17`). That is the level of care in this codebase.

Persistence: *"saved at the end of every run and serve turn, and fills the tier from it at the next start"* (`docs/qwen36.md:96-98`). **This is why colibri gets faster the more you use it** (`README.md:487-493`).

### 5.4 The tier admission rule (VRAM/RAM promotion)

`c/tier.h` — the shared contract every adaptive resident tier obeys:

```c
static int tier_should_promote(uint32_t hot, uint32_t cold){
    uint64_t threshold = (uint64_t)cold + ((uint64_t)cold>>2) + 4u;
    return (uint64_t)hot > threshold;      /* tier.h:9-12 */
}
static uint32_t tier_decay_value(uint32_t heat){ return heat>>1; }   /* tier.h:14 */
```

- **promote only if `hot > 1.25 × cold + 4`** — a fixed +4 floor for tiny samples, a 25% margin to prevent ping-pong (`tier.h:17`).
- **halve heat on decay** (`>>1`) so history ages out instead of saturating.
- `tier_pick_swap()` (`tier.h:18-27`) picks the coldest *pinned* entry as victim and the hottest *non-resident* expert as challenger.
- The header comment (`tier.h:6-8`) records the invariant the design was corrected for: *"Widen before adding the margin: a saturated uint32 heat counter must become sticky, not wrap the threshold and admit a colder expert."* — i.e. **counter overflow must fail closed.**

### 5.5 Optional cache-aware routing (off by default)

`docs/CACHE_ROUTE.md` — paper-style max-rank selection (arXiv:2412.00099): keep the true top-`J` always; fill the remaining slots preferring experts **already resident** that still rank inside top-`M`. Two residency levels in `qwen36` (VRAM first, then RAM), one in the GLM engine (`CACHE_ROUTE.md:14-22`). This is *routing-side* and can change which experts run — hence **opt-in**, and explicitly contrasted with PILOT, which does not (`CACHE_ROUTE.md:9-10`).

---

## 6. Overlap — never pay for I/O you could have hidden

| Mechanism | Where | What it does |
|---|---|---|
| **Loader pool** | `c/deepseek_v4_internal.h:20-24` (`COLI_V4_EXPERT_LOADER_COUNT 3`), `c/kimi_k3.c:1876` (`K3_PIPE`: "expert preads overlap compute"), `deepseek_v4.c:4561-4566` dual-loader experiment | a pool of threads reads missing experts **while resident ones compute** |
| **PILOT prefetch worker** | `c/qwen36.c:953-969` (queue `pilot_q[4096]`, mutex `g_pilot_mx`), started at `:1062-1067` | one dedicated thread that reads the *next* layer's routed experts ahead of time |
| **Router lookahead** | `glm_chain.h:641-642`, `:966-967` (`g_spec && g_prefetch && l->sparse → expert_prefetch(...)`), `:667` (`vkt_stream_prefetch`) | queues layer *n+1* while layer *n* computes |
| **Batch union** | `c/expert_ffn.h:20-26` | `xf_moe_run()` runs a whole MoE layer — gate+up fused over **the experts the routing touched**, silu, down, then the K contributions summed in rank order; threads split `(expert, row chunk)` items so *"a layer costs two OpenMP regions instead of `3*K`, and a prompt row never re-reads a weight another row of the same expert just used"* |
| **Prefill residency set** | `c/qwen36.c:924` (`seen`), `:3552`, `:3627`, `:5411` | the experts a prefill touched are remembered (`COLIBRI_RESIDENT`) so the decode phase starts warm |
| **Readahead** | `st.h:1045`, `st.h:1055` (`POSIX_FADV_WILLNEED`); Windows: `compat_prefetch_win.h` | ask the kernel for the next bytes |

**The measurable justification for lookahead:** *"GLM-5.2's expert routing is measurably predictable ahead of time — applying layer L+1's router to layer L's post-attention state recalls **71.6%** of the …"* (`docs/tuning.md:186-187`). Prefetch is not speculative hope; it is a measured 71.6%-correct prediction.

---

## 7. Compute — no BLAS, one int4 layout, and a scalar oracle

### 7.1 No external math library

Grepped every `Makefile*` and `c/*.{c,h}` for `cblas|lapack|openblas|-lblas|accelerate`: **no matches** (two unrelated comment hits). `README.md:520`: *"no BLAS and no Python at runtime: Python runs only the setup, the launcher, the converters and the API gateway."*

Confirmed by the file list: `c/*.py` are `autotune, cluster, doctor, download_fp8, experiment_manifest, family_registry, image_engine, mcp_server, openai_server, resource_plan, setup_catalog, setup_flow, setup_hw, tok…` — all setup/planner/gateway, none in the decode loop.

### 7.2 The layout that makes int4 fast: planar unsigned nibbles, gs=64

`c/expert_ffn.h:5-11`:

> *"`layout` — planar unsigned int4, gs=64: a row of I weights (I % 64 == 0) is I/64 blocks of 32 bytes; byte k of a block holds element k in its low nibble and element k+32 in its high nibble, both stored as v+8 (0..15). One f32 scale per (row, block), row-major [O][I/64]."*

Two consequences, both spelled out in the header:

1. **No unpack instruction is ever paid** — `and 0x0F` yields elements 0..31 in order, `srli 4` the other 32 (`expert_ffn.h:8-9`).
2. **The unsigned nibbles feed `vpdpbusd` natively** through the identity `dot(v,x) = dot(v,x) − 8·Σx` (`expert_ffn.h:9-11`) — i.e. the `v+8` offset lets VNNI/AMX-style unsigned×signed dot products do the work, with the correction folded into a per-block scalar.

Accumulation modes: **f32 activations by default** (exact weights, one fma per element + one per block for the scale), **i8 opt-in** (`mode 1`, one scale per row + per-block sums, 2 `dpbusd` per block) — and the header is explicit that i8 is *"not bit-identical to f32: same policy as IDOT elsewhere in the tree (opt-in until an ablation blesses it)"* (`expert_ffn.h:15-18`).

SIMD paths: **AVX2/FMA, AVX-VNNI or AVX512-VNNI** where built, NEON/`vdotq_s32` on arm64 (probed in the Makefile, `Makefile:171-186`), with a **scalar fallback that defines the numerics every SIMD path must reproduce** — f32 paths must match per-lane accumulation order, i8 paths must be exact integer sums *"so identical by construction"* (`expert_ffn.h:30-34`).

### 7.3 The measurement that justified all of it

`expert_ffn.h:26-32` — the before/after, with the floor:

> *"measured on the real Qwen3.6 container at full residency the MoE cost **34 ms/token** in steady state against a DRAM floor of **17 ms** for the int8-unpacked experts it was reading and **9 ms** for the int4 bytes actually on disk. Unpacking int4 to int8 at load doubled both the bytes per token and the resident set; per-GEMV OpenMP regions (24 per layer) and one reduction per 64-block did the rest."*

So the three fixes were: (1) **keep int4 on the wire, never materialize int8**, (2) **fuse the whole layer into two OpenMP regions instead of 3·K**, (3) **one reduction per 64-block**. Result reported in `docs/qwen36.md:146`: *"12.8 → 15.7 tok/s, MoE per token 34 → 20 ms on average and 30 → 17"*.

### 7.4 Build flags (`c/Makefile`)

```
CFLAGS  = -O3 $(OMPC) -Wall -Wextra …            # Makefile:92
CFLAGS += -march=$(ARCH)   / -mcpu=$(ARCH)        # Makefile:99 / :101   (ARCH=native is OPT-IN)
CFLAGS += -flto ; LDFLAGS += -flto                # Makefile:111-112     (opt-in)
# Windows: -D_FILE_OFFSET_BITS=64 -O3 -march=$(ARCH) -fopenmp   # Makefile:126
# PowerPC: -O3 -mcpu=$(ARCH) -fopenmp -pthread                  # Makefile:145
```

Notes from Pass 2:
- **`-ffast-math` / `-Ofast`: nowhere.** Numerics are not traded for speed.
- On arm64 clang, *"Niente -march: su arm64 NEON e' baseline"* — NEON is baseline, kernels activate themselves (`Makefile:52`); `ARCH=native` appends `-mcpu=native` instead (`Makefile:93`).
- OpenMP is the only threading primitive besides `pthread` (the PILOT/loader workers).

---

## 8. Attention & KV state — where the *other* memory goes

| Technique | Evidence | Effect |
|---|---|---|
| **MLA compressed KV** | `c/colibri.c:499`: *"k_rot [qk_rope] (576 vs 32768 valori/token). k_nope e value si ricostruiscono…"* | **576 floats/token instead of 32,768 → 57× smaller** (README.md:510-514); k_nope and value are reconstructed on the fly |
| **KV survives restarts** | README.md:510-514: *"that survives restarts, so a conversation reopens with no prompt to read again"*; `c/kv_persist.h`, `c/kv_prefix.h` | re-opening a conversation costs no prefill |
| **Prefix reuse across turns** | `c/kv_prefix.h:1` *"reuse the attention state a previous turn already built"*, `kv_prefix_reuse()` at `:123`, `kv_prefix_taint()` at `:112` | the longest common prefix of the new prompt is already computed |
| **Recurrent linear attention (DeltaNet)** | `c/qwen36.c:1-10`: Gated DeltaNet — *"causal depthwise conv1d + recurrent gated-delta-rule with a carried conv ring + state S[h]=[kdim,vdim]"* | state is O(1) in sequence length for those layers — no KV growth at all for 75% of Qwen3.6's layers |
| **KV quantization** | `c/kv_fp8.h`, `c/kv_tq.h`, `c/kv_persist.h`, `c/kv_prefix.h`, `c/kv_image_key.h` | KV precision is a separate, independently tunable knob |
| **Device KV split** | `c/vk_kvsplit.h`, `vk_chain.h:31-33` (`chain_kvs`, `vkc_kvs_*`) | a KV cache larger than VRAM is split device/host and the attention is merged |

---

## 9. The GPU path — one submission per layer, not per matrix

`c/vk_chain.h:1-10` is the clearest "before/after" in the repo:

> *"the engines' dense part on Vulkan was one synchronous `coli_vk_matmul` per matrix (**about 726 submits and host round trips per Qwen3.8 decode token**), slower on an integrated GPU than the CPU. Here an engine records a whole layer — norms, projections, RoPE, attention over a KV cache that lives on the device, the Gated DeltaNet recurrence with its state on the device, gates, the router logits, the shared expert, the residual add — **into one command buffer, and the residual stream stays on the device from one layer to the next.** Only what the CPU needs crosses: the rows the CPU's routed experts read and the router logits, then the routed sum coming back."*

Design details (`vk_chain.h:12-36`):
- Buffers are sub-allocated into three kinds (`VKC_DEV` / `VKC_UP` / `VKC_DOWN`) from a few large blocks, so *"a submit references a handful of allocations, not hundreds"* (`:14-17`).
- A ring of frames, each with its own fence and descriptor pool; **every op records the barrier it needs** (`:19-22`).
- Dedicated chain shaders (`shaders/chain_*.comp`): `chain_norm, chain_rope, chain_attn, chain_dnconv, chain_dnrec, chain_ew, chain_qsa, chain_ple` (`:24-26`).
- Optional MLA / KDA / hyper-connections / K3 attention-residual ops (`:27-31`).
- Device-lost handling is total: `coli_vk_mark_lost` → `vkc_lost()` → every later call returns 0 (`:34-36`).

**Three residency tiers on GPU** (`README.md:483-485`, `docs/CACHE_ROUTE.md:14-22`): VRAM (hot experts, `vk_tier.c` / `qwen36_tier.c`), RAM (warm), NVMe (cold). The dense **trunk** is placed on the first device if it fits (`resource_plan.py:3077-3084`); `COLI_VK_DENSE=0` keeps the trunk on CPU and lets the tier alone use the device (`qwen36.c:94`).

---

## 10. Speculation — only where it measurably pays

| Kind | Measured | Source |
|---|---|---|
| Qwen3.8 **MTP** head | **2.75 tokens/forward** (36 forwards per 99 tokens), **acceptance 90.0%**; by position 1: 97.1%, 2: 82.9% | `docs/speculative.md:137` |
| Qwen3.6 **prompt lookup** | **1.56 tokens/forward**, acceptance **85.1%** (57/67 drafts in 64 verifies), 32 declined by the gate, 5 probes | `docs/speculative.md:138` |
| Qwen3.6 lookup on a code edit | 7.90 tok/s with lookup vs 7.42 without; on a chat prompt **the gate declined every proposal and speed was unchanged** | `docs/qwen36.md:120` |
| GLM-5.2 int8 MTP | drafts **2.2–2.8 tokens/forward** when it pays | `README.md:515-517` |
| Qwen3.8-Flash-Next MTP | on by default, **+16–20%** with identical output; prompt lookup **+6–7%** on code edits | `README.md:515-519` |
| Where it loses | **DeepSeek V4: drafting costs more than it saves → stays off**; MTP measured a **32% loss around 85% expert hit** | `README.md:519`, `README.md:619` |

The honest framing is in README's own research table: *"MTP and grammar drafts work, but MTP has also measured a 32% loss around 85% expert hit … map the break-even surface across acceptance, expert hit rate, batch union, and draft depth"* (`README.md:619`). Speculation is a **gated, measured** feature, not a checkbox.

---

## 11. Authenticity of the measured numbers

Every performance figure in the README tables is traceable to a doc with its settings. Verified independently in Pass 2:

| Claim (README) | Verified in | Exact |
|---|---|---|
| Qwen3.6-35B-A3B: **6.0 tok/s CPU** | `docs/qwen36.md:103`, `:108` → `6.02` / `6.01` | ✓ |
| **9.9 tok/s with Vulkan** on the integrated GPU | `docs/qwen36.md:107-109` → `9.94 tok/s` (dense chain on), CPU `6.01` | ✓ (rounded) |
| **30.0 tok/s with CUDA** | `docs/qwen36-cuda-tier.md:248` → `25.4 → **30.0**` | ✓ |
| Vulkan tier alone 8.03 vs 6.02; TTFT 12.3 s vs 35.7 s | `docs/qwen36.md:103-106` | ✓ |
| Two NVMe drives **+37.5%** | `docs/multidisk.md:90` → `0.80 → 1.10 tok/s` | ✓ |
| **71.6%** one-layer-ahead routing predictability | `docs/tuning.md:186-187` | ✓ |
| GLM-5.2 MLA **576 vs 32,768 floats/token (57×)** | `c/colibri.c:499` | ✓ |
| GLM-5.2 6×RTX 5090: **9.0–9.2 tok/s** | `README.md:535-536` → experiment log `docs/experiments/glm52-6x5090-2026-07-12.md` | ✓ (linked) |
| GLM-5.2 25 GB laptop: **0.05–0.1 tok/s cold** | `README.md:541-542`, called *"the honest floor"* | ✓ |
| Kimi K3: **6.3 GB/s expert reads** | README table `:222` → `docs/kimi_k3.md` | ✓ |
| int4-gs64 vs per-row int4: *"about 9 points worse on quality"* | `README.md:574-578`, with issue `#455` as the failure case | ✓ |
| `DIRECT=1`: **+34% decode**, **4.25→9.69 GB/s** iobench | `docs/ENVIRONMENT.md:89` | ✓ |
| O_DIRECT on ext4-in-VHDX: **0.8 → 2.3+ GB/s** | `c/st.h:284-285` (*"misurato"*) | ✓ |

**Quality is measured too, not assumed:** `docs/benchmarks.md:72` records a failure case — *"HIP build produced perplexity 727 against 7.0 for the same model"* — and the acceptance rule is *"`./coli bench` score within noise of the CPU run, or a perplexity on a fixed text"* (`docs/benchmarks.md:77`). The dense-int4 ablation is published with its cost: int8 29.1 GB / 2.25 tok/s / ppl 4.85 → all-int4 18.8 GB / 3.72 tok/s / ppl 5.02 (**+3.5% perplexity**) (`docs/qwen36.md:299-301`).

**Correctness harness:** `c/tests` holds **503 entries** including 17 fixtures — `glm52_replay_python.json`, `glm52_replay_smoke.json`, `gguf_dequant_golden.npz`, `olmoe_quantize_row_golden.npz`, `swiftlet_qwen36_35b_hashes.json`, hostile-weight tests (`test_qwen36_hostile_weights.py`), RSS regression (`bench_load_tq_peak_rss.c`), and fuzzers (`fuzz_rans.c`). README:510-514: *"Every engine is checked in CI against its model's reference implementation on a tiny fixture."*

---

## 12. Discrepancies found (Pass 2, for authenticity)

These are **narrowings**, not corrections of fact. Nothing in the README was found false.

1. **"An expert's three matrices are read in one `pread`"** (`README.md:494`).
   Code: one `st_read_raw` for the merged weight slab **plus** one `st_read_f32` for the scales (`qwen36.c:2694` + `:2700`, `:2725` + `:2726`).
   → Precise form: *one pread for all three matrices, plus a small second read for the quantization scales.* The weight blob is >99% of the bytes, so the "never wait for the disk twice" intent holds.

2. **"cached LRU per-layer, with a PILOT prefetch thread"** (`qwen36.c:14-15`).
   Verified, but PILOT is **one worker thread per process** (`ensure_pilot_worker_started`, `qwen36.c:1062-1067`, guarded by `pilot_m`), not one per layer; it serves a 4096-entry queue under a single mutex (`:953-955`), and *"PILOT queues up to 128 per layer"* (`:2866`).

3. **"The RAM figures" in `setup_catalog.py` are measured constants, not computed.**
   The file says so itself (`setup_catalog.py:19-28`); the computed answer always comes from `resource_plan.py` after download. Anyone architecting on top of this should treat `setup_catalog.py` as a **hand-tuned cache of measurements** with a comment pointing at its source doc — and should keep that comment alive, because that is the only thing making the table auditable.

4. **`-march` is not on by default everywhere.** `ARCH=native` is opt-in (`Makefile:93-101`); on arm64 clang it is deliberately omitted (`Makefile:52`). A rebuild assuming `-march=native` will silently differ from CI/release binaries.

5. **"No Python at runtime"** (`README.md:520`) means no Python in the *compute* path. `coli serve`'s API gateway *is* Python (`c/openai_server.py`, `c/mcp_server.py`) — in front of the engine, not in it.

6. **Italian comments are load-bearing.** `st.h`, `resource_plan.py`, `colibri.c` and others carry original design rationale in Italian (e.g. `resource_plan.py:1577-1579`: *"Come pesano DAVVERO in RAM … il pianificatore serve a rispondere 'ci sta?', non 'quanto pesa il file'"* — *how much they really weigh in RAM … the planner exists to answer 'does it fit?', not 'how heavy is the file?'*). A grep-only pass over English comments misses most of the "why".

---

## 13. Why Qwen3.6-35B specifically runs so well on one machine

Putting it together for the model in question (catalog entry `qwen36-35b`, `setup_catalog.py:66-71`):

1. **23.1 GB download, but only 3.5 GB is always resident** (`dense_gb=3.5`) — embedding, all projections, norms, router, shared expert, lm_head.
2. **It is a 3B-active MoE** (`-A3B`): per token only 3B parameters' worth of routed experts actually run, so only those need to be hot.
3. **25% of its layers are DeltaNet (recurrent linear attention)** — no growing KV there (`qwen36.c:1-10`).
4. **Expert weights are int4 gs64 in one slab per expert** → one read per expert, no unpack at load when the shared kernel is on (`qwen36.c:2694-2701`, `expert_ffn.h:5-11`).
5. **`ram_min=10 GB / ram_good=20 GB`** (`setup_catalog.py:70`) means: at 10 GB the trunk plus a few experts per layer fit; at 20 GB you are at the measured "every expert cached, peak RSS 17 GB" point (`setup_catalog.py:68-69`).
6. **Per-layer LRU + `.coli_usage` pins** keep the experts *your* prompts use resident, so the working set converges on your workload rather than on a theoretical uniform distribution.
7. **PILOT prefetches layer n+1 at a measured 71.6% hit on the prediction** while layer n computes, so most disk reads are already done.
8. If you have an iGPU, **Vulkan adds a third tier and a single-submission layer chain**: 6.0 → 8.0 (tier) → 9.9 tok/s (tier + chain) on a Radeon 780M. With CUDA, 30 tok/s.
9. **`DIRECT=1` and `COLI_MODEL_MIRROR`** are the two knobs that trade on your specific hardware: +34% and +37.5% respectively where they apply.

---

## 14. Observations relevant to the next architecture pass

*Stated as verified observations about the current code, not as a design proposal — architecture work is deliberately out of scope for this document.*

1. **The planner's expert-cost model is a median per layer** (`resource_plan.py:1551-1555`) — correct for uniform families, and `qwen38` is explicitly switched to `max` because heterogeneous dtypes break the median assumption. Any family with heterogeneous expert sizes must be added to that branch or its `cap` will be optimistic.
2. **`cap` is a single global knob** (`resource_plan.py:3132`) applied to every layer — but routing heat is strongly per-layer non-uniform (that is what `.coli_usage` records). The tier *uses* per-layer heat; the *planner* does not.
3. **PILOT is single-threaded behind one 4096-slot mutex** (`qwen36.c:953-955`) shared with the demand-load path — `qwen36.c:2882` notes *"sotto lock: qui arrivano anche i thread del PILOT"*. Under heavy miss rates, that lock is a contention point by construction.
4. **`CACHE_ROUTE` (routing-side) and PILOT (weight-side) are independent levers with an explicit warning that the first changes model output** (`CACHE_ROUTE.md:9-10`). Any new placement policy should inherit that split: *placement-only* changes are safe by default; *routing* changes are opt-in.
5. **The `tier.h` promotion rule is shared by every tier** (`tier.h:6-8`) and its comments encode two past bugs (counter saturation, ping-pong). New tiers should extend that header rather than reimplement the rule.
6. **The README's own research table (`README.md:612-620`) lists six open questions with the experiment still needed for each** — including *"held-out, cross-session A/Bs"* for learned pins and *"per-stage profiles and one-variable A/Bs"* for CPU/GPU overlap. That table is the project's own backlog, and it is the right place to start.

---

## 15. Source index

**Core mechanism:** `README.md:179-180, 472-519, 579-589` · `c/qwen36.c:1-19, 785-786, 851-924, 953-969, 1045-1067, 2642-2727, 2844-2966` · `c/st.h:1-6, 47, 273-285, 294-358, 379, 1045, 1055, 1091, 1170` · `c/tier.h:6-27` · `c/expert_store.h:40-47` · `c/route_trace.h:1-35`

**Compute:** `c/expert_ffn.h:1-70` · `c/quant.h` · `c/Makefile:52, 92, 99-101, 111-112, 126, 145, 171-194`

**Overlap / prefetch:** `c/deepseek_v4_internal.h:20-24` · `c/kimi_k3.c:1876` · `c/glm_chain.h:641-642, 667, 966-967` · `c/qwen36.c:924, 3552, 3627, 5411`

**GPU:** `c/vk_chain.h:1-40` · `c/vk_tier.c` · `c/qwen36_tier.c` · `c/vk_kvsplit.h` · `c/resource_plan.py:3077-3102`

**Attention / KV:** `c/colibri.c:499` · `c/kv_prefix.h:1, 112, 123` · `c/kv_persist.h` · `c/kv_fp8.h` · `c/kv_tq.h`

**Sizing:** `c/setup_catalog.py:1-64, 198-258` · `c/resource_plan.py:1520-1600, 3060-3270`

**Speculation:** `docs/speculative.md:130-142, 172-223` · `docs/qwen36.md:120`

**Measured numbers:** `docs/qwen36.md:95-146, 299-304, 390-392` · `docs/qwen36-cuda-tier.md:248` · `docs/multidisk.md:90` · `docs/tuning.md:186-187` · `docs/ENVIRONMENT.md:89` · `docs/benchmarks.md:72-77` · `docs/CACHE_ROUTE.md:1-22`

**Tests:** `c/tests/` (503 entries, `c/tests/fixtures/` = 17 fixtures)

---

*Compiled 2026-10-26 from two independent audit passes over the working tree. Line numbers refer to the files as they stood on that date; re-verify after any refactor that shifts line offsets.*
