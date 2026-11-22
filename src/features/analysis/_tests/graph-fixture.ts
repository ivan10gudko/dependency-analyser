import type { ModuleDependencyGraph, NodeId } from "../../graph-data/types";

export function graphOf(
  edges: [NodeId, NodeId][],
  extraNodes: NodeId[] = [],
): ModuleDependencyGraph {
  const nodes = new Map<NodeId, { id: NodeId; name: string; directory: string }>();
  const adjacencyList = new Map<NodeId, Set<NodeId>>();

  const ensureNode = (id: NodeId) => {
    if (!nodes.has(id)) {
      const slash = id.lastIndexOf("/");
      nodes.set(id, {
        id,
        name: slash < 0 ? id : id.slice(slash + 1),
        directory: slash < 0 ? "" : id.slice(0, slash),
      });
    }
    if (!adjacencyList.has(id)) adjacencyList.set(id, new Set());
  };

  for (const id of extraNodes) ensureNode(id);
  for (const [from, to] of edges) {
    ensureNode(from);
    ensureNode(to);
    adjacencyList.get(from)!.add(to);
  }

  return { nodes, adjacencyList };
}
