import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allModels, getModel, modelsInTier, tiers } from "@/data/models";

/**
 * The route needs `params` high in the tree to decide 404 vs content *before*
 * streaming starts (a mid-stream notFound() can only return 200 + noindex).
 * That blocks the shared App Shell, so the segment opts out of instant-nav
 * validation per Next.js docs: "Allow blocking route" (instant = false).
 */
export const instant = false;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return allModels.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const model = getModel(slug);
  if (!model) return { title: "Model not found — Local AI Server" };
  return {
    title: `${model.name} — explained simply — Local AI Server`,
    description: model.tagline,
  };
}

function rich(text: string, keyBase: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={`${keyBase}-${i}`}>{part}</strong>
    ) : (
      <span key={`${keyBase}-${i}`}>{part}</span>
    ),
  );
}

export default async function ModelPage({ params }: PageProps) {
  const { slug } = await params;
  const model = getModel(slug);
  if (!model) notFound();

  const tier = tiers.find((t) => t.id === model.tier)!;
  const siblings = modelsInTier(model.tier).filter((m) => m.slug !== model.slug);

  const sectionHead = (n: number, title: string) => (
    <h2>
      <span className="n" aria-hidden="true">
        {n}
      </span>
      {title}
    </h2>
  );

  return (
    <div className="dwrap">
      <article className="dpanel">
        <div className="dnav">
          <Link href="/llama" className="dback">
            ← All models
          </Link>
          <span className="dcrumb">
            <Link href="/">Local AI Server</Link>
            <span className="dcrumbsep">/</span>
            <Link href="/llama">Models</Link>
            <span className="dcrumbsep">/</span>
            {model.name}
          </span>
        </div>

        <span className="dtier">{tier.label} tier</span>
        <h1 className="dh1">{model.name}</h1>
        <p className="dtag">{model.tagline}</p>

        <div className="dchips">
          <span className="dchip">
            Released: <b>{model.released}</b>
          </span>
          <span className="dchip">
            Size: <b>{model.sizeLabel}</b>
          </span>
          <span className="dchip">
            Remembers: <b>{model.contextLabel}</b>
          </span>
        </div>

        <section className="dsec">
          {sectionHead(1, "What is this model?")}
          {model.whatIsIt.map((p, i) => (
            <p key={i}>{rich(p, `what-${i}`)}</p>
          ))}
        </section>

        <section className="dsec">
          {sectionHead(2, "Why was it made?")}
          {model.whyMade.map((p, i) => (
            <p key={i}>{rich(p, `why-${i}`)}</p>
          ))}
        </section>

        <section className="dsec">
          {sectionHead(3, "What does its size mean in real life?")}
          {model.sizeInHumanTerms.map((p, i) => (
            <p key={i}>{rich(p, `size-${i}`)}</p>
          ))}
        </section>

        <section className="dsec">
          {sectionHead(4, "What is it good for — and not good for?")}
          <div className="dcards">
            <div className="dcard good">
              <h3>Good for</h3>
              <ul>
                {model.goodFor.map((g, i) => (
                  <li key={i}>
                    <b>{g.title}.</b> {g.desc}
                  </li>
                ))}
              </ul>
            </div>
            <div className="dcard bad">
              <h3>Not good for</h3>
              <ul>
                {model.notGoodFor.map((g, i) => (
                  <li key={i}>
                    <b>{g.title}.</b> {g.desc}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="dsec">
          {sectionHead(5, "What flaws does it have?")}
          <ul className="bullets">
            {model.flaws.map((f, i) => (
              <li key={i}>{rich(f, `flaw-${i}`)}</li>
            ))}
          </ul>
        </section>

        <section className="dsec">
          {sectionHead(
            6,
            model.slug === "llama-4-behemoth"
              ? "What came after it?"
              : "How did later models improve on it?",
          )}
          <div className="dtime">
            {model.laterImprovements.map((ev, i) => (
              <div className="ev" key={i}>
                <b>{ev.label}</b>
                <p>{rich(ev.text, `ev-${i}`)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="dsec">
          {sectionHead(7, "Who should use it — and who shouldn't?")}
          <div className="dcards">
            <div className="dcard good">
              <h3>Use it if</h3>
              <ul>
                <li>{model.whoShould}</li>
              </ul>
            </div>
            <div className="dcard bad">
              <h3>Skip it if</h3>
              <ul>
                <li>{model.whoShouldnt}</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="dsec">
          {sectionHead(8, "Quick facts")}
          <div className="dfacts">
            {model.facts.map((f, i) => (
              <div className="dfact" key={i}>
                <span>{f.label}</span>
                <b>{f.value}</b>
              </div>
            ))}
          </div>
        </section>

        <div className="dfoot">
          <p className="dsrc">{model.sourceNote}</p>
          <div className="dsib">
            {siblings.map((s) => (
              <Link href={`/llama/${s.slug}`} prefetch key={s.slug}>
                {s.name}
              </Link>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}
