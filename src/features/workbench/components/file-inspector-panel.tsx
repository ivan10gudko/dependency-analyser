import { EmptyState, ScrollArea } from "../../../shared/ui";
import { useGraphInteraction } from "../../graph-interaction";

import { FileMetadataSection } from "./file-metadata-section";
import { ModuleLinkList } from "./module-link-list";

export function FileInspectorPanel() {
  const {
    focusedModuleId,
    dependencies,
    dependents,
    moduleFileStats,
    projectRootAbsolute,
    focusModule,
  } = useGraphInteraction();

  if (focusedModuleId === null) {
    return (
      <EmptyState
        title="No file selected"
        description="Select a file in the explorer or click a node in the graph."
      />
    );
  }

  const stats = moduleFileStats.get(focusedModuleId);

  return (
    <ScrollArea className="wb-inspector-root">
      <FileMetadataSection
        moduleId={focusedModuleId}
        stats={stats}
        projectRootAbsolute={projectRootAbsolute}
        dependencyCount={dependencies.length}
        dependentCount={dependents.length}
      />
      <ModuleLinkList
        title="Dependencies"
        items={dependencies}
        emptyLabel="This module has no resolved dependencies."
        onSelect={focusModule}
      />
      <ModuleLinkList
        title="Dependents"
        items={dependents}
        emptyLabel="No other module in the project depends on this file."
        onSelect={focusModule}
      />
    </ScrollArea>
  );
}