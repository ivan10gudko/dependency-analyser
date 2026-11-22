import type { ModuleDependencyGraph } from "../graph-data/types";
import type { ModuleId } from "../project/types";

export const SEVERITIES = ["error", "warning", "info"] as const;

export type Severity = (typeof SEVERITIES)[number];

export const ISSUE_CATEGORIES = [
  "circular-dependency",
  "self-dependency",
  "architecture",
  "public-api",
  "high-coupling",
  "unreachable",
  "unused",
] as const;

export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

export const RULE_IDS = [
  "self-dependency",
  "circular-dependency",
  "unused-module",
  "unreachable-module",
  "high-coupling",
  "fsd-layer",
  "fsd-cross-slice",
  "public-api",
] as const;

export type RuleId = (typeof RULE_IDS)[number];

export interface AnalysisEdge {
  from: ModuleId;
  to: ModuleId;
}

export interface AnalysisIssue {
  id: string;
  ruleId: RuleId;
  severity: Severity;
  category: IssueCategory;
  message: string;
  moduleIds: ModuleId[];
  edges: AnalysisEdge[];
  primaryModuleId: ModuleId | null;
}

export interface AnalysisSettings {
  enabledRules: Record<RuleId, boolean>;
  fanInThreshold: number;
  fanOutThreshold: number;
  entryPointMasks: readonly string[];
}

export interface AnalyzerContext {
  graph: ModuleDependencyGraph;
  settings: AnalysisSettings;
}

export interface Analyzer {
  id: RuleId;
  run(ctx: AnalyzerContext): AnalysisIssue[];
}

export interface AnalysisCounts {
  error: number;
  warning: number;
  info: number;
}

export interface AnalysisReport {
  issues: AnalysisIssue[];
  counts: AnalysisCounts;
}

export interface FsdStatus {
  active: boolean;
  layers: readonly string[];
}

export const CATEGORY_LABELS: Record<IssueCategory, string> = {
  "circular-dependency": "Circular dependencies",
  "self-dependency": "Self-dependencies",
  architecture: "Architecture",
  "public-api": "Public API",
  "high-coupling": "High coupling",
  unreachable: "Unreachable modules",
  unused: "Unused modules",
};

export const RULE_LABELS: Record<RuleId, string> = {
  "self-dependency": "Self-dependencies",
  "circular-dependency": "Circular dependencies",
  "unused-module": "Unused modules",
  "unreachable-module": "Unreachable modules",
  "high-coupling": "High coupling",
  "fsd-layer": "FSD layer direction",
  "fsd-cross-slice": "FSD cross-slice imports",
  "public-api": "Public API bypass",
};
