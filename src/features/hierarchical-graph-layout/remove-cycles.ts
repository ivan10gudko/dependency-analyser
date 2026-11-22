import {
  cloneAdjacencyList,
  inDegrees,
  neighborSet,
} from "../../lib/graph";
import type { ModuleDependencyGraph, NodeId } from "../graph-data/types";

export interface ReversedLayoutEdge {
  /** Original dependency direction, before the layout reversal. */
  from: NodeId;
  to: NodeId;
  /** The opposite edge was already present, so both directions must be drawn. */
  sharesLayoutEdge: boolean;
}

export interface BreakCyclesResult {
  graph: ModuleDependencyGraph;
  reversedEdges: ReversedLayoutEdge[];
}

/**
 * Makes the graph acyclic by reversing backedges found during depth-first search.
 * `reversedEdges` keeps the original direction so the picture can draw it back.
 */
export function breakCycles(
  graph: ModuleDependencyGraph,
  root: NodeId,
): BreakCyclesResult {
  const adjacencyList = cloneAdjacencyList(graph.adjacencyList);
  const nodes = new Set(graph.nodes.keys());
  const indegree = inDegrees(nodes, adjacencyList);
  const visited = new Set<NodeId>();
  const active = new Set<NodeId>();
  const reversedEdges: ReversedLayoutEdge[] = [];

  for (const node of nodes) {
    if (indegree.get(node) !== 0) continue;
    if (visited.has(node)) continue;
    breakCyclesRecursive(node, adjacencyList, visited, active, reversedEdges);
  }

  if (!visited.has(root)) {
    breakCyclesRecursive(root, adjacencyList, visited, active, reversedEdges);
  }

  return {
    graph: {
      nodes: graph.nodes,
      adjacencyList,
    },
    reversedEdges,
  };
}

function breakCyclesRecursive(
  node: NodeId,
  adjacencyList: Map<NodeId, Set<NodeId>>,
  visited: Set<NodeId>,
  active: Set<NodeId>,
  reversedEdges: ReversedLayoutEdge[],
): void {
  visited.add(node);
  active.add(node);

  for (const target of [...neighborSet(adjacencyList, node)]) {
    if (active.has(target)) {
      const sharesLayoutEdge = reverseEdge(adjacencyList, node, target);
      if (node !== target) reversedEdges.push({ from: node, to: target, sharesLayoutEdge });
    } else if (!visited.has(target)) {
      breakCyclesRecursive(target, adjacencyList, visited, active, reversedEdges);
    }
  }

  active.delete(node);
}

function reverseEdge(
  adjacencyList: Map<NodeId, Set<NodeId>>,
  from: NodeId,
  to: NodeId,
): boolean {
  neighborSet(adjacencyList, from).delete(to);
  const opposite = neighborSet(adjacencyList, to);
  const sharesLayoutEdge = opposite.has(from);
  opposite.add(from);
  return sharesLayoutEdge;
}
