//! `llama` — run local, open-source Llama models (≤30B) through a locally-running
//! Ollama server. A thin, fast HTTP client; all heavy inference is done by Ollama.

mod catalog;
mod cli;
mod ollama;

use std::io::{self, Read, Write};

use anyhow::{bail, Context, Result};
use clap::Parser;
use futures_util::StreamExt;

use cli::{Cli, Command};
use ollama::client::OllamaClient;
use ollama::types::{ChatMessage, ChatRequest, GenerateRequest, StreamChunk};

#[tokio::main]
async fn main() -> Result<()> {
    // Behave like a normal Unix tool when piped into `head`/`less`/`q`:
    // die quietly on a closed pipe instead of panicking.
    #[cfg(unix)]
    unsafe {
        libc::signal(libc::SIGPIPE, libc::SIG_DFL)
    };

    let cli = Cli::parse();
    let client = OllamaClient::new(cli.host.clone());

    match &cli.command {
        // No subcommand -> guided first-run recommender.
        None => cmd_recommend(&client).await,
        Some(Command::Ping) => cmd_ping(&client).await,
        Some(Command::Models) => cmd_models(&client).await,
        Some(Command::Catalog) => {
            catalog::print_catalog();
            Ok(())
        }
        Some(Command::Guide) => {
            catalog::print_guide();
            Ok(())
        }
        Some(Command::Recommend) => cmd_recommend(&client).await,
        Some(Command::Run { model, prompt, system }) => {
            cmd_run(&client, model.clone(), prompt.clone(), system.clone()).await
        }
        Some(Command::Chat { model, system }) => {
            cmd_chat(&client, model.clone(), system.clone()).await
        }
    }
}

/// Guided first-run: check Ollama, show what's installed, ask what the user
/// wants to do, and recommend a single ≤30B model to install.
async fn cmd_recommend(client: &OllamaClient) -> Result<()> {
    println!("Welcome! This tool runs local Llama AI models through Ollama.\n");

    // 1. Is Ollama running?
    if let Err(e) = client.ping().await {
        eprintln!("Ollama isn't reachable yet.\n  {e}");
        eprintln!("\nOnce it's running, re-run this command. See the README for install steps.");
        return Ok(());
    }

    // 2. What does the user already have?
    let installed = client.list_models().await.unwrap_or_default();
    if installed.is_empty() {
        println!("You have no models installed yet.\n");
    } else {
        println!("Models you already have:");
        for m in &installed {
            match catalog::catalog_entry_for(m) {
                Some(e) => println!("  - {:<24} ({}, {})  <- {}", m.name, e.params, e.ram, e.name),
                None => println!("  - {}", m.name),
            }
        }
        println!();
    }

    // 3. What do they want to do?
    println!("What do you want to do?");
    println!("  [1] Quick & light       (fastest; runs on almost any machine)");
    println!("  [2] General assistant   (chat, writing, summaries)   <- most people");
    println!("  [3] Coding              (write & explain code)");
    println!("  [4] Images              (understand photos, screenshots, documents)");
    print!("\nEnter 1-4 [default 2]: ");
    io::stdout().flush().ok();

    let mut line = String::new();
    io::stdin().read_line(&mut line).ok();
    let use_case = match line.trim() {
        "1" => catalog::UseCase::TinyFast,
        "3" => catalog::UseCase::Coding,
        "4" => catalog::UseCase::Vision,
        _ => catalog::UseCase::General,
    };

    // 4. Recommend.
    let entry = catalog::recommend_for(use_case);
    println!("\nRecommended for you: {}  ({})", entry.tag, entry.name);
    println!("  {}", entry.good_at);
    println!("  RAM needed: {}   Type: {}", entry.ram, entry.modality);
    if !entry.alt.is_empty() {
        println!("  Note: {}", entry.alt);
    }
    println!();

    // 5. Installed already, or need to pull?
    if catalog::find_installed(entry, &installed).is_some() {
        println!("You already have it installed. Start chatting:");
        println!("  llama chat -m {}", entry.tag);
    } else {
        println!("Install it (one-time download):");
        println!("  ollama pull {}", entry.tag);
        println!("\nThen start chatting:");
        println!("  llama chat -m {}", entry.tag);
    }
    println!("\nCompare every model in detail with:  llama guide");
    Ok(())
}

/// `ping` — verify Ollama is reachable.
async fn cmd_ping(client: &OllamaClient) -> Result<()> {
    client.ping().await?;
    println!("OK — Ollama is reachable at {}.", client.base());
    Ok(())
}

/// `models` — list models installed in the local Ollama library.
async fn cmd_models(client: &OllamaClient) -> Result<()> {
    let models = client.list_models().await?;
    if models.is_empty() {
        println!("No models installed yet at {}.", client.base());
        println!("Run `llama` for a recommendation, or `ollama pull {}`.", catalog::DEFAULT_TAG);
        return Ok(());
    }
    println!("Models installed at {}:\n", client.base());
    for m in &models {
        let size = m
            .size
            .map(|b| format_bytes(b))
            .unwrap_or_else(|| "unknown".to_string());
        let d = m.details.as_ref();
        let params = d.and_then(|x| x.parameter_size.clone()).unwrap_or_default();
        let family = d.and_then(|x| x.family.clone()).unwrap_or_default();
        let quant = d.and_then(|x| x.quantization_level.clone()).unwrap_or_default();

        // Mark models that match our recommended catalog (by tag or param size).
        let rec = if catalog::catalog_entry_for(m).is_some() {
            "  [in catalog]"
        } else {
            ""
        };

        let mut detail = Vec::new();
        if !params.is_empty() {
            if family.is_empty() {
                detail.push(params);
            } else {
                detail.push(format!("{params} ({family})"));
            }
        }
        if !quant.is_empty() {
            detail.push(quant);
        }

        println!("  {:<28} {:>10}  {}{}", m.name, size, detail.join(", "), rec);
    }
    Ok(())
}

