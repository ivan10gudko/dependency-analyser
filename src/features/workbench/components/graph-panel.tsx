import { useCallback, useMemo } from "react";

import {
  barrelFolderFromNodeId,
  detectBarrelFolders,
} from "../../barrel-view";
import { useGraphInteraction } from "../../graph-interaction";
import { enrichFocusVisualForLayout } from "../../graph-interaction/model/enrich-focus-visual";
import { buildHierarchicalLayout } from "../../hierarchical-graph-layout";
import { Button, EmptyState, Surface } from "../../../shared/ui";
import { GraphViewport } from "../../graph-renderer";
import type { LoadingState, ProjectWorkspace } from "../../project/types/workspace";

const LOADING_LABEL: Record<Exclude<LoadingState, "idle">, string> = {
  picking: "Choosing folder…",
  scanning: "Scanning files…",
  reading: "Reading files…",
  analyzing: "Analyzing project…",
};

export interface GraphPanelProps {
  workspace: ProjectWorkspace;
}

export function GraphPanel({ workspace }: GraphPanelProps) {
  const {
    displayFocusModuleId,
    focusVisual,
    focusModule,
    clearFocus,
    barrelViewEnabled,
    displayGraph,
    toggleBarrelExpand,
    expandedBarrelDirectories,
  } = useGraphInteraction();

  const graphLayout = useMemo(() => {
    const base = workspace.layoutModel;
    if (!base) return null;
    if (!barrelViewEnabled || !displayGraph) return base;
    try {
      return buildHierarchicalLayout(displayGraph).model;
    } catch {
      return base;
    }
  }, [workspace.layoutModel, barrelViewEnabled, displayGraph]);

  const layoutFocusVisual = useMemo(
    () => enrichFocusVisualForLayout(focusVisual, graphLayout),
    [focusVisual, graphLayout],
  );

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

      {showLayout && graphLayout && (
        <GraphViewport
          layout={graphLayout}
          focusedModuleId={displayFocusModuleId}
          focusVisual={layoutFocusVisual}
          onFocusModule={focusModule}
          onClearFocus={clearFocus}
          onFocusBarrel={focusBarrelNode}
          onToggleBarrelExpand={toggleBarrelExpand}
          expandedBarrelDirectories={expandedBarrelDirectories}
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