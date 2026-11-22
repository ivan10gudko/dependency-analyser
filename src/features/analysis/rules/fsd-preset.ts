import type { ModuleDependencyGraph } from "../../graph-data/types";
import type { ModuleId } from "../../project/types";

import type { ArchitectureModel, ArchitecturePlacement } from "./architecture-model";

const BASE_LAYERS = ["shared", "entities", "features", "widgets", "pages", "app"] as const;

const KNOWN_LAYERS = new Set<string>([...BASE_LAYERS, "processes"]);

const SLICED_LAYERS = new Set<string>(["pages", "widgets", "features", "entities"]);

export function buildFsdModel(graph: ModuleDependencyGraph): ArchitectureModel | null {
  const detected = new Set<string>();
  const located = new Map<ModuleId, { layer: string; slice: string | null }>();

  for (const moduleId of graph.nodes.keys()) {
    const place = locateModule(moduleId);
    if (!place) continue;
    located.set(moduleId, place);
    detected.add(place.layer);
  }

  if (detected.size < 2) return null;

  const layers = layerOrder(detected.has("processes")).filter((layer) => detected.has(layer));
  const rankOf = new Map(layers.map((layer, rank) => [layer, rank]));
  const placements = new Map<ModuleId, ArchitecturePlacement>();

  for (const [moduleId, place] of located) {
    const rank = rankOf.get(place.layer);
    if (rank === undefined) continue;
    placements.set(moduleId, { layer: place.layer, rank, slice: place.slice });
  }

  return { placements, layers };
}

function layerOrder(hasProcesses: boolean): string[] {
  const order: string[] = ["shared", "entities", "features", "widgets"];
  if (hasProcesses) order.push("processes");
  order.push("pages", "app");
  return order;
}

function locateModule(moduleId: ModuleId): { layer: string; slice: string | null } | null {
  const segments = moduleId.split("/");
  const directories = segments.slice(0, -1);
  const layerIndex = directories.findIndex((segment) => KNOWN_LAYERS.has(segment));
  if (layerIndex < 0) return null;

  const layer = directories[layerIndex]!;
  const slice = SLICED_LAYERS.has(layer) ? (directories[layerIndex + 1] ?? null) : null;
  return { layer, slice };
}
