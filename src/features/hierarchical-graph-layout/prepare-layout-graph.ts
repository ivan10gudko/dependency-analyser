import { cloneAdjacencyList, neighborSet } from "../../lib/graph";
import type { ModuleDependencyGraph } from "../graph-data/types";

// Copy of the module graph with self-edges removed, for layout algorithms only.
export function prepareGraphForLayout(graph: ModuleDependencyGraph): ModuleDependencyGraph {
  const adjacencyList = cloneAdjacencyList(graph.adjacencyList);
  for (const moduleId of graph.nodes.keys()) {
    neighborSet(adjacencyList, moduleId).delete(moduleId);
  }
  return { nodes: graph.nodes, adjacencyList };
}