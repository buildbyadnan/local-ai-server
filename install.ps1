# llama - one-line installer for Windows (PowerShell).
#
# Downloads the prebuilt `llama.exe` from this repo's GitHub Releases,
# installs it to %LOCALAPPDATA%\llama-cli, adds it to your user PATH,
# and checks for Ollama.
#
#   irm https://raw.githubusercontent.com/OWNER/REPO/main/install.ps1 | iex
#
# (Or clone the repo and run:  powershell -ExecutionPolicy Bypass -File install.ps1)
#
# NOTE: run this in PowerShell, not cmd. To open PowerShell: press Win+R,
#       type `powershell`, press Enter.

$ErrorActionPreference = "Stop"

# --- Which GitHub repo to fetch the release from? ---
# Auto-detected from the git remote if you're inside a clone; otherwise set
# $env:LLAMA_REPO = "owner/name" before running.
$Repo = $env:LLAMA_REPO
if (-not $Repo) {
    try {
        $url = (git remote get-url origin 2>$null)
        if ($url) {
            $Repo = $url -replace '^git@github\.com:', '' -replace '^https://github\.com/', '' -replace '\.git$', ''
        }
    } catch { }
}
if (-not $Repo) {
    Write-Error "Could not detect the GitHub repo. Set it and re-run, e.g.: `$env:LLAMA_REPO = 'yourname/llama'; .\install.ps1"
    exit 1
}

# --- Target triple (Windows x64 only) ---
$Target = "x86_64-pc-windows-msvc"
$Asset  = "llama-cli-$Target.zip"
$Url    = "https://github.com/$Repo/releases/latest/download/$Asset"

Write-Host "Downloading $Asset from $Repo ..."

$Tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("llama-install-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $Tmp -Force | Out-Null

try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $Url -OutFile (Join-Path $Tmp $Asset) -UseBasicParsing
} catch {
    Write-Error ("Could not download {0}`n  - Is the repo '{1}' public with a published release?`n  You can build from source instead: see 'Build from source' in the README." -f $Url, $Repo)
    exit 1
}

Expand-Archive -Path (Join-Path $Tmp $Asset) -DestinationPath $Tmp -Force

# --- Install ---
$Dest = if ($env:LLAMA_INSTALL_DIR) { $env:LLAMA_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA "llama-cli" }
New-Item -ItemType Directory -Path $Dest -Force | Out-Null
Copy-Item (Join-Path $Tmp "llama.exe") (Join-Path $Dest "llama.exe") -Force
Write-Host "Installed -> $Dest\llama.exe"

# --- Add to user PATH if needed ---
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$Dest*") {
    [Environment]::SetEnvironmentVariable("Path", "$UserPath;$Dest", "User")
    Write-Host ""
    Write-Host "Added $Dest to your user PATH."
    Write-Host "Open a NEW terminal window, then continue below."
}

# --- Ollama check + next steps ---
Write-Host ""
if (Get-Command ollama -ErrorAction SilentlyContinue) {
    Write-Host "Ollama found. Next steps (in a NEW terminal):"
    Write-Host "  llama                       # get a model recommendation (installs the right one)"
    Write-Host "  llama chat -m llama3.1:8b   # start chatting"
} else {
    Write-Host "Ollama not found. Install it first:  https://ollama.com/download"
    Write-Host "Then run:  llama"
}
