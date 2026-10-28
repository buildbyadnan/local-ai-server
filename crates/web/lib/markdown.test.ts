import { describe, expect, it } from "vitest";
import { parseInline, splitBlocks } from "@/lib/markdown";

/** A block that carries words (`rule` deliberately carries none). */
type Block = ReturnType<typeof splitBlocks>[number];
const textOf = (b: Block): string =>
  b.kind === "rule"
    ? ""
    : b.kind === "list"
      ? b.items.join("\n")
      : b.text;

/**
 * M11's renderer contract: fences become blocks, prose survives byte-for-byte
 * (so `textContent` checks still see the whole reply), and half-finished
 * markdown from a stream never throws or eats text.
 */
describe("splitBlocks", () => {
  it("keeps plain prose as one block with its line breaks", () => {
    const text = "line one\nline two\n\nline four";
    const [only] = splitBlocks(text);
    expect(only.kind).toBe("prose");
    expect(textOf(only)).toBe(text); // byte-for-byte — nothing lost
  });

  it("turns a fenced block into a code block with its language", () => {
    const text = "before\n```python\ndef f():\n    return 1\n```\nafter";
    const blocks = splitBlocks(text);
    expect(blocks.map((b) => b.kind)).toEqual(["prose", "code", "prose"]);
    expect(textOf(blocks[0])).toBe("before");
    expect(blocks[1]).toMatchObject({
      lang: "python",
      text: "def f():\n    return 1",
    });
    expect(textOf(blocks[2])).toBe("after");
  });

  it("closes an unterminated fence (streaming cut-off) instead of dropping it", () => {
    const blocks = splitBlocks("```js\nconst a = 1;\nconsole.log(a)");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ kind: "code", lang: "js" });
    expect(textOf(blocks[0])).toBe("const a = 1;\nconsole.log(a)");
  });

  it("survives a bare ``` with nothing after it", () => {
    const blocks = splitBlocks("```");
    expect(blocks).toEqual([{ kind: "code", lang: "", text: "" }]);
  });

  it("keeps indentation inside code (pre-wrap shows it)", () => {
    const [code] = splitBlocks("```\nif (a) {\n  b();\n}\n```").filter(
      (b) => b.kind === "code",
    );
    expect(code.text).toContain("\n  b();\n");
  });
});

describe("splitBlocks — headings, rules, lists", () => {
  it("turns ## lines into headings and keeps their text", () => {
    const blocks = splitBlocks("## Usage\nsome text\n### Details");
    expect(blocks.map((b) => b.kind)).toEqual(["heading", "prose", "heading"]);
    expect(blocks[0]).toMatchObject({ kind: "heading", level: 2, text: "Usage" });
    expect(blocks[2]).toMatchObject({ level: 3, text: "Details" });
  });

  it("turns a --- / *** / ___ line into a rule (when no title sits on it)", () => {
    expect(splitBlocks("a\n\n---\nb").map((b) => b.kind)).toEqual([
      "prose",
      "rule",
      "prose",
    ]);
    expect(splitBlocks("***")[0].kind).toBe("rule");
    // `a\n---` is a setext H2 in markdown — the dash under a title is a
    // title, not a separator
    expect(splitBlocks("a\n---\nb").map((b) => b.kind)).toEqual([
      "heading",
      "prose",
    ]);
    // a two-dash line on its own is just text, not a rule
    expect(splitBlocks("--")[0]).toMatchObject({ kind: "prose", text: "--" });
  });

  it("groups consecutive - / * / + lines into one list", () => {
    const blocks = splitBlocks("- one\n- two\nthree\n+ three-ish");
    expect(blocks.map((b) => b.kind)).toEqual(["list", "prose", "list"]);
    expect(blocks[0]).toMatchObject({ items: ["one", "two"] });
    expect(blocks[2]).toMatchObject({ items: ["three-ish"] });
  });

  it("does not mistake **bold** or code contents for a list/rule", () => {
    const blocks = splitBlocks("**bold first**\n```\n---\n- not a list\n```");
    expect(blocks.map((b) => b.kind)).toEqual(["prose", "code"]);
    expect(textOf(blocks[0])).toBe("**bold first**");
    expect((blocks[1] as { text: string }).text).toBe("---\n- not a list");
  });

  it("reads setext headings: Title + ==== (H1) and Title + ---- (H2)", () => {
    const h1 = splitBlocks("Rate Limiter and Request Broker Implementation\n" + "=".repeat(40) + "\n\nbody");
    expect(h1[0]).toMatchObject({ kind: "heading", level: 1 });
    expect(textOf(h1[0])).toBe("Rate Limiter and Request Broker Implementation");
    expect(h1.map((b) => b.kind)).toEqual(["heading", "prose"]); // blank line joins body

    const h2 = splitBlocks("Sub section\n-----------");
    expect(h2[0]).toMatchObject({ kind: "heading", level: 2, text: "Sub section" });
  });

  it("a ---- after a blank line stays a rule, not a heading", () => {
    const blocks = splitBlocks("para\n\n----\nnext");
    expect(blocks.map((b) => b.kind)).toEqual(["prose", "rule", "prose"]);
  });

  it("only the last line becomes the setext title", () => {
    const blocks = splitBlocks("first line\nsecond line\n===");
    expect(blocks.map((b) => b.kind)).toEqual(["prose", "heading"]);
    expect(textOf(blocks[0])).toBe("first line");
    expect(textOf(blocks[1])).toBe("second line");
  });

  it("treats a bare ## (no space, no title) as an empty heading", () => {
    const blocks = splitBlocks("##");
    expect(blocks[0]).toMatchObject({ kind: "heading", level: 2, text: "" });
  });
});

describe("parseInline", () => {
  it("splits bold and inline code from plain text", () => {
    expect(parseInline("a **b** c `d` e")).toEqual([
      { kind: "text", text: "a " },
      { kind: "strong", text: "b" },
      { kind: "text", text: " c " },
      { kind: "code", text: "d" },
      { kind: "text", text: " e" },
    ]);
  });

  it("leaves half-finished markdown as plain text (streaming)", () => {
    expect(parseInline("**bo")).toEqual([{ kind: "text", text: "**bo" }]);
    expect(parseInline("`co")).toEqual([{ kind: "text", text: "`co" }]);
  });

  it("never crosses a line boundary", () => {
    const parts = parseInline("**a\nb**");
    expect(parts).toEqual([{ kind: "text", text: "**a\nb**" }]);
  });

  it("returns one plain part when there is nothing to parse", () => {
    expect(parseInline("just text")).toEqual([
      { kind: "text", text: "just text" },
    ]);
  });
});
