import {
  bfsWithinDepth,
  neighborsFromAdjacencyList,
  predecessorsFromAdjacencyList,
} from "../../../lib/graph";
import type { ModuleDependencyGraph } from "../../graph-data/types";
import type { ModuleId } from "../../project/types";

import type {
  ConnectivityDepth,
  EdgeVisualState,
  GraphFocusVisual,
  NeighborhoodDirection,
  NodeVisualState,
} from "../types";

const EDGE_KEY_SEP = "\u2192";

export function computeHighlightedNodeIds(
  graph: ModuleDependencyGraph,
  focusId: ModuleId,
  depth: ConnectivityDepth,
  direction: NeighborhoodDirection = "both",
): Set<ModuleId> {
  const maxHops = connectivityDepthToMaxHops(depth);

  if (direction === "both") {
    return mergeDirectionalNeighborhoods(graph, focusId, maxHops);
  }

  const neighbors = buildDirectionalNeighborFn(graph, direction);
  return bfsWithinDepth({
    start: focusId,
    neighbors,
    maxDepth: maxHops,
  });
}

function connectivityDepthToMaxHops(depth: ConnectivityDepth): number {
  return depth === "all" ? Number.POSITIVE_INFINITY : depth;
}

// Union of separate dependency-only and dependent-only traversals
function mergeDirectionalNeighborhoods(
  graph: ModuleDependencyGraph,
  focusId: ModuleId,
  maxDepth: number,
): Set<ModuleId> {
  const forward = neighborsFromAdjacencyList(graph.adjacencyList);
  const predecessors = predecessorsFromAdjacencyList(
    graph.nodes.keys(),
    graph.adjacencyList,
  );
  const dependentsOf = (node: ModuleId): Iterable<ModuleId> => predecessors.get(node) ?? [];

  const viaDependencies = bfsWithinDepth({
    start: focusId,
    neighbors: forward,
    maxDepth,
  });
  const viaDependents = bfsWithinDepth({
    start: focusId,
    neighbors: dependentsOf,
    maxDepth,
  });

  const merged = new Set<ModuleId>(viaDependencies);
  for (const id of viaDependents) merged.add(id);
  return merged;
}

export function computeHighlightedEdgeKeys(
  graph: ModuleDependencyGraph,
  highlightedNodeIds: Set<ModuleId>,
): Set<string> {
  const keys = new Set<string>();

  for (const [from, targets] of graph.adjacencyList) {
    if (!highlightedNodeIds.has(from)) continue;
    for (const to of targets) {
      if (!highlightedNodeIds.has(to)) continue;
      keys.add(edgeKey(from, to));
    }
  }

  return keys;
}

export function buildFocusVisual(
  graph: ModuleDependencyGraph | null,
  focusId: ModuleId | null,
  depth: ConnectivityDepth,
  direction: NeighborhoodDirection = "both",
): GraphFocusVisual | null {
  if (!graph || focusId === null) return null;

  const highlightedNodeIds = computeHighlightedNodeIds(graph, focusId, depth, direction);
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

function buildDirectionalNeighborFn(
  graph: ModuleDependencyGraph,
  direction: Exclude<NeighborhoodDirection, "both">,
) {
  const forward = neighborsFromAdjacencyList(graph.adjacencyList);
  const predecessors = predecessorsFromAdjacencyList(
    graph.nodes.keys(),
    graph.adjacencyList,
  );

  return (node: ModuleId): Iterable<ModuleId> => {
    if (direction === "dependencies") {
      return forward(node);
    }
    return predecessors.get(node) ?? [];
  };
}

export function edgeKey(from: ModuleId, to: ModuleId): string {
  return `${from}${EDGE_KEY_SEP}${to}`;
}