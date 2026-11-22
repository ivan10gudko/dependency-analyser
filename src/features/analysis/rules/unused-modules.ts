import { inDegrees } from "../../../lib/graph";

import { resolveEntryPoints } from "./entry-points";
import { isSpecialModule } from "./special-modules";
import type { AnalysisIssue, Analyzer } from "../types";

export const unusedModuleAnalyzer: Analyzer = {
  id: "unused-module",
  run({ graph, settings }) {
    const entries = resolveEntryPoints(graph, settings.entryPointMasks).moduleIds;
    const indegree = inDegrees(graph.nodes.keys(), graph.adjacencyList);
    const issues: AnalysisIssue[] = [];

    const moduleIds = [...graph.nodes.keys()].sort((left, right) => left.localeCompare(right));
    for (const moduleId of moduleIds) {
      if ((indegree.get(moduleId) ?? 0) !== 0) continue;
      if (entries.has(moduleId) || isSpecialModule(moduleId)) continue;
      issues.push({
        id: `unused-module:${moduleId}`,
        ruleId: "unused-module",
        severity: "warning",
        category: "unused",
        message: `Unused module ${moduleId}: no incoming dependencies`,
        moduleIds: [moduleId],
        edges: [],
        primaryModuleId: moduleId,
      });
    }

    return issues;
  },
};
