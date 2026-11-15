import {
  cloneAdjacencyList,
  inDegrees,
  neighborSet,
} from "../../lib/graph";
import type { ModuleDependencyGraph, NodeId } from "../graph-data/types";

/**
 * Makes the graph acyclic by reversing backedges found during depth-first search
 */
export function breakCycles(
  graph: ModuleDependencyGraph,
  root: NodeId,
): ModuleDependencyGraph {
  const adjacencyList = cloneAdjacencyList(graph.adjacencyList);
  const nodes = new Set(graph.nodes.keys());
  const indegree = inDegrees(nodes, adjacencyList);
  const visited = new Set<NodeId>();
  const active = new Set<NodeId>();

  for (const node of nodes) {
    if (indegree.get(node) !== 0) continue;
    if (visited.has(node)) continue;
    breakCyclesRecursive(node, adjacencyList, visited, active);
  }

  if (!visited.has(root)) {
    breakCyclesRecursive(root, adjacencyList, visited, active);
  }

  return {
    nodes: graph.nodes,
    adjacencyList,
  };
}

function breakCyclesRecursive(
  node: NodeId,
  adjacencyList: Map<NodeId, Set<NodeId>>,
  visited: Set<NodeId>,
  active: Set<NodeId>,
): void {
  visited.add(node);
  active.add(node);

  for (const target of [...neighborSet(adjacencyList, node)]) {
    if (active.has(target)) {
      reverseEdge(adjacencyList, node, target);
    } else if (!visited.has(target)) {
      breakCyclesRecursive(target, adjacencyList, visited, active);
    }
  }

  active.delete(node);
}

function reverseEdge(
  adjacencyList: Map<NodeId, Set<NodeId>>,
  from: NodeId,
  to: NodeId,
): void {
  neighborSet(adjacencyList, from).delete(to);
  neighborSet(adjacencyList, to).add(from);
}
