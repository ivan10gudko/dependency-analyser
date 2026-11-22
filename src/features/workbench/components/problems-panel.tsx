import { useState, type KeyboardEvent } from "react";

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
import { EmptyState, ListRow, ScrollArea } from "../../../shared/ui";
import type { ProjectWorkspace } from "../../project/types/workspace";

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
            label="All"
            count={report.issues.length}
            onClick={() => setFilter("all")}
          />
          <FilterButton
            active={filter === "error"}
            label="Errors"
            count={report.counts.error}
            onClick={() => setFilter("error")}
          />
          <FilterButton
            active={filter === "warning"}
            label="Warnings"
            count={report.counts.warning}
            onClick={() => setFilter("warning")}
          />
          <FilterButton
            active={filter === "info"}
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
          <p className="wb-issues-fsd">
            {!workspace.dependencyGraph
              ? "Open a project to analyze dependencies."
              : fsdStatus.active
                ? `FSD layers detected: ${fsdStatus.layers.join(", ")}.`
                : "FSD preset inactive: fewer than two layers."}
          </p>
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
          <ListRow tone="danger" mono>
            {workspace.error!.kind}: {workspace.error!.message}
          </ListRow>
        )}

        {hasLayoutError && (
          <ListRow tone="danger" mono>
            Layout: {workspace.layoutError}
          </ListRow>
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
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={active ? "wb-issues-filter is-active" : "wb-issues-filter"}
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
      <span>{count}</span>
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
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect();
  };

  return (
    <ListRow
      tone={issue.severity === "error" ? "danger" : issue.severity === "warning" ? "warning" : "default"}
      interactive
      selected={selected}
      mono
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={onKeyDown}
    >
      {issue.message}
    </ListRow>
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
