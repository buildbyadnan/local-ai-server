#!/usr/bin/env bash
#
# llama — one-line installer for macOS and Linux.
#
# Downloads the prebuilt `llama` binary for your OS/arch from this repo's
# GitHub Releases, installs it to ~/.local/bin, and checks for Ollama.
#
#   curl -fsSL https://raw.githubusercontent.com/OWNER/REPO/main/install.sh | bash
#
# (Or clone the repo and run ./install.sh .)
#
set -euo pipefail

# --- Which GitHub repo to fetch the release from? ---
# Auto-detected from the git remote if you're inside a clone; otherwise set
# LLAMA_REPO=owner/name before running.
if [ -n "${LLAMA_REPO:-}" ]; then
  REPO="$LLAMA_REPO"
elif git remote get-url origin >/dev/null 2>&1; then
  url="$(git remote get-url origin)"
  REPO="$(printf '%s' "$url" | sed -E 's#(git@github\.com:|https://github\.com/)##; s#\.git$##')"
else
  echo "ERROR: couldn't detect the GitHub repo."
  echo "  Set it and re-run, e.g.:  LLAMA_REPO=yourname/llama ./install.sh"
  exit 1
fi

# --- Detect OS + arch -> Rust target triple ---
os="$(uname -s)"
arch="$(uname -m)"
case "$os" in
  Darwin) os_name="apple-darwin" ;;
  Linux)  os_name="unknown-linux-gnu" ;;
  *) echo "ERROR: unsupported OS '$os'. (On Windows, use install.ps1.)"; exit 1 ;;
esac
case "$arch" in
  x86_64|amd64)       arch_name="x86_64" ;;
  arm64|aarch64)      arch_name="aarch64" ;;
  *) echo "ERROR: unsupported architecture '$arch'."; exit 1 ;;
esac
target="${arch_name}-${os_name}"

asset="llama-cli-${target}.tar.gz"
url="https://github.com/${REPO}/releases/latest/download/${asset}"

echo "Downloading ${asset} from ${REPO} ..."
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

if ! curl -fsSL "$url" -o "$tmp/$asset"; then
  echo "ERROR: could not download ${url}"
  echo "  - Is the repo '${REPO}' public with a published release?"
  echo "  - Platform '${target}' may not have a prebuilt binary yet."
  echo "  You can build from source instead: see 'Build from source' in the README."
  exit 1
fi
tar -xzf "$tmp/$asset" -C "$tmp"

# --- Install ---
dest="${LLAMA_INSTALL_DIR:-$HOME/.local/bin}"
mkdir -p "$dest"
install -m 0755 "$tmp/llama" "$dest/llama"
echo "Installed -> ${dest}/llama"

# --- PATH hint if needed ---
case ":$PATH:" in
  *":$dest:"*) : ;;
  *) echo ""
     echo "NOTE: '${dest}' is not on your PATH. Add it to your shell profile:"
     echo "      export PATH=\"${dest}:\$PATH\"" ;;
esac

# --- Ollama check + next steps ---
echo ""
if command -v ollama >/dev/null 2>&1; then
  echo "Ollama found. Next steps:"
  echo "  ollama serve &          # start Ollama (skip if the app is already open)"
  echo "  llama                   # get a model recommendation (installs the right one)"
  echo "  llama chat -m llama3.1:8b"
else
  echo "Ollama not found. Install it first:  https://ollama.com/download"
  echo "Then re-run:  ollama serve &   and   llama"
fi
