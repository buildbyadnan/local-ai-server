# llama

**Run free, local AI models on your own computer — without knowing anything about AI.**

`llama` is a small, fast command-line tool that talks to the free
**[Ollama]** app and runs open-source **Llama-family models** (1B–30B parameters
only — nothing enormous). It tells you *which* model to install for what you
need, walks you through installing it, and then lets you chat with it.

- 🪶 **Tiny & fast** — a few-MB Rust binary, no Python, no C toolchain, no GPU required.
- 🎯 **Only Llama models, ≤ 30B** — a deliberately small, curated set so you don't drown in choices.
- 📖 **`llama guide`** — a man-page-style breakdown of every model: what it's *good at*, what it's *not* good for, and how much RAM it needs.

---

## Install (pick your OS)

### 🍎 macOS / 🐧 Linux

```bash
curl -fsSL https://raw.githubusercontent.com/buildbyadnan/local-ai-server/main/install.sh | bash
```

*(Or clone this repo and run `./install.sh`.)*

<details>
<summary>Prefer to download manually?</summary>

Grab the file for your machine from the
[Releases page](../../releases), open it, and move the `llama` file inside into
a folder that's on your `PATH` (e.g. `~/.local/bin`), then make it executable:

```bash
chmod +x llama
```

</details>

### 🪟 Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/buildbyadnan/local-ai-server/main/install.ps1 | iex
```

<details>
<summary>Prefer to download manually?</summary>

1. Download `llama-cli-x86_64-pc-windows-msvc.zip` from the
   [Releases page](../../releases).
2. Open the zip and copy `llama.exe` into a new folder, e.g.
   `C:\Users\you\AppData\Local\llama-cli`.
3. Add that folder to your **user `PATH`**: search Windows for
   *"Edit the environment variables"* → `PATH` → New → paste the folder path.
4. Open a **new** terminal and type `llama`.

</details>

> **You also need the free [Ollama] app** (<https://ollama.com/download>).
> Install it if you haven't — `llama` drives it, and Ollama does the actual AI
> computing on your machine.

---

## First run — just type `llama`

```console
$ llama

Welcome! This tool runs local Llama AI models through Ollama.

Models you already have:
  - llama3.2:latest               (3B, ~2.0 GB)  <- Llama 3.2 3B

What do you want to do?
  [1] Quick & light       (fastest; runs on almost any machine)
  [2] General assistant   (chat, writing, summaries)   <- most people
  [3] Coding              (write & explain code)
  [4] Images              (understand photos, screenshots, documents)

Enter 1-4 [default 2]:
```

Answer, and it recommends **exactly one model** (always ≤ 30B) and prints the
two commands you need:

```console
Recommended for you: llama3.1:8b  (Llama 3.1 8B)
  The everyday workhorse — the best balance of quality and size. (Default.)
  RAM needed: ~4.9 GB   Type: Text

Install it (one-time download):
  ollama pull llama3.1:8b

Then start chatting:
  llama chat -m llama3.1:8b
```

That's it. If you *already* have the recommended model, it skips the install
step and just tells you to start chatting.

---

## `llama guide` — the model manual

Not sure what each model is actually good for? Ask:

```console
$ llama guide
Llama models you can run locally via Ollama (1B–30B, Llama-family only)

----------------------------------------------------------------
llama3.1:8b — Llama 3.1 8B  (8B params, ~4.9 GB, Text, best for: general assistant)

  The everyday workhorse — the best balance of quality and size. (Default.)

  Good for:
    + Conversation and Q&A
    + Writing and editing
    + Coding assistance
    + Summarization
    ...
  Not ideal for:
    - Cutting-edge reasoning (use a bigger/hosted model)
    - Images (use Vision)

  Pick this when: You want one solid model for most everyday tasks and
  have ~5 GB free. This is the default recommendation.
  Install:  ollama pull llama3.1:8b
