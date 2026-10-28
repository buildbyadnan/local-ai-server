/**
 * Pure host rules shared by the server (which decides whether it may
 * spawn `ollama serve`) and the sidebar (which decides whether to show
 * the Start button at all). Kept dependency-free so the client bundle can
 * import it — `lib/ollama-admin.ts` must never reach the browser.
 */

/** What a stock local Ollama listens on (the CLI's own clap default). */
export const STOCK_HOST = "http://127.0.0.1:11434";

/**
 * Is `host` the default local Ollama this app could actually start?
 * A QA/remote `OLLAMA_HOST` (another port, another machine, TLS) must
 * never offer Start: spawning a stock server there wouldn't flip the
 * status and would be a lie.
 */
export function isStockLocalHost(host: string): boolean {
  const match = /^http:\/\/([^/:]+):(\d+)\/?$/.exec(host.trim());
  if (!match) return false;
  const [, name, port] = match;
  return (name === "127.0.0.1" || name === "localhost") && port === "11434";
}
