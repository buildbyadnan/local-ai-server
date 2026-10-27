import { describe, expect, it } from "vitest";
import { isValidTag } from "@/lib/ollama";

/**
 * Tag validation is the only thing standing between a request body and the
 * upstream JSON we build: the shape must be a
 * lowercase Ollama registry tag, never a path or a content-injection
 * attempt. Rule: `^[a-z0-9][a-z0-9._/-]{0,127}(?::[a-z0-9._-]{1,64})?$`.
 */
describe("isValidTag", () => {
  const valid = [
    "llama3.1:8b",
    "llama3.2:latest",
    "llama4:maverick",
    "llama3.2-vision:11b",
    "qwen2.5:7b",
    "nomic-embed-text",
    "library/model-name",
    "no-such-model:1b", // shape-valid; existence is Ollama's job
    "a",
    "a".repeat(128),
    "a".repeat(128) + ":" + "b".repeat(64),
  ];

  const invalid: unknown[] = [
    "",
    "../../etc",
    "/etc/passwd",
    "LLAMA3:8B", // uppercase base
    "llama3:8B", // uppercase suffix — registry tags are lowercase
    "tag:UPPER",
    "llama 3",
    "llama3:8b:extra", // second colon
    "model:",
    "-leading-dash",
    "_leading-underscore",
    "a".repeat(129), // base over 128 chars
    "a".repeat(128) + ":" + "b".repeat(65), // suffix over 64 chars
    "a\nb",
    "a\tb",
    null,
    undefined,
    42,
    {},
    ["llama3:8b"],
  ];

  it.each(valid)("accepts %s", (tag) => {
    expect(isValidTag(tag)).toBe(true);
  });

  it.each(invalid.map((value) => [JSON.stringify(value) ?? "undefined", value]))(
    "rejects %s",
    (_label, value) => {
      expect(isValidTag(value)).toBe(false);
    },
  );

  it("narrows the accepted value to a string", () => {
    const value: unknown = "llama3.1:8b";
    if (isValidTag(value)) {
      expect(value.toUpperCase()).toBe("LLAMA3.1:8B");
    } else {
      throw new Error("expected the tag to validate");
    }
  });
});
