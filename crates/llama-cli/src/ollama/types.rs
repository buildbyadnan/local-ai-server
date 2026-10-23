//! Typed serde (de)serialization for the Ollama HTTP API.
//!
//! These structs mirror the JSON that Ollama's `/api/*` endpoints accept and
//! return. Only the fields we actually use are modeled; unknown fields are
//! ignored by serde by default, so this stays forward-compatible.

use serde::{Deserialize, Serialize};

/// A single chat message (`/api/chat`).
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

impl ChatMessage {
    pub fn user(content: impl Into<String>) -> Self {
        Self { role: "user".to_string(), content: content.into() }
    }
    pub fn assistant(content: impl Into<String>) -> Self {
        Self { role: "assistant".to_string(), content: content.into() }
    }
}

/// Request body for `POST /api/chat`.
#[derive(Debug, Clone, Serialize)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,
}

/// Request body for `POST /api/generate`.
#[derive(Debug, Clone, Serialize)]
pub struct GenerateRequest {
    pub model: String,
    pub prompt: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub system: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,
}

/// The `message` object embedded in a streaming `/api/chat` chunk.
#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
pub struct StreamMessage {
    pub content: String,
}

/// One NDJSON line yielded while streaming `/api/generate` or `/api/chat`.
///
/// A single struct covers both endpoints: `generate` populates `response`,
/// `chat` populates `message.content`. `done` marks the terminal line.
#[derive(Debug, Clone, Deserialize, PartialEq, Eq, Default)]
pub struct StreamChunk {
    #[serde(default)]
    pub done: bool,
    /// `/api/generate` incremental text.
    #[serde(default)]
    pub response: Option<String>,
    /// `/api/chat` incremental message.
    #[serde(default)]
    pub message: Option<StreamMessage>,
    /// Populated by Ollama on error responses.
    #[serde(default)]
    pub error: Option<String>,
}

impl StreamChunk {
    /// The incremental text for this chunk, regardless of which endpoint
    /// produced it. Returns `""` for control-only chunks.
    pub fn text(&self) -> &str {
        if let Some(r) = &self.response {
            return r.as_str();
        }
        if let Some(m) = &self.message {
            return m.content.as_str();
        }
        ""
    }
}

/// Response body for `GET /api/tags` (list local models).
#[derive(Debug, Clone, Deserialize)]
pub struct ListResponse {
    #[serde(default)]
    pub models: Vec<ModelInfo>,
}

/// A model installed in the local Ollama library.
#[derive(Debug, Clone, Deserialize)]
pub struct ModelInfo {
    pub name: String,
    #[serde(default)]
    pub size: Option<u64>,
    #[serde(default)]
    pub details: Option<ModelDetails>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ModelDetails {
    #[serde(default)]
    pub family: Option<String>,
    #[serde(default)]
    pub parameter_size: Option<String>,
    #[serde(default)]
    pub quantization_level: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generate_request_serializes_with_optional_system() {
        let req = GenerateRequest {
            model: "llama3.1:8b".to_string(),
            prompt: "hi".to_string(),
            system: Some("be terse".to_string()),
            stream: Some(true),
        };
        let v = serde_json::to_value(&req).unwrap();
        assert_eq!(v["model"], "llama3.1:8b");
        assert_eq!(v["system"], "be terse");
        assert_eq!(v["stream"], true);
    }

    #[test]
    fn generate_request_omits_absent_system() {
        let req = GenerateRequest {
            model: "m".to_string(),
            prompt: "p".to_string(),
            system: None,
            stream: None,
        };
        let s = serde_json::to_string(&req).unwrap();
        assert!(!s.contains("system"));
        assert!(!s.contains("stream"));
    }

    #[test]
    fn stream_chunk_text_prefers_generate_then_chat() {
        let g: StreamChunk = serde_json::from_str(r#"{"response":"abc"}"#).unwrap();
        assert_eq!(g.text(), "abc");

        let c: StreamChunk =
            serde_json::from_str(r#"{"message":{"content":"xyz"}}"#).unwrap();
        assert_eq!(c.text(), "xyz");

        let d: StreamChunk = serde_json::from_str(r#"{"done":true}"#).unwrap();
        assert_eq!(d.text(), "");
        assert!(d.done);
    }

    #[test]
    fn model_info_parses_details() {
        let raw = r#"{
            "name":"llama3.1:8b",
            "size":4661224676,
            "details":{"family":"llama","parameter_size":"8.03B","quantization_level":"Q4_K_M"}
        }"#;
        let m: ModelInfo = serde_json::from_str(raw).unwrap();
        assert_eq!(m.name, "llama3.1:8b");
        let d = m.details.unwrap();
        assert_eq!(d.parameter_size.as_deref(), Some("8.03B"));
    }
}
