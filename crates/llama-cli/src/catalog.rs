//! Built-in catalog of open-source **Llama-family** models runnable via Ollama,
//! restricted to the **1B–30B** band. This is the single source of truth behind
//! the `guide` subcommand and the interactive recommender.
//!
//! Each entry documents, in plain English, what the model is **good at**, what
//! it is **not good for**, roughly how much RAM it needs, and when to pick it —
//! so users install the right model the first time.

use std::io::{self, Write};

use crate::ollama::types::ModelInfo;

/// Broad categories used by the interactive recommender.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UseCase {
    /// Fastest / runs on almost nothing.
    TinyFast,
    /// Everyday assistant: chat, writing, summarization.
    General,
    /// Writing and understanding code.
    Coding,
    /// Understanding images (screenshots, photos, documents).
    Vision,
}

/// One recommended model (all ≤ 30B).
pub struct Entry {
    /// The exact Ollama tag to `ollama pull` / pass to `--model`.
    pub tag: &'static str,
    /// Human-readable name.
    pub name: &'static str,
    /// Approximate parameter count, for display.
    pub params: &'static str,
    /// Rough memory footprint at a 4-bit (Q4) quantization, for display.
    pub ram: &'static str,
    /// `Text` or `Text + Image`.
    pub modality: &'static str,
    /// One-line summary.
    pub good_at: &'static str,
    /// Bullet list of strengths.
    pub good_for: &'static [&'static str],
    /// Bullet list of weaknesses / what to avoid it for.
    pub not_good_for: &'static [&'static str],
    /// Guidance on when to choose this model.
    pub when: &'static str,
    /// Primary category for the recommender.
    pub use_case: UseCase,
    /// Optional note about a lighter/heavier sibling, or `""`.
    pub alt: &'static str,
}

/// The catalog, ordered smallest → largest. Llama-family only, ≤ 30B.
pub const CATALOG: &[Entry] = &[
    Entry {
        tag: "llama3.2:1b",
        name: "Llama 3.2 1B",
        params: "1B",
        ram: "~1.3 GB",
        modality: "Text",
        good_at: "The smallest — runs on almost anything, even a Raspberry Pi.",
        good_for: &[
            "Basic Q&A and short summaries",
            "Rewriting / reformatting text",
            "Simple classification and tagging",
            "Very low-RAM or battery-powered devices",
        ],
        not_good_for: &[
            "Real conversation or reasoning",
            "Coding",
            "Anything you'd trust with an important decision",
        ],
        when: "You need something that runs on literally any machine and speed matters more than quality.",
        use_case: UseCase::TinyFast,
        alt: "For a bit more quality at still-tiny size, use llama3.2:3b instead.",
    },
    Entry {
        tag: "llama3.2:3b",
        name: "Llama 3.2 3B",
        params: "3B",
        ram: "~2.0 GB",
        modality: "Text",
        good_at: "The best small all-rounder — a practical helper that fits in ~2 GB.",
        good_for: &[
            "Following instructions",
            "Summarization",
            "Prompt rewriting",
            "Light tool use / routing",
            "Short, quick chats",
        ],
        not_good_for: &["Coding", "Complex reasoning", "Long, high-quality creative writing"],
        when: "You want a fast, lightweight assistant on a laptop that won't eat your RAM, and can accept occasional mistakes.",
        use_case: UseCase::TinyFast,
        alt: "Absolute minimum: llama3.2:1b (~1.3 GB).",
    },
    Entry {
        tag: "codellama:7b",
        name: "Code Llama 7B",
        params: "7B",
        ram: "~3.8 GB",
        modality: "Text",
        good_at: "Entry-level coding assistant from Meta's Code Llama family.",
        good_for: &["Code generation", "Fill-in-the-middle completion", "Explaining small snippets"],
        not_good_for: &["Large multi-file refactors", "General chat (llama3.1:8b is better)"],
        when: "You mostly want coding help and are tight on RAM.",
        use_case: UseCase::Coding,
        alt: "Stronger: codellama:13b (~8 GB).",
    },
    Entry {
        tag: "llama3.1:8b",
        name: "Llama 3.1 8B",
        params: "8B",
        ram: "~4.9 GB",
        modality: "Text",
        good_at: "The everyday workhorse — the best balance of quality and size. (Default.)",
        good_for: &[
            "Conversation and Q&A",
            "Writing and editing",
            "Coding assistance",
            "Summarization",
            "Light reasoning and tool use",
            "8 languages, up to 128K context",
        ],
        not_good_for: &["Cutting-edge reasoning (use a bigger/hosted model)", "Images (use Vision)"],
        when: "You want one solid model for most everyday tasks and have ~5 GB free. This is the default recommendation.",
        use_case: UseCase::General,
        alt: "Lighter: llama3.2:3b (~2 GB).",
    },
    Entry {
        tag: "llama3.2-vision:11b",
        name: "Llama 3.2 Vision 11B",
        params: "11B",
        ram: "~7.9 GB",
        modality: "Text + Image",
        good_at: "Understands images as well as text.",
        good_for: &[
            "Describing photos and screenshots",
            "Visual question answering",
            "Reading charts, slides, and documents",
            "Image-based reasoning",
        ],
        not_good_for: &["Pure text tasks (llama3.1:8b is cheaper)", "Video"],
        when: "You need to feed it images or scanned documents and ask questions about them.",
        use_case: UseCase::Vision,
        alt: "",
    },
    Entry {
        tag: "codellama:13b",
        name: "Code Llama 13B",
        params: "13B",
        ram: "~8 GB",
        modality: "Text",
        good_at: "Stronger coding than Code Llama 7B.",
        good_for: &["Harder code generation", "Code reasoning and debugging", "Fixing bugs"],
        not_good_for: &["Low-RAM machines (needs ~8 GB)", "Non-code tasks"],
        when: "You do serious coding and have ~8 GB to spare.",
        use_case: UseCase::Coding,
        alt: "Lighter: codellama:7b (~3.8 GB).",
    },
];

