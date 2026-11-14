import { directoryOf, fileNameOf } from "../../lib/path";
import type { ProjectAnalysis } from "../project/types";
import type { AnalyzedModule } from "../source-analyser/types";

import type { GraphNode, ModuleDependencyGraph, NodeId } from "./types";

function graphNodeOf(id: NodeId): GraphNode {
  return {
    id,
    name: fileNameOf(id),
    directory: directoryOf(id),
  };
}

export function buildModuleDependencyGraph(
  modules: readonly AnalyzedModule[],
): ModuleDependencyGraph {
  const nodes = new Map<NodeId, GraphNode>();
  const adjacencyList = new Map<NodeId, Set<NodeId>>();

  for (const module of modules) {
    nodes.set(module.path, graphNodeOf(module.path));
    adjacencyList.set(module.path, new Set(module.dependencies));
  }

  return { nodes, adjacencyList };
}

export function buildModuleDependencyGraphFromAnalysis(
  analysis: ProjectAnalysis,
): ModuleDependencyGraph {
  return buildModuleDependencyGraph(analysis.modules);
}

export function edgeCount(graph: ModuleDependencyGraph): number {
  let count = 0;
  for (const neighbors of graph.adjacencyList.values()) {
    count += neighbors.size;
  }
  return count;
}