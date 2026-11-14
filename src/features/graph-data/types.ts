import type { ModuleId } from "../project/types";

export type NodeId = ModuleId;

/**
 * Edge direction: importer → imported module.
 */
export interface GraphNode {
  id: NodeId;
  name: string;
  directory: string;
}

export interface ModuleDependencyGraph {
  nodes: Map<NodeId, GraphNode>;
  adjacencyList: Map<NodeId, Set<NodeId>>;
}