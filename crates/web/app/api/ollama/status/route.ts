/**
 * GET /api/ollama/status — live snapshot of this machine's Ollama.
 *
 * Request-time by construction: the Host guard
 * reads `request.headers` first, which stops any prerender, and every
 * network/probe call below is caught — a rejection here would take the
 * route down at runtime (and, if reordered ahead of the guard, fail the
 * build). No segment-config exports: forbidden under Cache Components.
 */
import { base, ollamaFetch, probeInstalled, requireLoopbackHost } from "@/lib/ollama";
import type { InstalledModel, OllamaStatus } from "@/lib/ollama-types";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * `details.families` (newer Ollama) folded with `details.family` (older),
 * strings only — `[]` when neither is present, which is exactly the case
 * `isLlamaModel` falls back to the name for (M6).
 */
function familiesOf(details: UpstreamModel["details"]): string[] {
  const fromList = Array.isArray(details?.families)
    ? details.families.filter((entry): entry is string => typeof entry === "string")
    : [];
  const single = typeof details?.family === "string" ? [details.family] : [];
  return [...new Set([...fromList, ...single])];
}

interface UpstreamModel {
  name?: unknown;
  size?: unknown;
  details?: {
    parameter_size?: unknown;
    families?: unknown;
    family?: unknown;
  };
}

interface UpstreamTags {
  models?: UpstreamModel[];
}

interface UpstreamPs {
  models?: Array<{ name?: unknown }>;
}

function toStatus(
  probe: { installed: boolean; onPath: boolean },
  running: boolean,
): OllamaStatus {
  return {
    installed: probe.installed,
    onPath: probe.onPath,
    running,
    host: base(),
    models: [],
    loaded: [],
  };
}

export async function GET(request: Request): Promise<Response> {
  const denied = requireLoopbackHost(request);
  if (denied) return denied;

  const probe = await probeInstalled();
  const status = toStatus(probe, false);
  if (!probe.installed) {
    return Response.json(status, { headers: NO_STORE });
  }

  const tags = await ollamaFetch("/api/tags", {}, 2000).catch(() => null);
  if (!tags?.ok) {
    return Response.json(status, { headers: NO_STORE });
  }
  const tagsData = (await tags.json().catch(() => null)) as UpstreamTags | null;
  if (!tagsData || !Array.isArray(tagsData.models)) {
    return Response.json(status, { headers: NO_STORE });
  }

  const models: InstalledModel[] = tagsData.models.flatMap((model) =>
    typeof model.name === "string"
      ? [
          {
            name: model.name,
            size: typeof model.size === "number" ? model.size : 0,
            parameterSize:
              typeof model.details?.parameter_size === "string"
                ? model.details.parameter_size
                : "",
            families: familiesOf(model.details),
          },
        ]
      : [],
  );
  status.running = true;
  status.models = models;

  const ps = await ollamaFetch("/api/ps", {}, 2000).catch(() => null);
  if (ps?.ok) {
    const psData = (await ps.json().catch(() => null)) as UpstreamPs | null;
    if (psData && Array.isArray(psData.models)) {
      status.loaded = psData.models.flatMap((entry) =>
        typeof entry.name === "string" ? [entry.name] : [],
      );
    }
  }

  return Response.json(status, { headers: NO_STORE });
}
