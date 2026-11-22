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

export interface DirectionalNeighborhood {
  /** Modules reached by following imports, including the focus module. */
  descendants: Set<ModuleId>;
  /** Modules that import the focus module, directly or through other importers. */
  ancestors: Set<ModuleId>;
}

export function computeDirectionalNeighborhood(
  graph: ModuleDependencyGraph,
  focusId: ModuleId,
  depth: ConnectivityDepth,
  direction: NeighborhoodDirection = "both",
): DirectionalNeighborhood {
  const maxHops = connectivityDepthToMaxHops(depth);
  const forward = neighborsFromAdjacencyList(graph.adjacencyList);
  const predecessors = predecessorsFromAdjacencyList(
    graph.nodes.keys(),
    graph.adjacencyList,
  );
  const dependentsOf = (node: ModuleId): Iterable<ModuleId> => predecessors.get(node) ?? [];
  const focusOnly = new Set<ModuleId>([focusId]);

  if (direction === "dependencies") {
    return {
      descendants: bfsWithinDepth({ start: focusId, neighbors: forward, maxDepth: maxHops }),
      ancestors: focusOnly,
    };
  }

  if (direction === "dependents") {
    return {
      descendants: focusOnly,
      ancestors: bfsWithinDepth({
        start: focusId,
        neighbors: dependentsOf,
        maxDepth: maxHops,
      }),
    };
  }

  return {
    descendants: bfsWithinDepth({ start: focusId, neighbors: forward, maxDepth: maxHops }),
    ancestors: bfsWithinDepth({
      start: focusId,
      neighbors: dependentsOf,
      maxDepth: maxHops,
    }),
  };
}

export function computeHighlightedNodeIds(
  graph: ModuleDependencyGraph,
  focusId: ModuleId,
  depth: ConnectivityDepth,
  direction: NeighborhoodDirection = "both",
): Set<ModuleId> {
  const { descendants, ancestors } = computeDirectionalNeighborhood(
    graph,
    focusId,
    depth,
    direction,
  );
  const merged = new Set<ModuleId>(descendants);
  for (const id of ancestors) merged.add(id);
  return merged;
}

function connectivityDepthToMaxHops(depth: ConnectivityDepth): number {
  return depth === "all" ? Number.POSITIVE_INFINITY : depth;
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

export function nodeVisualStateForNeighborhood(
  id: ModuleId,
  focusId: ModuleId,
  descendants: ReadonlySet<ModuleId>,
  ancestors: ReadonlySet<ModuleId>,
): NodeVisualState {
  if (id === focusId) return "focus";
  const isDescendant = descendants.has(id);
  const isAncestor = ancestors.has(id);
  if (isDescendant && isAncestor) return "related";
  if (isDescendant) return "descendant";
  if (isAncestor) return "ancestor";
  return "dimmed";
}

export function edgeVisualStateForNeighborhood(
  from: ModuleId,
  to: ModuleId,
  descendants: ReadonlySet<ModuleId>,
  ancestors: ReadonlySet<ModuleId>,
): EdgeVisualState {
  const alongDescendants = descendants.has(from) && descendants.has(to);
  const alongAncestors = ancestors.has(from) && ancestors.has(to);
  if (alongDescendants && alongAncestors) return "highlighted";
  if (alongDescendants) return "descendant";
  if (alongAncestors) return "ancestor";
  return "dimmed";
}

export function buildNeighborhoodFocusVisual(
  graph: ModuleDependencyGraph,
  focusId: ModuleId,
  descendants: ReadonlySet<ModuleId>,
  ancestors: ReadonlySet<ModuleId>,
): GraphFocusVisual {
  const nodeStateById = new Map<ModuleId, NodeVisualState>();
  for (const id of graph.nodes.keys()) {
    nodeStateById.set(
      id,
      nodeVisualStateForNeighborhood(id, focusId, descendants, ancestors),
    );
  }

  const edgeStateByKey = new Map<string, EdgeVisualState>();
  for (const [from, targets] of graph.adjacencyList) {
    for (const to of targets) {
      edgeStateByKey.set(
        edgeKey(from, to),
        edgeVisualStateForNeighborhood(from, to, descendants, ancestors),
      );
    }
  }

  return {
    active: true,
    nodeStateById,
    edgeStateByKey,
  };
}

export function buildFocusVisual(
  graph: ModuleDependencyGraph | null,
  focusId: ModuleId | null,
  depth: ConnectivityDepth,
  direction: NeighborhoodDirection = "both",
): GraphFocusVisual | null {
  if (!graph || focusId === null) return null;

  const { descendants, ancestors } = computeDirectionalNeighborhood(
    graph,
    focusId,
    depth,
    direction,
  );
  return buildNeighborhoodFocusVisual(graph, focusId, descendants, ancestors);
}

export function edgeKey(from: ModuleId, to: ModuleId): string {
  return `${from}${EDGE_KEY_SEP}${to}`;
}