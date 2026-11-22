import { inDegrees } from "../../../lib/graph";

import type { AnalysisIssue, Analyzer } from "../types";

export const highCouplingAnalyzer: Analyzer = {
  id: "high-coupling",
  run({ graph, settings }) {
    const indegree = inDegrees(graph.nodes.keys(), graph.adjacencyList);
    const issues: AnalysisIssue[] = [];
    const moduleIds = [...graph.nodes.keys()].sort((left, right) => left.localeCompare(right));

    for (const moduleId of moduleIds) {
      const fanIn = indegree.get(moduleId) ?? 0;
      const fanOut = graph.adjacencyList.get(moduleId)?.size ?? 0;
      if (fanIn <= settings.fanInThreshold && fanOut <= settings.fanOutThreshold) continue;
      issues.push({
        id: `high-coupling:${moduleId}`,
        ruleId: "high-coupling",
        severity: "warning",
        category: "high-coupling",
        message:
          `High coupling in ${moduleId}: fan-in ${fanIn} ` +
          `(threshold ${settings.fanInThreshold}), fan-out ${fanOut} ` +
          `(threshold ${settings.fanOutThreshold})`,
        moduleIds: [moduleId],
        edges: [],
        primaryModuleId: moduleId,
      });
    }

    return issues;
  },
};
