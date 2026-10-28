/**
 * M11 — a deliberately tiny, *safe* markdown subset for chat replies.
 *
 * Models answer in markdown: ```fenced``` code, ## headings, --- rules,
 * - bullet lists, **bold**, `inline code`. Rendering those as literal
 * characters is exactly the "responses aren't readable" flaw this
 * milestone fixes. The renderer therefore:
 *
 * - only ever produces text nodes and a handful of elements — **no**
 *   `dangerouslySetInnerHTML`, so a model can never inject markup;
 * - never throws on partial input: replies arrive by stream, so a fence can
 *   be open mid-sentence (an unterminated ``` renders as a code block that
 *   closes itself when more text arrives);
 * - keeps the prose itself byte-for-byte. Only *structural markers* (the
 *   ``` fences, `#` prefixes, `---` rules, `- ` bullets) leave the text,
 *   because they become elements — the words they marked are all still in
 *   the DOM, so tests that read `textContent` still see the reply.
 */

/** A run of prose split into plain/bold/code segments. */
export interface Inline {
  kind: "text" | "strong" | "code";
  text: string;
}

/** A chunk of the reply, ready to render. */
export type Block =
  | { kind: "code"; lang: string; text: string }
  | { kind: "heading"; level: number; text: string }
  | { kind: "rule" }
  | { kind: "list"; items: string[] }
  | { kind: "prose"; text: string };

const FENCE = /^(\s*)```(\S*)\s*$/;
/** `# H` … `###### H`; the space is optional (`##Usage` still counts). */
const HEADING = /^(#{1,6})(?:\s+(.*))?$/;
/**
 * Setext underline: `Title\n======` (H1) or `Title\n------` (H2) — the very
 * form codellama opens with ("Rate Limiter and Request Broker
 * Implementation / ====..."). Needs a real title line above; a lone
 * `------` after a blank line is a thematic break instead (RULE below).
 */
const SETEXT = /^\s*(=+|-{2,})\s*$/;
/** A line that is nothing but one punctuation char repeated ≥3 times. */
const RULE = /^\s*([-*_])\1{2,}\s*$/;
/** `- item`, `* item`, `+ item` — never `**bold**` (no space after `*`). */
const BULLET = /^[-*+]\s+(.*)$/;

/** Turn one run of prose lines into heading/rule/list/prose blocks. */
function proseRun(lines: string[], out: Block[]): void {
  let text: string[] = [];
  let items: string[] | null = null;
  const flushText = () => {
    if (text.length > 0) out.push({ kind: "prose", text: text.join("\n") });
    text = [];
  };
  const flushList = () => {
    if (items !== null) out.push({ kind: "list", items });
    items = null;
  };

  for (const line of lines) {
    const heading = HEADING.exec(line);
    if (heading) {
      flushText();
      flushList();
      out.push({
        kind: "heading",
        level: heading[1].length,
        text: (heading[2] ?? "").trim(),
      });
      continue;
    }
    const setext = SETEXT.exec(line);
    if (setext && text.length > 0 && text[text.length - 1].trim() !== "") {
      // `Title` + `====`/`----` directly under it → the title becomes the
      // heading; anything before it flushes as prose first.
      const title = text.pop() as string;
      flushText();
      flushList();
      out.push({
        kind: "heading",
        level: setext[1][0] === "=" ? 1 : 2,
        text: title.trim(),
      });
      continue;
    }
    if (RULE.test(line)) {
      flushText();
      flushList();
      out.push({ kind: "rule" });
      continue;
    }
    const bullet = BULLET.exec(line);
    if (bullet) {
      flushText();
      if (items === null) items = [];
      items.push(bullet[1]);
      continue;
    }
    flushList();
    text.push(line);
  }
  flushText();
  flushList();
}

/**
 * Split a reply into blocks by line: fences first (they own their lines
 * wholesale), then headings/rules/lists inside the prose runs.
 */
export function splitBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const out: Block[] = [];
  let prose: string[] = [];
  let code: { lang: string; lines: string[] } | null = null;

  const flushProse = () => {
    if (prose.length > 0) {
      proseRun(prose, out);
      prose = [];
    }
  };
  const flushCode = (c: { lang: string; lines: string[] }) => {
    out.push({ kind: "code", lang: c.lang, text: c.lines.join("\n") });
  };

  for (const line of lines) {
    const fence = FENCE.exec(line);
    if (code === null) {
      if (fence) {
        flushProse();
        code = { lang: fence[2] ?? "", lines: [] };
      } else {
        prose.push(line);
      }
    } else if (fence) {
      // a ``` line closes the block (``` or ```lang both terminate)
      flushCode(code);
      code = null;
    } else {
      code.lines.push(line);
    }
  }
  if (code !== null) flushCode(code); // streamed reply cut off mid-block
  flushProse();
  return out;
}

/**
 * Split one prose block on the inline subset. Bold spans never cross a line
 * and code spans never cross a backtick — anything half-finished is plain
 * text, which is exactly what the reader should see while it streams.
 */
export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const re = /(\*\*[^*\n]+\*\*|`[^`\n]+`)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ kind: "text", text: text.slice(last, at) });
    const token = m[0];
    if (token.startsWith("**")) {
      out.push({ kind: "strong", text: token.slice(2, -2) });
    } else {
      out.push({ kind: "code", text: token.slice(1, -1) });
    }
    last = at + token.length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}