/// The tag used when the user has no strong preference.
pub const DEFAULT_TAG: &str = "llama3.1:8b";

/// The canonical recommendation for a given use-case.
pub fn recommend_for(use_case: UseCase) -> &'static Entry {
    let tag = match use_case {
        UseCase::TinyFast => "llama3.2:3b",
        UseCase::General => "llama3.1:8b",
        UseCase::Coding => "codellama:13b",
        UseCase::Vision => "llama3.2-vision:11b",
    };
    by_tag(tag).expect("recommendation tag missing from catalog")
}

/// Look up an entry by its Ollama tag.
pub fn by_tag(tag: &str) -> Option<&'static Entry> {
    CATALOG.iter().find(|e| e.tag == tag)
}

/// The tag family (`llama3.2:3b` -> `llama3.2`), used to match aliases such as
/// `llama3.2:latest` to a catalog entry.
fn family_of(tag: &str) -> &str {
    tag.split(':').next().unwrap_or(tag)
}

/// Parse a leading number out of a parameter string (`"3.2B"` -> `3.2`,
/// `"7B"` -> `7.0`). Returns `None` for anything unexpected.
fn parse_billions(s: &str) -> Option<f64> {
    let digits: String = s
        .chars()
        .take_while(|c| c.is_ascii_digit() || *c == '.')
        .collect();
    digits.parse().ok()
}

/// The catalog entry an installed model corresponds to, if any.
///
/// Matching is deliberately tolerant, because Ollama reports `parameter_size`
/// slightly differently across versions (e.g. `"3.2B"` vs `"3.21B"`):
///
/// 1. Exact tag match (`llama3.2:3b`), then
/// 2. Same tag family + parameter size within 25% of the entry's nominal size
///    (nearest match wins). This maps `llama3.2:latest` (3.2B) to the 3B entry,
///    while correctly *not* matching e.g. an installed `llama3.1:70b` (way off
///    of the 8B entry -> shows as not-in-catalog, per the ≤30B policy).
pub fn catalog_entry_for(installed: &ModelInfo) -> Option<&'static Entry> {
    if let Some(e) = by_tag(&installed.name) {
        return Some(e);
    }

    let family = family_of(&installed.name);
    let installed_n = installed
        .details
        .as_ref()
        .and_then(|d| d.parameter_size.as_deref())
        .and_then(parse_billions)?;

    CATALOG
        .iter()
        .filter(|e| family_of(e.tag) == family)
        .filter_map(|e| {
            let nominal = parse_billions(e.params)?;
            let rel = ((installed_n - nominal) / nominal).abs();
            Some((rel, e))
        })
        .filter(|(rel, _)| *rel <= 0.25)
        .min_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal))
        .map(|(_, e)| e)
}

