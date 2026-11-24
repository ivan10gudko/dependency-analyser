import { useState, type KeyboardEvent, type ReactNode } from "react";

import {
  CATEGORY_LABELS,
  ISSUE_CATEGORIES,
  RULE_IDS,
  RULE_LABELS,
  useAnalysis,
  type AnalysisIssue,
  type IssueCategory,
  type Severity,
} from "../../analysis";
import { mergeMasks } from "../../graph-filters";
import { useGraphInteraction } from "../../graph-interaction";
import { EmptyState, ScrollArea } from "../../../shared/ui";
import type { ProjectWorkspace } from "../../project/types/workspace";

import { LayerRulesField } from "./layer-rules-field";
import { MaskField } from "./mask-field";

type SeverityFilter = "all" | Severity;

export interface ProblemsPanelProps {
  workspace: ProjectWorkspace;
}

export function ProblemsPanel({ workspace }: ProblemsPanelProps) {
  const {
    report,
    settings,
    fsdStatus,
    selectedIssueId,
    selectIssue,
    setRuleEnabled,
    setFanInThreshold,
    setFanOutThreshold,
    setEntryPointMasks,
    setLayers,
  } = useAnalysis();
  const { moduleIds } = useGraphInteraction();
  const [filter, setFilter] = useState<SeverityFilter>("all");

  const visible = report.issues.filter(
    (issue) => filter === "all" || issue.severity === filter,
  );
  const groups = groupIssues(visible);
  const hasInvokeError = workspace.error != null;
  const hasLayoutError = workspace.layoutError != null;
  const empty = !hasInvokeError && !hasLayoutError && visible.length === 0;

  return (
    <div className="wb-issues">
      <div className="wb-issues-toolbar">
        <div className="wb-issues-filters" role="group" aria-label="Filter by severity">
          <FilterButton
            active={filter === "all"}
            severity="all"
            label="All"
            count={report.issues.length}
            onClick={() => setFilter("all")}
          />
          <FilterButton
            active={filter === "error"}
            severity="error"
            label="Errors"
            count={report.counts.error}
            onClick={() => setFilter("error")}
          />
          <FilterButton
            active={filter === "warning"}
            severity="warning"
            label="Warnings"
            count={report.counts.warning}
            onClick={() => setFilter("warning")}
          />
          <FilterButton
            active={filter === "info"}
            severity="info"
            label="Info"
            count={report.counts.info}
            onClick={() => setFilter("info")}
          />
        </div>
      </div>

      <ScrollArea className="wb-panel-scroll">
        <details className="wb-issues-rules">
          <summary>Rules</summary>
          <div className="wb-issues-rules-body">
          <LayerRulesField
            layers={settings.layers}
            paths={moduleIds}
            matchedLayers={fsdStatus.matchedLayers}
            projectOpen={workspace.dependencyGraph != null}
            onChange={setLayers}
          />
          {RULE_IDS.map((ruleId) => (
            <label key={ruleId} className="wb-view-toggle">
              <input
                type="checkbox"
                checked={settings.enabledRules[ruleId]}
                onChange={(event) => setRuleEnabled(ruleId, event.target.checked)}
              />
              <span>{RULE_LABELS[ruleId]}</span>
            </label>
          ))}
          <div className="wb-issues-thresholds">
            <label>
              Fan-in threshold
              <input
                type="number"
                min={1}
                value={settings.fanInThreshold}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isInteger(value) && value >= 1) setFanInThreshold(value);
                }}
              />
            </label>
            <label>
              Fan-out threshold
              <input
                type="number"
                min={1}
                value={settings.fanOutThreshold}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isInteger(value) && value >= 1) setFanOutThreshold(value);
                }}
              />
            </label>
          </div>
          <MaskField
            label="Entry point masks"
            hint="Extra entry points, besides the built-in app roots. * is one path segment, ** is any depth."
            placeholder="Entry mask or path"
            masks={settings.entryPointMasks}
            paths={moduleIds}
            onAdd={(masks) => setEntryPointMasks(mergeMasks(settings.entryPointMasks, masks))}
            onRemove={(mask) =>
              setEntryPointMasks(settings.entryPointMasks.filter((item) => item !== mask))
            }
          />
          </div>
        </details>

        {empty && (
          <EmptyState
            title={report.issues.length === 0 ? "No issues" : "Nothing at this severity"}
            description={
              report.issues.length === 0
                ? "Dependency and architecture issues will appear here."
                : "Choose another severity to see the remaining issues."
            }
          />
        )}

        {hasInvokeError && (
          <div className="wb-issues-system">
            <IssueCard
              severity="error"
              selected={false}
              onSelect={() => {}}
              tabIndex={-1}
            >
              {workspace.error!.kind}: {workspace.error!.message}
            </IssueCard>
          </div>
        )}

        {hasLayoutError && (
          <div className="wb-issues-system">
            <IssueCard
              severity="error"
              selected={false}
              onSelect={() => {}}
              tabIndex={-1}
            >
              Layout: {workspace.layoutError}
            </IssueCard>
          </div>
        )}

        {groups.map((group) => (
          <section key={group.category} className="wb-issues-group">
            <h3 className="wb-issues-group-title">
              {CATEGORY_LABELS[group.category]}
              <span>{group.issues.length}</span>
            </h3>
            {group.issues.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                selected={issue.id === selectedIssueId}
                onSelect={() => selectIssue(issue)}
              />
            ))}
          </section>
        ))}

        {import.meta.env.DEV && workspace.layoutModel && (
          <details className="wb-dev-details">
            <summary>Layout JSON (dev)</summary>
            <pre className="wb-dev-pre">{JSON.stringify(workspace.layoutModel, null, 2)}</pre>
          </details>
        )}
      </ScrollArea>
    </div>
  );
}

