import { afterEach, describe, expect, it } from "vitest";
import { removeModel } from "@/lib/ollama-admin";

/**
 * `ollama rm` executes a real binary on this machine, so the two gates in
 * front of it must hold without ever reaching exec. (The happy path is
 * deliberately untested here: it would delete a model from the developer's
 * actual Ollama — the CDP suite covers it against a confirmed-Cancel UI.)
 */
describe("removeModel guard rails", () => {
  afterEach(() => {
    delete process.env.OLLAMA_HOST;
  });

  it("refuses when this app is pointed at a stand-in or remote host", async () => {
    process.env.OLLAMA_HOST = "http://127.0.0.1:11443"; // QA "pull" stand-in
    const result = await removeModel("llama3.1:8b"); // a perfectly valid tag
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain("127.0.0.1:11434");
  });

  it("refuses a malformed tag before any binary is looked up", async () => {
    process.env.OLLAMA_HOST = "http://127.0.0.1:11434"; // stock local
    for (const tag of ["../../etc/passwd", "MODEL:UPPER", "", "a;rm -rf /"]) {
      const result = await removeModel(tag);
      expect(result.ok).toBe(false);
    }
  });
});