...
```

Every entry tells you **what it's good for**, **what it's NOT good for**, the
RAM it needs, and when to pick it — so you install the right model the first time.

---

## All models at a glance (Llama family, 1B–30B only)

| Ollama tag | Params | RAM | Best for |
|---|---|---|---|
| `llama3.2:1b` | 1B | ~1.3 GB | The absolute minimum — Raspberry Pi, very old laptops |
| `llama3.2:3b` | 3B | ~2.0 GB | Quick & light assistant that fits in ~2 GB |
| `codellama:7b` | 7B | ~3.8 GB | Coding when RAM is tight |
| **`llama3.1:8b`** | **8B** | **~4.9 GB** | **Default all-rounder: chat, writing, coding, summaries** |
| `llama3.2-vision:11b` | 11B | ~7.9 GB | Understanding images, screenshots, and documents |
| `codellama:13b` | 13B | ~8 GB | More serious coding and debugging |

**Don't want to think about it?** The default answer is **`llama3.1:8b`** —
best capability per GB for almost everyone:

```bash
ollama pull llama3.1:8b
llama chat -m llama3.1:8b
```

Run `llama guide` for the full per-model manual.

---

## All commands

### `llama` — this tool (every subcommand)

| Command | What it does |
|---|---|
| `llama` | Guided recommender (no command = same as `recommend`): checks Ollama, shows what you have, asks what you want to do, recommends a model. |
| `llama recommend` | The guided recommender, spelled out explicitly. |
| `llama guide` | Detailed manual for every model: good at / not good for / RAM. |
| `llama catalog` | Compact table of all recommended models. |
| `llama chat -m <model>` | Interactive chat. Type `exit` (or Ctrl-D) to quit. Omit `-m` to pick from a list. |
| `llama run -m <model> "your prompt"` | One-shot question, answer streamed. Omit the prompt to read it from stdin. |
| `llama models` | List models you already have installed. |
| `llama ping` | Check that Ollama is reachable. |
| `llama help` | List commands (same as `llama --help`). `llama help chat` shows help for one command. |

### Flags (work with any command)

| Flag | What it does |
|---|---|
| `-m, --model <tag>` | Which model to use (e.g. `llama3.1:8b`). `run`/`chat` ask you interactively if omitted. |
| `--system "<text>"` | Set the model's persona/rules for `run` and `chat`. |
| `--host <url>` | Point at a different Ollama server (default `http://127.0.0.1:11434`). Env: `OLLAMA_HOST`. |
| `-h, --help` | Show help — also per-command: `llama chat --help`. |
| `-V, --version` | Print the version. |

### Ollama commands you'll need (the free app `llama` drives)

| Command | What it does |
|---|---|
| `ollama serve` | Start the Ollama server (Linux; on macOS/Windows just open the Ollama app). |
| `ollama pull <tag>` | Download a model once — e.g. `ollama pull llama3.1:8b`. |
| `ollama list` | Show installed models (same info as `llama models`). |
| `ollama rm <tag>` | Delete a model to free disk space — e.g. `ollama rm codellama:13b`. |

<details>
<summary>Examples</summary>

```bash
# One-shot with a system prompt:
llama run -m llama3.1:8b --system "You are terse." "Explain DNS in 3 sentences"

# Pipe a prompt in:
echo "Write a haiku about rust" | llama run -m llama3.1:8b

# Interactive chat with the tiny model:
llama chat -m llama3.2:3b

# Point at an Ollama on another machine (or set OLLAMA_HOST):
llama --host http://192.168.1.10:11434 ping

# Get help for any command:
llama run --help
```

</details>

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Ollama isn't reachable` | Start Ollama: run the **Ollama** app (or `ollama serve` on Linux), then retry. |
| `model '...' not found` | You haven't installed it yet: `ollama pull <tag>` (the recommender prints the exact command). |
| `llama: command not found` | Open a **new** terminal (PATH changes need a restart), or check the installer output above. |
| Want a different Ollama server | Pass `--host <url>` or set the `OLLAMA_HOST` environment variable. |
| My machine is slow / out of RAM | Use a smaller model: `llama3.2:3b` (~2 GB) or `llama3.2:1b` (~1.3 GB). |

---

## For developers: build from source

