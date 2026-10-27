"use client";

import type { ReactNode } from "react";
import { parseInline, splitBlocks, type Inline } from "@/lib/markdown";

/** Inline segments → elements (plain text, <strong>, <code>). */
function inline(parts: Inline[]): ReactNode {
  return parts.map((part, j) =>
    part.kind === "strong" ? (
      <strong key={j}>{part.text}</strong>
    ) : part.kind === "code" ? (
      <code className="ci" key={j}>
        {part.text}
      </code>
    ) : (
      part.text
    ),
  );
}

/**
 * M11 — renders a model (or user) reply readably: ```fenced``` blocks become
 * code blocks, ## headings, --- rules and - lists become real elements,
 * **bold** and `code` become inline elements. Everything is a React node
 * built from plain strings — no HTML parsing, no injection — and every word
 * still lands in the DOM for tests and copy-paste.
 */
export default function ChatText({ text }: { text: string }): ReactNode {
  return (
    <>
      {splitBlocks(text).map((block, i) => {
        switch (block.kind) {
          case "code":
            return (
              <pre className="cblk" key={i} data-lang={block.lang || undefined}>
                {block.text}
              </pre>
            );
          case "heading":
            return (
              <span className="chd" data-level={block.level} key={i}>
                {inline(parseInline(block.text))}
              </span>
            );
          case "rule":
            return <hr className="crule" key={i} />;
          case "list":
            return (
              <ul className="clist" key={i}>
                {block.items.map((item, j) => (
                  <li key={j}>{inline(parseInline(item))}</li>
                ))}
              </ul>
            );
          default:
            return <span key={i}>{inline(parseInline(block.text))}</span>;
        }
      })}
    </>
  );
}
