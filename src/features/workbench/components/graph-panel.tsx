import { useCallback, useMemo } from "react";

import { buildIssueFocusVisual, useAnalysis } from "../../analysis";
import {
  barrelFolderFromNodeId,
  detectBarrelFolders,
} from "../../barrel-view";
import { useGraphInteraction, type FocusDisplayMode } from "../../graph-interaction";
import { enrichFocusVisualForLayout } from "../../graph-interaction/model/enrich-focus-visual";
import { buildHierarchicalLayout, subgraphOf } from "../../hierarchical-graph-layout";
import { Button, EmptyState, Surface } from "../../../shared/ui";
import { GraphViewport } from "../../graph-renderer";
import type { ModuleDependencyGraph } from "../../graph-data/types";
import type { LoadingState, ProjectWorkspace } from "../../project/types/workspace";

const LOADING_LABEL: Record<Exclude<LoadingState, "idle">, string> = {
  picking: "Choosing folder…",
  scanning: "Scanning files…",
  reading: "Reading files…",
  analyzing: "Analyzing project…",
};

export interface GraphPanelProps {
  workspace: ProjectWorkspace;
  sidebarTab: string;
}

export function GraphPanel({ workspace, sidebarTab }: GraphPanelProps) {
  const {
    displayFocusModuleId,
    focusVisual,
    focusDisplayMode,
    focusModule,
    clearFocus,
    displayGraph,
    layoutDisplayGraph,
    toggleBarrelExpand,
    expandedBarrelDirectories,
    locationColorByModuleId,
  } = useGraphInteraction();
  const { issueHighlight } = useAnalysis();
  const onProblems = sidebarTab === "problems";
  const showIssue = onProblems && issueHighlight != null;

  const filtersHidEverything =
    (workspace.dependencyGraph?.nodes.size ?? 0) > 0 &&
    displayGraph != null &&
    displayGraph.nodes.size === 0;

  const graphLayout = useMemo(() => {
    const base = workspace.layoutModel;
    if (!base) return null;
    const layoutSource = resolveLayoutSource({
      showIssue,
      onProblems,
      focusDisplayMode,
      displayGraph,
      layoutDisplayGraph,
      issueNodeIds: issueHighlight?.nodeIds,
      dependencyGraph: workspace.dependencyGraph,
    });
    if (!layoutSource || layoutSource === workspace.dependencyGraph) return base;
    if (layoutSource.nodes.size === 0) return showIssue ? base : null;
    try {
      return buildHierarchicalLayout(layoutSource).model;
    } catch {
      return base;
    }
  }, [
    workspace.layoutModel,
    workspace.dependencyGraph,
    layoutDisplayGraph,
    displayGraph,
    showIssue,
    onProblems,
    focusDisplayMode,
    issueHighlight,
  ]);

  const layoutFocusVisual = useMemo(() => {
    if (showIssue && issueHighlight) {
      return enrichFocusVisualForLayout(buildIssueFocusVisual(issueHighlight), graphLayout);
    }
    if (onProblems) return null;
    return enrichFocusVisualForLayout(focusVisual, graphLayout);
  }, [showIssue, onProblems, issueHighlight, focusVisual, graphLayout]);

  const focusBarrelNode = useCallback(
    (barrelNodeId: string) => {
      const graph = workspace.dependencyGraph;
      if (!graph) return;
      const directory = barrelFolderFromNodeId(barrelNodeId);
      if (!directory) return;
      const folder = detectBarrelFolders(graph).get(directory);
      if (!folder) return;
      focusModule(folder.indexModuleId);
    },
    [workspace.dependencyGraph, focusModule],
  );

  const showWelcome =
    !workspace.projectRootAbsolute && workspace.loading === "idle" && !workspace.error;
  const showLoading = workspace.loading !== "idle";
  const showLayout = workspace.layoutModel != null;

  return (
    <Surface variant="muted" className="wb-graph-panel">
      {showWelcome && (
        <div className="wb-graph-center">
          <EmptyState
            title="Dependency Analyser"
            description="Open a project folder to visualize module dependencies."
            actionLabel="Open Project…"
            onAction={() => void workspace.openProject()}
          />
        </div>
      )}

      {!showWelcome && !showLayout && !showLoading && (
        <div className="wb-graph-center">
          <EmptyState
            title="No graph"
            description={
              workspace.layoutError ??
              workspace.error?.message ??
              "Analysis did not produce a layout."
            }
            actionLabel={workspace.error ? "Open Project…" : undefined}
            onAction={
              workspace.error ? () => void workspace.openProject() : undefined
            }
          />
        </div>
      )}

      {showLayout && filtersHidEverything && (
        <div className="wb-graph-center">
          <EmptyState
            title="Nothing to show"
            description="All modules are hidden by the current filters."
          />
        </div>
      )}

      {showLayout && graphLayout && (
        <GraphViewport
          layout={graphLayout}
          focusedModuleId={displayFocusModuleId}
          focusVisual={layoutFocusVisual}
          issueHighlight={showIssue ? issueHighlight : null}
          issueOnly={showIssue}
          onFocusModule={focusModule}
          onClearFocus={clearFocus}
          onFocusBarrel={focusBarrelNode}
          onToggleBarrelExpand={toggleBarrelExpand}
          expandedBarrelDirectories={expandedBarrelDirectories}
          locationColorByModuleId={locationColorByModuleId}
        />
      )}

      {showLoading && workspace.loading !== "idle" && (
        <div className="wb-graph-overlay" role="status" aria-live="polite">
          <Surface bordered className="wb-graph-overlay-card">
            <p className="wb-graph-overlay-title">{LOADING_LABEL[workspace.loading]}</p>
            {workspace.projectRootAbsolute && (
              <p className="wb-graph-overlay-path">{workspace.projectRootAbsolute}</p>
            )}
            <Button variant="ghost" size="sm" disabled>
              Working…
            </Button>
          </Surface>
        </div>
      )}
    </Surface>
  );
}

function resolveLayoutSource({
  showIssue,
  onProblems,
  focusDisplayMode,
  displayGraph,
  layoutDisplayGraph,
  issueNodeIds,
  dependencyGraph,
}: {
  showIssue: boolean;
  onProblems: boolean;
  focusDisplayMode: FocusDisplayMode;
  displayGraph: ModuleDependencyGraph | null;
  layoutDisplayGraph: ModuleDependencyGraph | null;
  issueNodeIds: ReadonlySet<string> | undefined;
  dependencyGraph: ModuleDependencyGraph | null;
}): ModuleDependencyGraph | null {
  if (showIssue && displayGraph && issueNodeIds) {
    if (focusDisplayMode !== "isolated") return displayGraph;
    const issueGraph = subgraphOf(displayGraph, issueNodeIds);
    return issueGraph.nodes.size > 0 ? issueGraph : displayGraph;
  }
  if (onProblems) return displayGraph ?? dependencyGraph;
  return layoutDisplayGraph;
}