/// `run` — one-shot completion with streaming output.
async fn cmd_run(
    client: &OllamaClient,
    model: Option<String>,
    prompt: Option<String>,
    system: Option<String>,
) -> Result<()> {
    let model = resolve_model(model)?;
    let prompt = match prompt {
        Some(p) => p,
        None => read_all_stdin().context("Failed to read the prompt from stdin")?,
    };
    if prompt.trim().is_empty() {
        bail!(
            "No prompt given.\n\
             Usage: llama run -m {model} \"your question here\"\n\
             Or pipe it in:  echo \"your question\" | llama run -m {model}"
        );
    }

    eprint!("[{model}] ");
    io::stderr().flush().ok();

    let req = GenerateRequest {
        model: model.clone(),
        prompt,
        system,
        stream: Some(true),
    };

    let mut stream = client
        .generate_stream(&req)
        .await
        .map_err(|e| install_hint(e, &model))?;
    while let Some(item) = stream.next().await {
        let chunk: StreamChunk = item?;
        if let Some(err) = chunk.error {
            bail!("Ollama error: {err}");
        }
        let text = chunk.text();
        if !text.is_empty() {
            print!("{text}");
            io::stdout().flush().ok();
        }
    }
    println!();
    Ok(())
}

/// `chat` — interactive multi-turn REPL.
async fn cmd_chat(client: &OllamaClient, model: Option<String>, system: Option<String>) -> Result<()> {
    let model = resolve_model(model)?;
    println!("Chat with [{model}] at {}. Type a message, or 'exit' to quit.\n", client.base());

    let mut history: Vec<ChatMessage> = Vec::new();
    if let Some(sys) = system {
        history.push(ChatMessage { role: "system".to_string(), content: sys });
    }

    loop {
        print!("> ");
        io::stdout().flush().ok();

        let mut line = String::new();
        let n = io::stdin().read_line(&mut line).context("Failed to read input")?;
        if n == 0 {
            println!(); // EOF (Ctrl-D)
            break;
        }
        let input = line.trim();
        if input.is_empty() {
            continue;
        }
        if matches!(input, "exit" | "quit" | "q") {
            break;
        }

        history.push(ChatMessage::user(input));

        let req = ChatRequest {
            model: model.clone(),
            messages: history.clone(),
            stream: Some(true),
        };

        let mut stream = client
            .chat_stream(&req)
            .await
            .map_err(|e| install_hint(e, &model))?;
        let mut reply = String::new();
        while let Some(item) = stream.next().await {
            let chunk: StreamChunk = item?;
            if let Some(err) = chunk.error {
                bail!("Ollama error: {err}");
            }
            let text = chunk.text();
            if !text.is_empty() {
                print!("{text}");
                io::stdout().flush().ok();
                reply.push_str(text);
            }
        }
        println!();
        history.push(ChatMessage::assistant(reply));
    }
    Ok(())
}

/// Resolve the model tag: use the provided one, otherwise prompt interactively.
fn resolve_model(model: Option<String>) -> Result<String> {
    match model {
        Some(m) if !m.trim().is_empty() => Ok(m.trim().to_string()),
        _ => Ok(catalog::pick_interactive()),
    }
}

/// If Ollama rejected a request because the model isn't installed, append the
/// exact command that fixes it (users hit this most often).
fn install_hint(err: anyhow::Error, model: &str) -> anyhow::Error {
    let msg = err.to_string();
    if msg.contains("not found") {
        anyhow::anyhow!(
            "The model '{model}' isn't installed yet.\n\
             Install it (one-time download) with:\n  ollama pull {model}"
        )
    } else {
        err
    }
}

/// Read all of stdin into a trimmed string.
fn read_all_stdin() -> Result<String> {
    let mut buf = String::new();
    io::stdin().read_to_string(&mut buf)?;
    Ok(buf.trim().to_string())
}

/// Human-readable byte size (SI-ish, for RAM/model sizes).
fn format_bytes(bytes: u64) -> String {
    const GB: f64 = 1_000_000_000.0;
    const MB: f64 = 1_000_000.0;
    let b = bytes as f64;
    if b >= GB {
        format!("{:.1} GB", b / GB)
    } else if b >= MB {
        format!("{:.1} MB", b / MB)
    } else {
        format!("{bytes} B")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn format_bytes_scales() {
        assert_eq!(format_bytes(500), "500 B");
        assert_eq!(format_bytes(2_500_000), "2.5 MB");
        assert_eq!(format_bytes(4_661_224_676), "4.7 GB");
    }

    #[test]
    fn resolve_model_prefers_provided_tag() {
        let m = resolve_model(Some("  llama3.2:3b  ".to_string())).unwrap();
        assert_eq!(m, "llama3.2:3b");
    }
}
