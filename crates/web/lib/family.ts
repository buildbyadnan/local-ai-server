/**
 * Which installed models this app will let you chat with.
 *
 * The product is a *Llama* companion (CONNECTIVITY_PLAN §9 M6): the
 * guides, the pull buttons and the recommended defaults are all Llama
 * family, so a stray `gemma4:12b` on the machine must never appear in the
 * chat picker — while remaining visible (and deletable) under OLLAMA,
 * which is a truthful view of the machine, not a chat surface.
 *
 * Pure and dependency-free so both the client (picker, provider) and the
 * tests can use it.
 */

/**
 * Is `name` a Llama-family model?
 *
 * Ollama's `details.families` is authoritative when present (a list like
 * `["llama", "text"]` — codellama reports `llama` there too, because it
 * *is* one). Older/leaner servers may only send `details.family`, which
 * the caller folds into the same array. When we have no family data at
 * all we fall back to the registry base name — conservative: only
 * unmistakable Llama names pass, so an unknown-but-not-Llama model is
 * hidden from chat rather than offered by mistake.
 */
export function isLlamaModel(
  name: string,
  families?: readonly string[] | null,
): boolean {
  if (families && families.length > 0) {
    return families.some((family) => family.toLowerCase().includes("llama"));
  }
  const base = name.split(":")[0].toLowerCase();
  return /^(llama|codellama)([0-9._-]|$)/.test(base);
}