/// Find an installed model that corresponds to a catalog entry.
pub fn find_installed<'a>(entry: &Entry, installed: &'a [ModelInfo]) -> Option<&'a ModelInfo> {
    installed
        .iter()
        .find(|m| catalog_entry_for(m).is_some_and(|e| e.tag == entry.tag))
}

/// Human-readable label for a use-case category.
fn use_case_label(uc: UseCase) -> &'static str {
    match uc {
        UseCase::TinyFast => "quick & light",
        UseCase::General => "general assistant",
        UseCase::Coding => "coding",
        UseCase::Vision => "images",
    }
}

/// Print the full catalog, in detail (the "man page").
pub fn print_guide() {
    println!("Llama models you can run locally via Ollama (1B–30B, Llama-family only)\n");
    println!("Each entry: what it's good at, what it's NOT good for, RAM, and when to pick it.\n");
    for e in CATALOG {
        println!("----------------------------------------------------------------");
        println!(
            "{} — {}  ({} params, {}, {}, best for: {})",
            e.tag,
            e.name,
            e.params,
            e.ram,
            e.modality,
            use_case_label(e.use_case)
        );
        println!();
        println!("  {}", e.good_at);
        println!();
        println!("  Good for:");
        for g in e.good_for {
            println!("    + {g}");
        }
        println!("  Not ideal for:");
        for n in e.not_good_for {
            println!("    - {n}");
        }
        println!();
        println!("  Pick this when: {}", e.when);
        if !e.alt.is_empty() {
            println!("  Note: {}", e.alt);
        }
        println!("  Install:  ollama pull {}", e.tag);
        println!();
    }
    println!("----------------------------------------------------------------");
    println!("Default pick: {DEFAULT_TAG}  (best quality-per-GB for most people)");
}

/// Print the compact catalog table.
pub fn print_catalog() {
    println!("Recommended Llama models (runnable via Ollama), 1B–30B band:\n");
    for e in CATALOG {
        println!("  {:<22} {:<24} {:<6} {}", e.tag, e.name, e.params, e.modality);
        println!("      RAM {}:  {}", e.ram, e.good_at);
        println!();
    }
    println!("Default: {DEFAULT_TAG}");
    println!("Run `guide` for a detailed, per-model breakdown.");
}

