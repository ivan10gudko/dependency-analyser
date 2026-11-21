import { EmptyState, ListRow, ScrollArea } from "../../../shared/ui";
import type { ProjectWorkspace } from "../../project/types/workspace";

export interface ProblemsPanelProps {
  workspace: ProjectWorkspace;
}

export function ProblemsPanel({ workspace }: ProblemsPanelProps) {
  const hasInvokeError = workspace.error != null;
  const hasLayoutError = workspace.layoutError != null;
  const hasCycles = workspace.cycleBreaks.length > 0;
  const hasSelfDependencies = workspace.selfDependencies.length > 0;

  const empty =
    !hasInvokeError &&
    !hasLayoutError &&
    !hasCycles &&
    !hasSelfDependencies &&
    !import.meta.env.DEV;

  return (
    <ScrollArea className="wb-panel-scroll">
      {empty && (
        <EmptyState
          title="No problems"
          description="Dependency cycles and errors will appear here."
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

      {workspace.layoutScope && (
        <ListRow mono className="wb-problems-meta">
          Layout root: {workspace.layoutScope.root} · {workspace.layoutScope.totalModules}{" "}
          modules
        </ListRow>
      )}

      {hasSelfDependencies &&
        workspace.selfDependencies.map((item) => (
          <ListRow key={item.moduleId} tone="warning" mono>
            Self-dependency: {item.moduleId} imports itself
          </ListRow>
        ))}

      {hasCycles &&
        workspace.cycleBreaks.map((item, index) => (
          <ListRow key={`${item.from}-${item.to}-${index}`} tone="warning" mono>
            Cycle edge {item.from} → {item.to} ({item.note})
          </ListRow>
        ))}

      {import.meta.env.DEV && workspace.layoutModel && (
        <details className="wb-dev-details">
          <summary>Layout JSON (dev)</summary>
          <pre className="wb-dev-pre">
            {JSON.stringify(workspace.layoutModel, null, 2)}
          </pre>
        </details>
      )}
    </ScrollArea>
  );
}