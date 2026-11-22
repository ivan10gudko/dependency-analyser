import type { ModuleDependencyGraph } from "../../graph-data/types";
import type { ModuleId } from "../../project/types";

import {
  buildNeighborhoodFocusVisual,
  computeDirectionalNeighborhood,
} from "./focus-neighborhood";
import type { ConnectivityDepth, GraphFocusVisual, NeighborhoodDirection } from "../types";

export function buildIsolatedFocusVisual(
  subgraph: ModuleDependencyGraph,
  displayFocusModuleId: ModuleId,
  depth: ConnectivityDepth = "all",
  direction: NeighborhoodDirection = "both",
): GraphFocusVisual | null {
  if (!subgraph.nodes.has(displayFocusModuleId)) return null;

  const { descendants, ancestors } = computeDirectionalNeighborhood(
    subgraph,
    displayFocusModuleId,
    depth,
    direction,
  );
  return buildNeighborhoodFocusVisual(
    subgraph,
    displayFocusModuleId,
    descendants,
    ancestors,
  );
}