/// Interactively prompt the user to choose a model by number. Falls back to
/// [`DEFAULT_TAG`] on empty input or EOF.
pub fn pick_interactive() -> String {
    println!("Choose a model:\n");
    for (i, e) in CATALOG.iter().enumerate() {
        println!("  [{}] {:<22} {:<6} {}", i + 1, e.tag, e.params, e.good_at);
    }
    println!("\n  [Enter] default ({DEFAULT_TAG})");

    print!("\nEnter a number (1-{}): ", CATALOG.len());
    io::stdout().flush().ok();

    let mut line = String::new();
    match io::stdin().read_line(&mut line) {
        Ok(0) => DEFAULT_TAG.to_string(), // EOF
        Ok(_) => {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                return DEFAULT_TAG.to_string();
            }
            match trimmed.parse::<usize>() {
                Ok(n) if n >= 1 && n <= CATALOG.len() => CATALOG[n - 1].tag.to_string(),
                _ => {
                    eprintln!("Invalid choice; using default {DEFAULT_TAG}.");
                    DEFAULT_TAG.to_string()
                }
            }
        }
        Err(_) => DEFAULT_TAG.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn catalog_tags_are_unique() {
        for (i, a) in CATALOG.iter().enumerate() {
            for b in CATALOG.iter().skip(i + 1) {
                assert_ne!(a.tag, b.tag, "duplicate tag {}", a.tag);
            }
        }
    }

    #[test]
    fn every_catalog_model_is_at_most_30b() {
        // Guards the "max 30B" constraint. Parse the leading number of `params`
        // (e.g. "1B", "3B", "8B", "11B", "13B") and require <= 30.
        for e in CATALOG {
            let digits: String = e.params.chars().take_while(|c| c.is_ascii_digit()).collect();
            let n: u32 = digits.parse().unwrap_or_else(|_| panic!("bad params {}", e.params));
            assert!(n <= 30, "{} is {} params (>30B)", e.tag, e.params);
        }
    }

    #[test]
    fn default_tag_exists_in_catalog() {
        assert!(by_tag(DEFAULT_TAG).is_some());
    }

    #[test]
    fn every_use_case_has_a_recommendation() {
        for uc in [UseCase::TinyFast, UseCase::General, UseCase::Coding, UseCase::Vision] {
            let e = recommend_for(uc);
            assert!(by_tag(e.tag).is_some());
        }
    }

    #[test]
    fn recommendations_are_at_most_30b() {
        for uc in [UseCase::TinyFast, UseCase::General, UseCase::Coding, UseCase::Vision] {
            let e = recommend_for(uc);
            let digits: String = e.params.chars().take_while(|c| c.is_ascii_digit()).collect();
            let n: u32 = digits.parse().unwrap();
            assert!(n <= 30, "recommended {} is >30B", e.tag);
        }
    }

    #[test]
    fn by_tag_finds_known_and_misses_unknown() {
        assert!(by_tag("llama3.2:1b").is_some());
        assert!(by_tag("gpt-4o").is_none());
    }

    #[test]
    fn entries_are_nonempty() {
        for e in CATALOG {
            assert!(!e.tag.is_empty());
            assert!(!e.name.is_empty());
            assert!(!e.good_at.is_empty());
            assert!(!e.when.is_empty());
            assert!(!e.good_for.is_empty());
        }
    }

    #[test]
    fn catalog_entry_for_matches_by_param_size() {
        // Ollama versions report parameter_size slightly differently; both the
        // historical ("3.21B") and observed ("3.2B") forms must map llama3.2:latest
        // to the 3B catalog entry.
        for size in ["3.21B", "3.2B"] {
            let installed: ModelInfo = serde_json::from_str(&format!(
                r#"{{"name":"llama3.2:latest","details":{{"parameter_size":"{size}"}}}}"#
            ))
            .unwrap();
            let entry = catalog_entry_for(&installed).expect("should match 3B entry");
            assert_eq!(entry.tag, "llama3.2:3b", "for parameter_size={size}");
        }
    }

    #[test]
    fn catalog_entry_for_exact_tag_matches_without_details() {
        let installed: ModelInfo =
            serde_json::from_str(r#"{"name":"llama3.1:8b"}"#).unwrap();
        assert_eq!(catalog_entry_for(&installed).unwrap().tag, "llama3.1:8b");
    }

    #[test]
    fn catalog_entry_for_rejects_over_30b_and_unknown_models() {
        // An installed 70B must NOT be mapped onto any (≤30B) catalog entry.
        let big: ModelInfo = serde_json::from_str(
            r#"{"name":"llama3.1:70b","details":{"parameter_size":"70B"}}"#,
        )
        .unwrap();
        assert!(catalog_entry_for(&big).is_none());

        // Some other model family isn't ours at all.
        let other: ModelInfo = serde_json::from_str(
            r#"{"name":"qwen2.5:7b","details":{"parameter_size":"7.6B"}}"#,
        )
        .unwrap();
        assert!(catalog_entry_for(&other).is_none());
    }

    #[test]
    fn find_installed_matches_installed_alias() {
        let installed: Vec<ModelInfo> = vec![serde_json::from_str(
            r#"{"name":"llama3.2:latest","details":{"parameter_size":"3.2B"}}"#,
        )
        .unwrap()];
        let entry = by_tag("llama3.2:3b").unwrap();
        assert!(find_installed(entry, &installed).is_some());
        let other = by_tag("llama3.1:8b").unwrap();
        assert!(find_installed(other, &installed).is_none());
    }
}
