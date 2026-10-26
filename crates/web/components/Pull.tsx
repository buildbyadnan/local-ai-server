"use client";

/**
 * Pull flow (CONNECTIVITY_PLAN §5.4): the inline confirm in a tree row, the
 * global progress row, the terminal note on the row that owns the pull, and
 * the no-models starter CTA (§8's quoted sentence) used by both the chat's
 * empty state and the picker's empty state.
 *
 * All pull *state* lives in `ModelProvider` — these pieces only render it,
 * so a download started in the sidebar is visible in the chat pane too.
 */
import { useState } from "react";
import { allModels, type ModelGuide } from "@/data/models";
import { useOllama } from "@/components/ModelProvider";

/** §6 starter defaults — the two tags §8's no-models sentence offers. */
const STARTER_DEFAULT = "llama3.1:8b";
const STARTER_SMALLER = "llama3.2:3b";

/** The guide behind a registry tag (every tagged guide is unique — §10.3). */
function guideFor(tag: string): ModelGuide {
  const guide = allModels.find((m) => m.ollamaTag === tag);
  if (!guide) throw new Error(`no guide carries ollamaTag ${tag}`);
  return guide;
}

/**
 * §6 records sizes as captured ("2.0 GB"); §8 quotes the starter's as
 * "2 GB". Dropping a trailing `.0` lets both quoted strings render verbatim
 * from the single stored value.
 */
function sizeText(pullSize: string): string {
  return pullSize.replace(/^(\d+)\.0(?=\s)/, "$1");
}

/** §5.4 confirm — name + size hint, plus the >30B warning when it applies. */
function PullConfirm({
  guide,
  onStart,
  onCancel,
}: {
  guide: ModelGuide;
  onStart: () => void;
  onCancel: () => void;
}) {
  const { startPull } = useOllama();
  const tag = guide.ollamaTag ?? "";
  const pullSize = sizeText(guide.pullSize ?? "");
  const huge = Math.max(0, ...(guide.paramsBillions ?? [])) > 30;

  return (
    <span className="pullconfirm">
      <span className="pullsize">
        {tag} · about {pullSize} — downloaded once, then it&apos;s yours
        offline.
      </span>
      {huge && (
        <span className="pullhuge">
          This one is huge (≈{pullSize}) — bigger than anything the llama CLI
          recommends.
        </span>
      )}
      <span className="row">
        <button
          type="button"
          className="btn"
          onClick={() => {
            startPull(tag, pullSize);
            onStart();
          }}
        >
          {huge ? "Pull anyway" : "Pull"}
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
      </span>
    </span>
  );
}

/**
 * The tree's Pull control (§5.2): confirm inline in the row; disabled with
 * a visible reason while Ollama is down (row 15) or another pull runs
 * (row 17).
 */
export function PullButton({ guide }: { guide: ModelGuide }) {
  const { status, pulling } = useOllama();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <PullConfirm
        guide={guide}
        onStart={() => setConfirming(false)}
        onCancel={() => setConfirming(false)}
      />
    );
  }
  if (pulling) {
    return (
      <span className="pullbtn off" aria-disabled="true">
        Pulling…
      </span>
    );
  }
  if (status !== null && !status.running) {
    return (
      <span className="pullbtn off" aria-disabled="true">
        Start Ollama first
      </span>
    );
  }
  return (
    <button
      type="button"
      className="pullbtn"
      onClick={() => setConfirming(true)}
    >
      Pull
    </button>
  );
}

/** Terminal outcome of the last pull, inline on the row that owns the tag. */
export function PullNote({ tag }: { tag: string | undefined }) {
  const { pullNote } = useOllama();
  if (!tag || !pullNote || pullNote.tag !== tag) return null;
  const tone =
    pullNote.kind === "error" ? "bad" : pullNote.kind === "ready" ? "good" : "stop";
  return <p className={`pullnote ${tone}`}>{pullNote.text}</p>;
}

/** The one progress row (§5.4) — rendered once, above the model tree. */
export function PullStatus() {
  const { pulling, cancelPull } = useOllama();
  if (!pulling) return null;

  const { tag, status, pullSize } = pulling;
  const percent = pulling.percent === null ? null : Math.round(pulling.percent);
  return (
    <div className="pullrow">
      <div
        className="pullbar"
        role="progressbar"
        aria-label={`Downloading ${tag}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? undefined}
      >
        {/* Totals not reported yet → indeterminate, sized by the estimate. */}
        <span
          className={percent === null ? "indet" : "fill"}
          style={percent === null ? undefined : { width: `${percent}%` }}
        />
      </div>
      <span className="pulltxt">
        Pulling {tag} — {status}
        {percent === null
          ? ` · about ${sizeText(pullSize)}`
          : ` · ${percent}%`}
      </span>
      <button type="button" className="btn" onClick={cancelPull}>
        Cancel
      </button>
    </div>
  );
}

/**
 * §8's no-models sentence with both starter tags as live pull triggers —
 * shown in the chat's empty state (§5.3 row 2) and in the picker's empty
 * state (§7 row 3). While a starter is confirming, the sentence is replaced
 * by its confirm so the two never compete for the same line.
 *
 * `onPullStart` lets the picker close its menu once a pull begins.
 */
export function StarterCta({ onPullStart }: { onPullStart?: () => void } = {}) {
  const { status, pulling } = useOllama();
  const [confirming, setConfirming] = useState<string | null>(null);

  if (confirming !== null) {
    return (
      <PullConfirm
        guide={guideFor(confirming)}
        onStart={() => {
          setConfirming(null);
          onPullStart?.();
        }}
        onCancel={() => setConfirming(null)}
      />
    );
  }

  // Same two preconditions as the tree's Pull button (rows 15/17).
  const blocked =
    pulling !== null
      ? "Pulling…"
      : status !== null && !status.running
        ? "Start Ollama first"
        : null;

  const tagButton = (tag: string) => (
    <button
      type="button"
      className="tagbtn"
      disabled={blocked !== null}
      title={blocked ?? "Pull this model"}
      onClick={() => setConfirming(tag)}
    >
      {tag}
    </button>
  );

  return (
    <>
      <p className="pullcta">
        No models yet — get the default pick: {tagButton(STARTER_DEFAULT)}{" "}
        (about {sizeText(guideFor(STARTER_DEFAULT).pullSize ?? "")}).{" "}
        Prefer smaller? {tagButton(STARTER_SMALLER)}{" "}
        (about {sizeText(guideFor(STARTER_SMALLER).pullSize ?? "")}).
      </p>
      {/* Pulling from here has no row in view — surface the outcome. */}
      <PullNote tag={STARTER_DEFAULT} />
      <PullNote tag={STARTER_SMALLER} />
    </>
  );
}
