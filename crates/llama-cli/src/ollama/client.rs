//! A minimal, typed HTTP client for a locally-running Ollama server.
//!
//! Ollama exposes a REST API on `http://127.0.0.1:11434` by default. This
//! client speaks plain HTTP (no TLS) and reuses a single [`reqwest::Client`] for
//! connection pooling. Streaming endpoints return an async [`Stream`] of
//! [`StreamChunk`]s via the NDJSON decoder in [`stream`].

use std::pin::Pin;

use anyhow::{bail, Context, Result};
use futures_util::Stream;

use crate::ollama::stream::decode_ndjson;
use crate::ollama::types::{ChatRequest, GenerateRequest, ListResponse, ModelInfo, StreamChunk};

/// A boxed, heap-pinned stream of decoded chunks. `Pin<Box<..>>` is `Unpin`,
/// so callers can call `.next()` on it directly without pinning first.
pub type ChunkStream = Pin<Box<dyn Stream<Item = Result<StreamChunk>> + Send>>;

/// Client for the Ollama HTTP API.
pub struct OllamaClient {
    http: reqwest::Client,
    base: String,
}

impl OllamaClient {
    /// Create a client pointed at `base` (e.g. `http://127.0.0.1:11434`).
    pub fn new(base: impl Into<String>) -> Self {
        let base = base.into();
        let base = base.trim_end_matches('/').to_string();
        Self { http: reqwest::Client::new(), base }
    }

    /// The base URL, with no trailing slash.
    pub fn base(&self) -> &str {
        &self.base
    }

    /// Check whether an Ollama server is reachable. Returns `Ok(())` on any HTTP
    /// response, and `Err` with a helpful message if the connection fails.
    pub async fn ping(&self) -> Result<()> {
        let url = format!("{}/api/tags", self.base);
        self.http
            .get(&url)
            .send()
            .await
            .with_context(|| unreachable_message(&url))?;
        Ok(())
    }

    /// List models installed in the local Ollama library (`GET /api/tags`).
    pub async fn list_models(&self) -> Result<Vec<ModelInfo>> {
        let url = format!("{}/api/tags", self.base);
        let res = self
            .http
            .get(&url)
            .send()
            .await
            .with_context(|| unreachable_message(&url))?;
        let status = res.status();
        if !status.is_success() {
            bail!("Ollama returned {status} for GET /api/tags");
        }
        let parsed: ListResponse = res
            .json()
            .await
            .context("Failed to parse /api/tags response")?;
        Ok(parsed.models)
    }

    /// Stream a one-shot completion (`POST /api/generate`).
    pub async fn generate_stream(
        &self,
        req: &GenerateRequest,
    ) -> Result<ChunkStream> {
        let body = serde_json::to_value(req).context("Failed to encode generate request")?;
        self.post_stream("/api/generate", &body).await
    }

    /// Stream a multi-turn chat completion (`POST /api/chat`).
    pub async fn chat_stream(
        &self,
        req: &ChatRequest,
    ) -> Result<ChunkStream> {
        let body = serde_json::to_value(req).context("Failed to encode chat request")?;
        self.post_stream("/api/chat", &body).await
    }

    /// POST `body` to `path` and decode the NDJSON response stream.
    async fn post_stream(
        &self,
        path: &str,
        body: &serde_json::Value,
    ) -> Result<ChunkStream> {
        let url = format!("{}{}", self.base, path);
        let res = self
            .http
            .post(&url)
            .json(body)
            .send()
            .await
            .with_context(|| unreachable_message(&url))?;

        let status = res.status();
        if !status.is_success() {
            let detail = res.text().await.unwrap_or_default();
            bail!("Ollama returned {status} for POST {path}: {detail}");
        }

        Ok(Box::pin(decode_ndjson(res.bytes_stream())))
    }
}

fn unreachable_message(url: &str) -> String {
    format!(
        "Cannot reach Ollama at {url}.\n  \
         Is it running? Start it with `ollama serve` (or open the Ollama app),\n  \
         or point elsewhere with `--host` / the OLLAMA_HOST environment variable."
    )
}
