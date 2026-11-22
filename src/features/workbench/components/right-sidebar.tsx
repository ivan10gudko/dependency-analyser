import { useEffect, useRef } from "react";

import { useAnalysis } from "../../analysis";
import { useGraphInteraction } from "../../graph-interaction";
import { Surface, Tab, TabList, TabPanel, Tabs } from "../../../shared/ui";
import type { ProjectWorkspace } from "../../project/types/workspace";

import { FileInspectorPanel } from "./file-inspector-panel";
import { FiltersPanel } from "./filters-panel";
import { GraphViewPanel } from "./graph-view-panel";
import { ProblemsPanel } from "./problems-panel";

export interface RightSidebarProps {
  workspace: ProjectWorkspace;
  activeTab: string;
  onActiveTabChange: (tab: string) => void;
}

export function RightSidebar({
  workspace,
  activeTab,
  onActiveTabChange,
}: RightSidebarProps) {
  const { focusedModuleId, focusSource } = useGraphInteraction();
  const { report } = useAnalysis();
  const autoSwitchedForProject = useRef<string | null>(null);

  useEffect(() => {
    if (!workspace.analysis || workspace.loading !== "idle") return;
    const key = workspace.projectRootAbsolute ?? "";
    if (autoSwitchedForProject.current === key) return;
    autoSwitchedForProject.current = key;
    onActiveTabChange("problems");
  }, [workspace.projectRootAbsolute, workspace.analysis, workspace.loading, onActiveTabChange]);

  useEffect(() => {
    if (focusedModuleId !== null && focusSource !== "issue") {
      onActiveTabChange("file");
    }
  }, [focusedModuleId, focusSource, onActiveTabChange]);

  return (
    <Surface variant="sidebar" className="wb-side-panel wb-right-panel">
      <Tabs activeId={activeTab} onActiveIdChange={onActiveTabChange}>
        <TabList>
          <Tab id="problems">
            Problems
            {workspace.dependencyGraph && (
              <span
                className="wb-issues-tab-counts"
                aria-label={`${report.counts.error} errors, ${report.counts.warning} warnings, ${report.counts.info} info`}
              >
                <span className="is-error">{report.counts.error}</span>
                <span className="is-warning">{report.counts.warning}</span>
                <span className="is-info">{report.counts.info}</span>
              </span>
            )}
          </Tab>
          <Tab id="file">File</Tab>
          <Tab id="view">View</Tab>
          <Tab id="filters">Filters</Tab>
        </TabList>
        <TabPanel id="problems">
          <ProblemsPanel workspace={workspace} />
        </TabPanel>
        <TabPanel id="file">
          <FileInspectorPanel />
        </TabPanel>
        <TabPanel id="view">
          <GraphViewPanel />
        </TabPanel>
        <TabPanel id="filters">
          <FiltersPanel />
        </TabPanel>
      </Tabs>
    </Surface>
  );
}