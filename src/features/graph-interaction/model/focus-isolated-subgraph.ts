import { subgraphOf } from "../../hierarchical-graph-layout";
import type { ModuleDependencyGraph } from "../../graph-data/types";
import type { ModuleId } from "../../project/types";
import type { BarrelDisplayOptions } from "../../barrel-view";

import { computeDisplayHighlightedNodeIds } from "./focus-display-highlight";
import type { ConnectivityDepth, NeighborhoodDirection } from "../types";

export function buildFocusIsolatedSubgraph(
  canonical: ModuleDependencyGraph,
  display: ModuleDependencyGraph,
  focusId: ModuleId,
  depth: ConnectivityDepth,
  direction: NeighborhoodDirection,
  barrelOptions: BarrelDisplayOptions,
): ModuleDependencyGraph {
  const keep = computeDisplayHighlightedNodeIds(
    canonical,
    display,
    focusId,
    depth,
    direction,
    barrelOptions,
  );

  return subgraphOf(display, keep);
}