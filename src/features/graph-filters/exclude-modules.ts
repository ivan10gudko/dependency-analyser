import { directoryOf } from "../../lib/path";
import type { GraphNode, ModuleDependencyGraph, NodeId } from "../graph-data/types";

import { isTestModule } from "./is-test-module";
import { ancestorDirectories } from "./module-paths";
import { maskToRegExp } from "./match-mask";

export interface ExcludeModulesOptions {
  showTestFiles: boolean;
  folderMasks: readonly string[];
  fileMasks: readonly string[];
}

export function excludeModules(
  graph: ModuleDependencyGraph,
  options: ExcludeModulesOptions,
): ModuleDependencyGraph {
  const folderPatterns = options.folderMasks.map((mask) => maskToRegExp(mask));
  const filePatterns = options.fileMasks.map((mask) => maskToRegExp(mask));
  if (options.showTestFiles && folderPatterns.length === 0 && filePatterns.length === 0) {
    return graph;
  }

  const hidden = new Set<NodeId>();
  for (const [id, node] of graph.nodes) {
    if (isHidden(id, node, options.showTestFiles, folderPatterns, filePatterns)) {
      hidden.add(id);
    }
  }
  if (hidden.size === 0) return graph;

  const nodes = new Map<NodeId, GraphNode>();
  const adjacencyList = new Map<NodeId, Set<NodeId>>();

  for (const [id, node] of graph.nodes) {
    if (hidden.has(id)) continue;
    nodes.set(id, node);
    const next = new Set<NodeId>();
    for (const target of graph.adjacencyList.get(id) ?? []) {
      if (!hidden.has(target) && graph.nodes.has(target)) next.add(target);
    }
    adjacencyList.set(id, next);
  }

  return { nodes, adjacencyList };
}

function isHidden(
  id: NodeId,
  node: GraphNode,
  showTestFiles: boolean,
  folderPatterns: readonly RegExp[],
  filePatterns: readonly RegExp[],
): boolean {
  if (!showTestFiles && isTestModule(id)) return true;
  if (filePatterns.some((pattern) => pattern.test(id))) return true;

  const directory = node.directory || directoryOf(id);
  return ancestorDirectories(directory).some((candidate) =>
    folderPatterns.some((pattern) => pattern.test(candidate)),
  );
}
