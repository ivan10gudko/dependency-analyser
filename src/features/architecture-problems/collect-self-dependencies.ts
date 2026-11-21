import type { ModuleDependencyGraph, NodeId } from "../graph-data/types";

export interface SelfDependency {
  moduleId: NodeId;
}

export function collectSelfDependencies(graph: ModuleDependencyGraph): SelfDependency[] {
  const items: SelfDependency[] = [];
  for (const moduleId of graph.nodes.keys()) {
    const neighbors = graph.adjacencyList.get(moduleId);
    if (neighbors?.has(moduleId)) {
      items.push({ moduleId });
    }
  }
  items.sort((left, right) => left.moduleId.localeCompare(right.moduleId));
  return items;
}