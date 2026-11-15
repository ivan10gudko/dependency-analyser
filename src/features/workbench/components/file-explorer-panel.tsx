import { useState } from "react";

import { EmptyState, Surface } from "../../../shared/ui";
import { fileNameOf, toPosix } from "../../../lib/path";
import type { ProjectWorkspace } from "../../project/types/workspace";

import { FileTree } from "./file-tree";

export interface FileExplorerPanelProps {
  workspace: ProjectWorkspace;
}

export function FileExplorerPanel({ workspace }: FileExplorerPanelProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const title =
    workspace.projectRootAbsolute != null
      ? fileNameOf(toPosix(workspace.projectRootAbsolute)) || "Project"
      : "Explorer";

  return (
    <Surface variant="sidebar" className="wb-side-panel">
      <p className="ui-section-title">
        Explorer · {title}
      </p>
      {workspace.fileModuleIds.length === 0 ? (
        <EmptyState
          title="No folder open"
          description="Open a project to browse source files."
          actionLabel="Open Project…"
          onAction={() => void workspace.openProject()}
        />
      ) : (
        <FileTree
          moduleIds={workspace.fileModuleIds}
          selectedPath={selectedPath}
          onSelectFile={setSelectedPath}
        />
      )}
    </Surface>
  );
}