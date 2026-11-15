import type { GraphNode, ModuleDependencyGraph, NodeId } from "../graph-data/types";

/** Modules reachable from `root` by following import edges (importer → imported). */
export function collectReachableFromRoot(
  graph: ModuleDependencyGraph,
  root: NodeId,
): Set<NodeId> {
  const reached = new Set<NodeId>();
  if (!graph.nodes.has(root)) return reached;

  const queue: NodeId[] = [root];
  while (queue.length > 0) {
    const node = queue.shift()!;
    if (reached.has(node)) continue;
    reached.add(node);

    for (const successor of graph.adjacencyList.get(node) ?? []) {
      if (!reached.has(successor)) queue.push(successor);
    }
  }

  return reached;
}

export function subgraphOf(
  graph: ModuleDependencyGraph,
  keep: ReadonlySet<NodeId>,
): ModuleDependencyGraph {
  const nodes = new Map<NodeId, GraphNode>();
  for (const id of keep) {
    const module = graph.nodes.get(id);
    if (module) nodes.set(id, module);
  }

  const adjacencyList = new Map<NodeId, Set<NodeId>>();
  for (const id of keep) {
    const targets = new Set<NodeId>();
    for (const to of graph.adjacencyList.get(id) ?? []) {
      if (keep.has(to)) targets.add(to);
    }
    adjacencyList.set(id, targets);
  }

  return { nodes, adjacencyList };
}