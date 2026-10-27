import { describe, expect, it } from "vitest";
import { isStockLocalHost } from "@/lib/host";

/**
 * The Start button may only appear for a stock local Ollama — anything
 * else (QA stand-in ports, remote hosts, TLS) would spawn a server that
 * could never flip the status, i.e. a lie. Every case the fleet produces
 * is pinned here.
 */
describe("isStockLocalHost", () => {
  it.each([
    "http://127.0.0.1:11434",
    "http://localhost:11434",
    "http://127.0.0.1:11434/",
    "  http://127.0.0.1:11434  ",
  ])("accepts the stock local host %s", (host) => {
    expect(isStockLocalHost(host)).toBe(true);
  });

  it.each([
    "http://127.0.0.1:1", // OLLAMA_HOST pointing nowhere (QA 3102)
    "http://127.0.0.1:11443", // QA stand-in (pull)
    "http://127.0.0.1:11445", // QA stand-in (models)
    "http://localhost:11435", // right host, wrong port
    "https://127.0.0.1:11434", // TLS — not what `ollama serve` would give
    "http://192.168.1.10:11434", // remote machine
    "http://example.com:11434", // remote name
    "127.0.0.1:11434", // no scheme
    "http://127.0.0.1", // no port
    "",
    "not a url",
  ])("rejects %s", (host) => {
    expect(isStockLocalHost(host)).toBe(false);
  });
});
