import {
  computeHighlightedEdgeKeys,
  computeHighlightedNodeIds,
  edgeKey,
} from "../graph-interaction/model/focus-neighborhood";
import { computeDisplayHighlightedNodeIds } from "../graph-interaction/model/focus-display-highlight";
import type {
  ConnectivityDepth,
  EdgeVisualState,
  GraphFocusVisual,
  NeighborhoodDirection,
  NodeVisualState,
} from "../graph-interaction/types";
import type { ModuleDependencyGraph } from "../graph-data/types";
import type { ModuleId } from "../project/types";

import { resolveDisplayFocusModuleId } from "./build-barrel-display-graph";
import type { BarrelDisplayOptions } from "./types";

export function buildBarrelAwareFocusVisual(
  canonical: ModuleDependencyGraph | null,
  display: ModuleDependencyGraph | null,
  focusedModuleId: ModuleId | null,
  options: BarrelDisplayOptions,
  depth: ConnectivityDepth,
  direction: NeighborhoodDirection,
): GraphFocusVisual | null {
  if (!display || !canonical || focusedModuleId === null) return null;

  if (!options.barrelViewEnabled) {
    return buildFocusVisualOnGraph(
      display,
      focusedModuleId,
      depth,
      direction,
    );
  }

  const displayFocusId = resolveDisplayFocusModuleId(
    focusedModuleId,
    canonical,
    options,
  );
  const displayHighlighted = computeDisplayHighlightedNodeIds(
    canonical,
    display,
    focusedModuleId,
    depth,
    direction,
    options,
  );

  const highlightedEdgeKeys = computeHighlightedEdgeKeys(display, displayHighlighted);

  const nodeStateById = new Map<ModuleId, NodeVisualState>();
  for (const id of display.nodes.keys()) {
    if (id === displayFocusId) {
      nodeStateById.set(id, "focus");
    } else if (displayHighlighted.has(id)) {
      nodeStateById.set(id, "related");
    } else {
      nodeStateById.set(id, "dimmed");
    }
  }

  const edgeStateByKey = new Map<string, EdgeVisualState>();
  for (const [from, targets] of display.adjacencyList) {
    for (const to of targets) {
      const key = edgeKey(from, to);
      edgeStateByKey.set(
        key,
        highlightedEdgeKeys.has(key) ? "highlighted" : "dimmed",
      );
    }
  }

  return {
    active: true,
    nodeStateById,
    edgeStateByKey,
  };
}

function buildFocusVisualOnGraph(
  graph: ModuleDependencyGraph,
  focusId: ModuleId,
  depth: ConnectivityDepth,
  direction: NeighborhoodDirection,
): GraphFocusVisual | null {
  const highlightedNodeIds = computeHighlightedNodeIds(
    graph,
    focusId,
    depth,
    direction,
  );

  const highlightedEdgeKeys = computeHighlightedEdgeKeys(graph, highlightedNodeIds);

  const nodeStateById = new Map<ModuleId, NodeVisualState>();
  for (const id of graph.nodes.keys()) {
    if (id === focusId) {
      nodeStateById.set(id, "focus");
    } else if (highlightedNodeIds.has(id)) {
      nodeStateById.set(id, "related");
    } else {
      nodeStateById.set(id, "dimmed");
    }
  }

  const edgeStateByKey = new Map<string, EdgeVisualState>();
  for (const [from, targets] of graph.adjacencyList) {
    for (const to of targets) {
      const key = edgeKey(from, to);
      edgeStateByKey.set(
        key,
        highlightedEdgeKeys.has(key) ? "highlighted" : "dimmed",
      );
    }
  }

  return {
    active: true,
    nodeStateById,
    edgeStateByKey,
  };
}