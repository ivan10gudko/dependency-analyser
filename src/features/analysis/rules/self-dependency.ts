import type { ModuleId } from "../../project/types";

import type { AnalysisIssue, Analyzer } from "../types";

export const selfDependencyAnalyzer: Analyzer = {
  id: "self-dependency",
  run({ graph }) {
    const issues: AnalysisIssue[] = [];
    const moduleIds = [...graph.nodes.keys()].sort((left, right) => left.localeCompare(right));
    for (const moduleId of moduleIds) {
      if (!graph.adjacencyList.get(moduleId)?.has(moduleId)) continue;
      issues.push(selfDependencyIssue(moduleId));
    }
    return issues;
  },
};

function selfDependencyIssue(moduleId: ModuleId): AnalysisIssue {
  return {
    id: `self-dependency:${moduleId}`,
    ruleId: "self-dependency",
    severity: "warning",
    category: "self-dependency",
    message: `Self-dependency: ${moduleId} imports itself`,
    moduleIds: [moduleId],
    edges: [{ from: moduleId, to: moduleId }],
    primaryModuleId: moduleId,
  };
}
