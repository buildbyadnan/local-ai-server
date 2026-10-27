import { describe, expect, it } from "vitest";
import { isLlamaModel } from "@/lib/family";

/**
 * The picker gate (§9 M6): every Llama variant this machine may have must
 * pass, and nothing else may — especially `gemma4:12b`, the fixture this
 * machine actually carries.
 */
describe("isLlamaModel", () => {
  it("accepts models whose family says llama", () => {
    expect(isLlamaModel("llama3.1:8b", ["llama", "text"])).toBe(true);
    expect(isLlamaModel("llama3.2:latest", ["llama"])).toBe(true);
    expect(isLlamaModel("llama4:maverick", ["llama", "vision"])).toBe(true);
    // codellama *is* a llama — Ollama reports family "llama" for it.
    expect(isLlamaModel("codellama:13b", ["llama", "code"])).toBe(true);
  });

  it("accepts a family string that merely contains llama (codellama, llama2…)", () => {
    expect(isLlamaModel("whatever:7b", ["codellama"])).toBe(true);
    expect(isLlamaModel("whatever:7b", ["LLaMA"])).toBe(true); // case-insensitive
    expect(isLlamaModel("whatever:7b", ["llava"])).toBe(false);
  });

  it("rejects the non-Llama families this machine has", () => {
    expect(isLlamaModel("gemma4:12b", ["gemma", "text"])).toBe(false);
    expect(isLlamaModel("qwen2.5:7b", ["qwen2", "text"])).toBe(false);
    expect(isLlamaModel("phi3:mini", ["phi3", "text"])).toBe(false);
    expect(isLlamaModel("mistral:7b", ["mistral", "text"])).toBe(false);
    expect(isLlamaModel("nomic-embed-text", ["nomic-embed-text"])).toBe(false);
  });

  it("falls back to the registry base name when no family data exists", () => {
    expect(isLlamaModel("llama3.1:8b")).toBe(true);
    expect(isLlamaModel("llama3.2:latest", [])).toBe(true);
    expect(isLlamaModel("codellama:34b", [])).toBe(true);
    expect(isLlamaModel("gemma4:12b")).toBe(false);
    expect(isLlamaModel("gemma4:12b", [])).toBe(false);
    expect(isLlamaModel("llava:7b")).toBe(false); // vision model, not a chat guide here
    expect(isLlamaModel("llamaring:1b")).toBe(false); // starts like one, isn't
    expect(isLlamaModel("my-llama-checkpoint")).toBe(false);
  });

  it("never throws on odd input", () => {
    expect(isLlamaModel("", [])).toBe(false);
    expect(isLlamaModel(":", null)).toBe(false);
  });
});
