import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { ModuleDependencyGraph } from "../graph-data/types";
import { useGraphInteraction } from "../graph-interaction";

import { runAnalysis } from "./engine";
import { detectFsdStatus } from "./fsd-status";
import { buildIssueHighlight, type IssueHighlight } from "./issue-highlight";
import { analysisAnalyzers } from "./rules";
import {
  loadAnalysisSettings,
  saveAnalysisSettings,
} from "./settings";
import type { AnalysisIssue, AnalysisReport, AnalysisSettings, FsdStatus, RuleId } from "./types";

const EMPTY_REPORT: AnalysisReport = {
  issues: [],
  counts: { error: 0, warning: 0, info: 0 },
};

interface AnalysisContextValue {
  report: AnalysisReport;
  settings: AnalysisSettings;
  fsdStatus: FsdStatus;
  selectedIssueId: string | null;
  issueHighlight: IssueHighlight | null;
  selectIssue: (issue: AnalysisIssue) => void;
  setRuleEnabled: (ruleId: RuleId, enabled: boolean) => void;
  setFanInThreshold: (value: number) => void;
  setFanOutThreshold: (value: number) => void;
  setEntryPointMasks: (masks: readonly string[]) => void;
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

export interface AnalysisProviderProps {
  dependencyGraph: ModuleDependencyGraph | null;
  projectKey: string | null;
  children: ReactNode;
}

export function AnalysisProvider({
  dependencyGraph,
  projectKey,
  children,
}: AnalysisProviderProps) {
  const {
    focusModule,
    focusSource,
    focusedModuleId,
    barrelViewEnabled,
    expandedBarrelDirectories,
  } = useGraphInteraction();
  const [settings, setSettings] = useState(() => loadAnalysisSettings(projectKey));
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  useEffect(() => {
    setSettings(loadAnalysisSettings(projectKey));
    setSelectedIssueId(null);
  }, [projectKey]);

  const report = useMemo(() => {
    if (!dependencyGraph) return EMPTY_REPORT;
    return runAnalysis(dependencyGraph, settings, analysisAnalyzers);
  }, [dependencyGraph, settings]);

  const fsdStatus = useMemo(
    () => (dependencyGraph ? detectFsdStatus(dependencyGraph) : { active: false, layers: [] }),
    [dependencyGraph],
  );

  const updateSettings = useCallback(
    (updater: (current: AnalysisSettings) => AnalysisSettings) => {
      setSettings((current) => {
        const next = updater(current);
        saveAnalysisSettings(projectKey, next);
        return next;
      });
    },
    [projectKey],
  );

  const selectIssue = useCallback(
    (issue: AnalysisIssue) => {
      setSelectedIssueId(issue.id);
      if (issue.primaryModuleId) focusModule(issue.primaryModuleId, "issue");
    },
    [focusModule],
  );

  useEffect(() => {
    if (focusSource !== "issue") setSelectedIssueId(null);
  }, [focusSource, focusedModuleId]);

  useEffect(() => {
    if (selectedIssueId && !report.issues.some((issue) => issue.id === selectedIssueId)) {
      setSelectedIssueId(null);
    }
  }, [report, selectedIssueId]);

  const issueHighlight = useMemo(() => {
    if (!selectedIssueId || !dependencyGraph) return null;
    const issue = report.issues.find((item) => item.id === selectedIssueId);
    if (!issue) return null;
    return buildIssueHighlight(issue, dependencyGraph, {
      barrelViewEnabled,
      expandedDirectories: expandedBarrelDirectories,
    });
  }, [
    selectedIssueId,
    dependencyGraph,
    report.issues,
    barrelViewEnabled,
    expandedBarrelDirectories,
  ]);

  const setRuleEnabled = useCallback(
    (ruleId: RuleId, enabled: boolean) => {
      updateSettings((current) => ({
        ...current,
        enabledRules: { ...current.enabledRules, [ruleId]: enabled },
      }));
    },
    [updateSettings],
  );

  const setFanInThreshold = useCallback(
    (value: number) => updateSettings((current) => ({ ...current, fanInThreshold: value })),
    [updateSettings],
  );

  const setFanOutThreshold = useCallback(
    (value: number) => updateSettings((current) => ({ ...current, fanOutThreshold: value })),
    [updateSettings],
  );

  const setEntryPointMasks = useCallback(
    (masks: readonly string[]) =>
      updateSettings((current) => ({ ...current, entryPointMasks: masks })),
    [updateSettings],
  );

  const value = useMemo<AnalysisContextValue>(
    () => ({
      report,
      settings,
      fsdStatus,
      selectedIssueId,
      issueHighlight,
      selectIssue,
      setRuleEnabled,
      setFanInThreshold,
      setFanOutThreshold,
      setEntryPointMasks,
    }),
    [
      report,
      settings,
      fsdStatus,
      selectedIssueId,
      issueHighlight,
      selectIssue,
      setRuleEnabled,
      setFanInThreshold,
      setFanOutThreshold,
      setEntryPointMasks,
    ],
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis(): AnalysisContextValue {
  const value = useContext(AnalysisContext);
  if (!value) throw new Error("useAnalysis must be used within AnalysisProvider");
  return value;
}
