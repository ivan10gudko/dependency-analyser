import {
  computeHighlightedNodeIds,
  edgeKey,
} from "../graph-interaction/model/focus-neighborhood";
import type {
  ConnectivityDepth,
  EdgeVisualState,
  GraphFocusVisual,
  NeighborhoodDirection,
  NodeVisualState,
} from "../graph-interaction/types";
import type { ModuleDependencyGraph } from "../graph-data/types";
import type { ModuleId } from "../project/types";

import {
  buildProxyToBarrelMap,
  mapModuleIdToDisplay,
  resolveDisplayFocusModuleId,
} from "./build-barrel-display-graph";
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
      canonical,
      focusedModuleId,
      depth,
      direction,
    );
  }

  const proxyToBarrel = buildProxyToBarrelMap(canonical, options);
  const canonicalHighlighted = computeHighlightedNodeIds(
    canonical,
    focusedModuleId,
    depth,
    direction,
  );
  const displayFocusId = resolveDisplayFocusModuleId(
    focusedModuleId,
    canonical,
    options,
  );

  const displayHighlighted = new Set<ModuleId>();
  for (const id of canonicalHighlighted) {
    displayHighlighted.add(
      mapModuleIdToDisplay(id, canonical, options, proxyToBarrel),
    );
  }
  displayHighlighted.add(displayFocusId);

  const highlightedEdgeKeys = highlightEdgeKeysOnDisplayGraph(
    display,
    displayHighlighted,
  );

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

function highlightEdgeKeysOnDisplayGraph(
  display: ModuleDependencyGraph,
  displayHighlighted: ReadonlySet<ModuleId>,
): Set<string> {
  const keys = new Set<string>();
  for (const [from, targets] of display.adjacencyList) {
    if (!displayHighlighted.has(from)) continue;
    for (const to of targets) {
      if (!displayHighlighted.has(to)) continue;
      keys.add(edgeKey(from, to));
    }
  }
  return keys;
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

  const highlightedEdgeKeys = new Set<string>();
  for (const [from, targets] of graph.adjacencyList) {
    if (!highlightedNodeIds.has(from)) continue;
    for (const to of targets) {
      if (!highlightedNodeIds.has(to)) continue;
      highlightedEdgeKeys.add(edgeKey(from, to));
    }
  }

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