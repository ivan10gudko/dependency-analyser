import { useGraphInteraction } from "../../graph-interaction";
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
  const { focusedModuleId, focusVisual, focusModule, clearFocus } = useGraphInteraction();

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

      {showLayout && workspace.layoutModel && (
        <GraphViewport
          layout={workspace.layoutModel}
          focusedModuleId={focusedModuleId}
          focusVisual={focusVisual}
          onFocusModule={focusModule}
          onClearFocus={clearFocus}
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