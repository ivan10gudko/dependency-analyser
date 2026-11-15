import {
  cloneAdjacencyList,
  inDegrees,
  neighborSet,
} from "../../lib/graph";
import type { ModuleDependencyGraph, NodeId } from "../graph-data/types";

export interface CycleBreak {
  from: NodeId;
  to: NodeId;
  note: string;
}

// Records directed edges that were reversed to break cycles

export function collectCycleBreaks(
  graph: ModuleDependencyGraph,
  root: NodeId,
): CycleBreak[] {
  const adjacencyList = cloneAdjacencyList(graph.adjacencyList);
  const nodes = new Set(graph.nodes.keys());
  const indegree = inDegrees(nodes, adjacencyList);
  const visited = new Set<NodeId>();
  const active = new Set<NodeId>();
  const breaks: CycleBreak[] = [];

  for (const node of nodes) {
    if (indegree.get(node) !== 0) continue;
    if (visited.has(node)) continue;
    breakCyclesRecursive(node, adjacencyList, visited, active, breaks);
  }

  if (!visited.has(root)) {
    breakCyclesRecursive(root, adjacencyList, visited, active, breaks);
  }

  return breaks;
}

function breakCyclesRecursive(
  node: NodeId,
  adjacencyList: Map<NodeId, Set<NodeId>>,
  visited: Set<NodeId>,
  active: Set<NodeId>,
  breaks: CycleBreak[],
): void {
  visited.add(node);
  active.add(node);

  for (const target of [...neighborSet(adjacencyList, node)]) {
    if (active.has(target)) {
      reverseEdge(adjacencyList, node, target);
      breaks.push({
        from: node,
        to: target,
        note: "reversed for layout",
      });
    } else if (!visited.has(target)) {
      breakCyclesRecursive(target, adjacencyList, visited, active, breaks);
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