//! NDJSON (newline-delimited JSON) decoding for Ollama streaming responses.
//!
//! Ollama streams are a sequence of JSON objects, one per line, terminated by
//! `\n`. A single logical line can arrive split across multiple network chunks,
//! and multiple lines can arrive in one chunk. This module buffers the raw byte
//! stream and yields one parsed [`StreamChunk`] per complete line — without
//! pulling in `tokio-util`.

use anyhow::{anyhow, Result};
use bytes::BytesMut;
use futures_util::{Stream, StreamExt};

use crate::ollama::types::StreamChunk;

/// Wrap a raw HTTP byte stream (e.g. `reqwest::Response::bytes_stream()`) and
/// turn it into a stream of parsed [`StreamChunk`]s, one per NDJSON line.
///
/// Parsing stops at the first malformed line, which is surfaced as an `Err`.
/// The stream ends (`None`) when the underlying byte stream is exhausted.
pub fn decode_ndjson<S>(src: S) -> impl Stream<Item = Result<StreamChunk>> + Send
where
    S: Stream<Item = reqwest::Result<bytes::Bytes>> + Send + 'static,
{
    // Pin-box the source so it is `Unpin` (required by `StreamExt::next`),
    // regardless of whether the caller's stream is.
    let src = Box::pin(src);
    // State: (source, byte buffer, source-exhausted flag).
    futures_util::stream::unfold((src, BytesMut::new(), false), |(mut src, mut buffer, mut eof)| async move {
        loop {
            // If we already have a full line buffered, emit it and keep the rest.
            if let Some(newline) = buffer.iter().position(|&b| b == b'\n') {
                let line_bytes = buffer.split_to(newline + 1);
                let line = std::str::from_utf8(&line_bytes[..newline]).unwrap_or("").trim();
                if line.is_empty() {
                    continue; // tolerate blank lines / stray newlines
                }
                let item = match serde_json::from_str::<StreamChunk>(line) {
                    Ok(chunk) => Ok(chunk),
                    Err(e) => Err(anyhow!("malformed NDJSON line ({e}): {line}")),
                };
                return Some((item, (src, buffer, eof)));
            }

            if eof {
                // Source is done. Flush any trailing line that lacked a final
                // newline; otherwise end cleanly.
                let line = std::str::from_utf8(&buffer).unwrap_or("").trim().to_string();
                if line.is_empty() {
                    return None;
                }
                buffer.clear();
                let item = match serde_json::from_str::<StreamChunk>(&line) {
                    Ok(chunk) => Ok(chunk),
                    Err(e) => Err(anyhow!("malformed NDJSON line ({e}): {line}")),
                };
                return Some((item, (src, buffer, eof)));
            }

            // Otherwise pull more bytes from the network.
            match src.next().await {
                Some(Ok(bytes)) => buffer.extend_from_slice(&bytes),
                Some(Err(e)) => return Some((Err(anyhow!("stream read error: {e}")), (src, buffer, eof))),
                None => eof = true, // loop again to flush any trailing line
            }
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use bytes::Bytes;
    use futures_util::StreamExt;

    /// Build an owned, `'static` item stream of `reqwest::Result<Bytes>` from
    /// raw string parts (copies the data so nothing borrows `parts`).
    fn byte_stream(parts: &[&str]) -> impl Stream<Item = reqwest::Result<Bytes>> + Send + 'static {
        let owned: Vec<Bytes> = parts
            .iter()
            .map(|p| Bytes::copy_from_slice(p.as_bytes()))
            .collect();
        futures_util::stream::iter(owned.into_iter().map(|b| Ok::<Bytes, reqwest::Error>(b)))
    }

    async fn collect(parts: &[&str]) -> Vec<StreamChunk> {
        decode_ndjson(byte_stream(parts))
            .map(|r| r.unwrap())
            .collect()
            .await
    }

    #[tokio::test]
    async fn decodes_one_object_per_line() {
        let chunks = collect(&[r#"{"response":"Hel"}"#, "\n", r#"{"response":"lo"}"#, "\n", r#"{"done":true}"#, "\n"]).await;
        assert_eq!(chunks.len(), 3);
        assert_eq!(chunks[0].text(), "Hel");
        assert_eq!(chunks[1].text(), "lo");
        assert!(chunks[2].done);
    }

    #[tokio::test]
    async fn reassembles_lines_split_across_chunks() {
        // A single logical line broken across two network chunks.
        let chunks = collect(&[r#"{"resp"#, r#"onse":"abc"}"#, "\n"]).await;
        assert_eq!(chunks.len(), 1);
        assert_eq!(chunks[0].text(), "abc");
    }

    #[tokio::test]
    async fn handles_many_lines_in_one_chunk() {
        let chunks = collect(&[concat!(r#"{"response":"a"}"#, "\n", r#"{"response":"b"}"#, "\n", r#"{"done":true}"#, "\n")]).await;
        assert_eq!(chunks.len(), 3);
        assert_eq!(chunks[0].text(), "a");
        assert_eq!(chunks[1].text(), "b");
        assert!(chunks[2].done);
    }

    #[tokio::test]
    async fn skips_blank_lines() {
        let chunks = collect(&["\n\n", r#"{"response":"x"}"#, "\n\n"]).await;
        assert_eq!(chunks.len(), 1);
        assert_eq!(chunks[0].text(), "x");
    }

    #[tokio::test]
    async fn errors_on_malformed_json() {
        // Box-pin so we can call `.next()` directly (the decoded stream is not
        // `Unpin` on its own).
        let mut s = Box::pin(decode_ndjson(byte_stream(&[r#"{"response":"x"}"#, "\n", "{not json}\n"])));
        let first = s.next().await.unwrap().unwrap();
        assert_eq!(first.text(), "x");
        let bad = s.next().await.unwrap();
        assert!(bad.is_err());
    }

    #[tokio::test]
    async fn tolerates_trailing_line_without_newline() {
        let chunks = collect(&[r#"{"response":"y"}"#, "\n", r#"{"done":true}"#]).await;
        assert_eq!(chunks.len(), 2);
        assert!(chunks[1].done);
    }
}
