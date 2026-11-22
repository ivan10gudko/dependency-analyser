import { inDegrees } from "../../../lib/graph";
import { pathMatchesMask } from "../../graph-filters";
import type { ModuleDependencyGraph } from "../../graph-data/types";
import { PREFERRED_ROOTS } from "../../hierarchical-graph-layout";
import type { ModuleId } from "../../project/types";

import { isSpecialModule } from "./special-modules";

export interface EntryPointResolution {
  moduleIds: ReadonlySet<ModuleId>;
  /** True when a preferred root or a user mask matched. False for the in-degree fallback. */
  explicit: boolean;
}

export function resolveEntryPoints(
  graph: ModuleDependencyGraph,
  extraMasks: readonly string[],
): EntryPointResolution {
  const explicit = new Set<ModuleId>();

  for (const candidate of PREFERRED_ROOTS) {
    if (graph.nodes.has(candidate)) explicit.add(candidate);
  }

  if (extraMasks.length > 0) {
    for (const moduleId of graph.nodes.keys()) {
      if (extraMasks.some((mask) => pathMatchesMask(mask, moduleId))) {
        explicit.add(moduleId);
      }
    }
  }

  if (explicit.size > 0) return { moduleIds: explicit, explicit: true };

  const indegree = inDegrees(graph.nodes.keys(), graph.adjacencyList);
  const fallback = new Set<ModuleId>();
  for (const moduleId of graph.nodes.keys()) {
    if ((indegree.get(moduleId) ?? 0) !== 0) continue;
    if (isSpecialModule(moduleId)) continue;
    fallback.add(moduleId);
  }
  return { moduleIds: fallback, explicit: false };
}