The shipped binaries are built with **Cargo**; **Bazel** (via `bazelisk`) is
also supported and reads the *same* `Cargo.toml`/`Cargo.lock`, so the two can
never drift.

```bash
# --- Cargo ---
cargo build --release          # binary at target/release/llama-cli
cargo test --release           # 23 unit tests, fully offline

# --- Bazel (pinned toolchain, fully hermetic) ---
bazel build -c opt //crates/llama-cli:llama-cli   # binary at bazel-bin/crates/llama-cli/llama-cli
bazel test //crates/llama-cli:llama-cli_test
```

> After changing dependencies in `crates/llama-cli/Cargo.toml`, run
> `cargo build` and then `CARGO_BAZEL_REPIN=1 bazel build //...` to re-pin Bazel.

### Web UI (`crates/web`)

A local-only Next.js chat interface for the same Ollama backend — a side crate
that never ships. It builds with **pnpm**, not Bazel (`.bazelignore` keeps it
out of `//...`), and CI lints + builds it alongside the Cargo matrix:

```bash
cd crates/web
pnpm install
pnpm dev        # http://localhost:3000
```

See [`crates/web/README.md`](crates/web/README.md) for the full tour.

### Project layout

```
llama/
├── Cargo.toml / Cargo.lock      # single source of truth for dependencies
├── MODULE.bazel                 # bzlmod: rules_rust + pinned Rust toolchain
├── .bazelversion / .bazelrc     # pins Bazel 9.3.1
├── install.sh / install.ps1     # prebuilt-binary installers (mac/linux, windows)
├── .github/workflows/
│   ├── ci.yml                   # tests on Linux/macOS/Windows + web lint/build
│   └── release.yml              # builds release binaries on a v* tag
└── crates/
    ├── llama-cli/
    │   ├── Cargo.toml / BUILD.bazel
    │   └── src/
    │       ├── main.rs          # subcommand dispatch + guided recommender
    │       ├── cli.rs           # clap definitions
    │       ├── catalog.rs       # the ≤30B model catalog, guide, and recommender
    │       └── ollama/
    │           ├── types.rs     # serde structs for Ollama's /api/* JSON
    │           ├── client.rs    # HTTP client (ping/list/generate/chat)
    │           └── stream.rs    # NDJSON → async stream of chunks
    └── web/                     # Next.js UI (pnpm; ignored by Bazel)
        ├── app/                 # routes + globals.css
        ├── components/          # Sidebar / CenterChat / AiModule
        ├── data/                # chat history + the 19-model guide registry
        └── proxy.ts             # real-404 gate for unknown model slugs
```

### Publishing a release (maintainers)

Pushing a `v*` tag is the **only** step that builds and publishes the prebuilt
binaries the installers download:

```bash
git push origin main   # push your commits first

git tag v0.1.0         # name the release (any v<number> works)
git push origin v0.1.0 # triggers release.yml: builds 5 binaries (~5 min)
```

When the **Actions** → *release* workflow is green, the release (with all
assets) appears at `https://github.com/buildbyadnan/local-ai-server/releases`,
and `releases/latest/download/...` — used by `install.sh` / `install.ps1` —
starts working.

### Design notes

- **No TLS on purpose.** Ollama is plain HTTP on `localhost`, so `reqwest` is
  built with `default-features = false` + `json`/`stream` — no OpenSSL, no
  `ring`, no C compiler needed anywhere. To reach an Ollama behind HTTPS, add
  `"rustls-tls"` to the `reqwest` features in `Cargo.toml` (pulls in a C dep).
- **Hermetic Bazel builds.** The Rust toolchain (`1.98.0`) and every crate are
  pinned; Bazel downloads its own compiler instead of using yours.
- **Releases.** Pushing a tag like `v0.1.0` triggers `release.yml`, which builds
  macOS (arm64 + Intel), Linux (x64 + arm64), and Windows x64 binaries and
  attaches them to a GitHub Release — which is what the installers download.

---

## License

[MIT](LICENSE)

[Ollama]: https://ollama.com
