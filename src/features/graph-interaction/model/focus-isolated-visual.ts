import type { ModuleDependencyGraph } from "../../graph-data/types";
import type { ModuleId } from "../../project/types";

import { edgeKey } from "./focus-neighborhood";
import type { EdgeVisualState, GraphFocusVisual, NodeVisualState } from "../types";

export function buildIsolatedFocusVisual(
  subgraph: ModuleDependencyGraph,
  displayFocusModuleId: ModuleId,
): GraphFocusVisual | null {
  if (!subgraph.nodes.has(displayFocusModuleId)) return null;

  const nodeStateById = new Map<ModuleId, NodeVisualState>();
  for (const id of subgraph.nodes.keys()) {
    nodeStateById.set(id, id === displayFocusModuleId ? "focus" : "related");
  }

  const edgeStateByKey = new Map<string, EdgeVisualState>();
  for (const [from, targets] of subgraph.adjacencyList) {
    for (const to of targets) {
      edgeStateByKey.set(edgeKey(from, to), "highlighted");
    }
  }

  return {
    active: true,
    nodeStateById,
    edgeStateByKey,
  };
}