function FilterButton({
  active,
  severity,
  label,
  count,
  onClick,
}: {
  active: boolean;
  severity: SeverityFilter;
  label: string;
  count: number;
  onClick: () => void;
}) {
  const severityClass = ` wb-issues-filter--${severity}`;
  return (
    <button
      type="button"
      className={`wb-issues-filter${severityClass}${active ? " is-active" : ""}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
      <span className="wb-issues-filter-count">{count}</span>
    </button>
  );
}

function IssueRow({
  issue,
  selected,
  onSelect,
}: {
  issue: AnalysisIssue;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <IssueCard severity={issue.severity} selected={selected} onSelect={onSelect}>
      {issue.message}
    </IssueCard>
  );
}

function IssueCard({
  severity,
  selected,
  onSelect,
  tabIndex = 0,
  children,
}: {
  severity: Severity;
  selected: boolean;
  onSelect: () => void;
  tabIndex?: number;
  children: ReactNode;
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (tabIndex < 0) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect();
  };

  return (
    <div
      role={tabIndex < 0 ? undefined : "button"}
      tabIndex={tabIndex}
      className={`wb-issue-card wb-issue-card--${severity}${selected ? " is-selected" : ""}`}
      onClick={tabIndex < 0 ? undefined : onSelect}
      onKeyDown={onKeyDown}
    >
      <span className="wb-issue-card__message">{children}</span>
    </div>
  );
}

function groupIssues(
  issues: readonly AnalysisIssue[],
): { category: IssueCategory; issues: AnalysisIssue[] }[] {
  const buckets = new Map<IssueCategory, AnalysisIssue[]>();
  for (const issue of issues) {
    const list = buckets.get(issue.category) ?? [];
    list.push(issue);
    buckets.set(issue.category, list);
  }
  return ISSUE_CATEGORIES.filter((category) => buckets.has(category)).map((category) => ({
    category,
    issues: buckets.get(category)!,
  }));
}
