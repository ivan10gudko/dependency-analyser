import { inDegrees } from "../../../lib/graph";
import type { ModuleDependencyGraph } from "../../graph-data/types";
import type { ModuleId } from "../../project/types";

import { resolveEntryPoints } from "./entry-points";
import { isSpecialModule } from "./special-modules";
import type { AnalysisIssue, Analyzer } from "../types";

export const unreachableModuleAnalyzer: Analyzer = {
  id: "unreachable-module",
  run({ graph, settings }) {
    const entries = resolveEntryPoints(graph, settings.entryPointMasks).moduleIds;
    if (entries.size === 0) return [];

    const reached = reachableFrom(graph, entries);
    const indegree = inDegrees(graph.nodes.keys(), graph.adjacencyList);
    const issues: AnalysisIssue[] = [];

    const moduleIds = [...graph.nodes.keys()].sort((left, right) => left.localeCompare(right));
    for (const moduleId of moduleIds) {
      if (reached.has(moduleId) || entries.has(moduleId)) continue;
      if ((indegree.get(moduleId) ?? 0) === 0) continue;
      if (isSpecialModule(moduleId)) continue;
      issues.push({
        id: `unreachable-module:${moduleId}`,
        ruleId: "unreachable-module",
        severity: "warning",
        category: "unreachable",
        message: `Unreachable module ${moduleId}: not reachable from entry points`,
        moduleIds: [moduleId],
        edges: [],
        primaryModuleId: moduleId,
      });
    }

    return issues;
  },
};

function reachableFrom(
  graph: ModuleDependencyGraph,
  entries: ReadonlySet<ModuleId>,
): Set<ModuleId> {
  const reached = new Set<ModuleId>(entries);
  const queue = [...entries];

  while (queue.length > 0) {
    const node = queue.shift()!;
    const neighbors = graph.adjacencyList.get(node);
    if (!neighbors) continue;
    for (const next of neighbors) {
      if (!graph.nodes.has(next) || reached.has(next)) continue;
      reached.add(next);
      queue.push(next);
    }
  }

  return reached;
}
