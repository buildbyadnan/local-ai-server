import type { Metadata } from "next";
import Link from "next/link";
import { allModels, modelsInTier, tiers } from "@/data/models";

export const metadata: Metadata = {
  title: "Model directory — Local AI Server",
  description:
    "Every Llama model explained in plain English: what it is, what it's good for, its flaws, and how later models improved on it.",
};

export default function LlamaDirectory() {
  return (
    <div className="dwrap">
      <div className="dpanel">
        <div className="dnav">
          <Link href="/" className="dback">
            ← Back to chat
          </Link>
          <span className="dcrumb">
            <Link href="/">Local AI Server</Link>
            <span className="dcrumbsep">/</span>Models
          </span>
        </div>

        <span className="dtier">
          {allModels.length} models · 3 size groups
        </span>
        <h1 className="dh1">The Llama model directory</h1>
        <p className="dtag">
          Every Llama model Meta ever released, explained in plain English — no
          jargon. Pick a model below to read what it is, why it was made, what
          it&apos;s genuinely good at, where it falls short, and how later
          models fixed those problems.
        </p>

        {tiers.map((tier) => {
          const models = modelsInTier(tier.id);
          return (
            <section className="tblock" key={tier.id}>
              <h2>{tier.label}</h2>
              <p>{tier.blurb}</p>
              <div className="tgrid">
                {models.map((m) => (
                  <Link
                    className="tcard"
                    href={`/llama/${m.slug}`}
                    prefetch
                    key={m.slug}
                  >
                    <b>{m.name}</b>
                    <p>{m.tagline}</p>
                    <span className="go">Read the guide →</span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
