import type { ModuleDependencyGraph } from "../graph-data/types";

import type {
  AnalysisCounts,
  AnalysisIssue,
  AnalysisReport,
  AnalysisSettings,
  Analyzer,
  IssueCategory,
  Severity,
} from "./types";
import { ISSUE_CATEGORIES } from "./types";

const SEVERITY_RANK: Record<Severity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

const CATEGORY_RANK: Record<IssueCategory, number> = ISSUE_CATEGORIES.reduce(
  (ranks, category, index) => {
    ranks[category] = index;
    return ranks;
  },
  {} as Record<IssueCategory, number>,
);

export function runAnalysis(
  graph: ModuleDependencyGraph,
  settings: AnalysisSettings,
  analyzers: readonly Analyzer[],
): AnalysisReport {
  const issues: AnalysisIssue[] = [];
  for (const analyzer of analyzers) {
    if (!settings.enabledRules[analyzer.id]) continue;
    issues.push(...analyzer.run({ graph, settings }));
  }
  issues.sort(compareIssues);
  return { issues, counts: countIssues(issues) };
}

export function countIssues(issues: readonly AnalysisIssue[]): AnalysisCounts {
  const counts: AnalysisCounts = { error: 0, warning: 0, info: 0 };
  for (const issue of issues) counts[issue.severity] += 1;
  return counts;
}

function compareIssues(left: AnalysisIssue, right: AnalysisIssue): number {
  const bySeverity = SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity];
  if (bySeverity !== 0) return bySeverity;
  const byCategory = CATEGORY_RANK[left.category] - CATEGORY_RANK[right.category];
  if (byCategory !== 0) return byCategory;
  const byMessage = left.message.localeCompare(right.message);
  if (byMessage !== 0) return byMessage;
  return left.id.localeCompare(right.id);
}
