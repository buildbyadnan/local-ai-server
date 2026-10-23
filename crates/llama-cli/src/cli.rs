//! Command-line interface definition (clap).

use clap::{Parser, Subcommand};

/// Run local, open-source Llama models (≤ ~30B) through a locally-running
/// Ollama server.
///
/// Run with no arguments for a guided first-run that checks Ollama, sees what
/// you already have, and recommends the right model to install.
#[derive(Debug, Parser)]
#[command(
    name = "llama",
    version,
    about = "Run local Llama models (≤30B) through Ollama",
    long_about = None,
    arg_required_else_help = false
)]
pub struct Cli {
    /// Ollama server base URL.
    #[arg(
        long,
        global = true,
        default_value = "http://127.0.0.1:11434",
        env = "OLLAMA_HOST",
        help = "Ollama server URL (env: OLLAMA_HOST)"
    )]
    pub host: String,

    /// With no subcommand, runs the guided recommender.
    #[command(subcommand)]
    pub command: Option<Command>,
}

#[derive(Debug, Subcommand)]
pub enum Command {
    /// Check that an Ollama server is reachable.
    Ping,

    /// List models already installed in the local Ollama library.
    Models,

    /// Print the built-in catalog of recommended Llama models (1B–30B).
    Catalog,

    /// Detailed, per-model guide: what each model is good / not good for.
    Guide,

    /// Get a recommendation for which model to install (also the default).
    Recommend,

    /// Send a single prompt and stream the answer.
    Run {
        /// Model tag (e.g. `llama3.1:8b`). Omit to choose from the catalog.
        #[arg(short = 'm', long)]
        model: Option<String>,

        /// The prompt. Reads from stdin if omitted.
        prompt: Option<String>,

        /// Optional system prompt.
        #[arg(long)]
        system: Option<String>,
    },

    /// Interactive multi-turn chat.
    Chat {
        /// Model tag (e.g. `llama3.1:8b`). Omit to choose from the catalog.
        #[arg(short = 'm', long)]
        model: Option<String>,

        /// Optional system prompt.
        #[arg(long)]
        system: Option<String>,
    },
}
