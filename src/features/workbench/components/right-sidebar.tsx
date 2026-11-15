import { useEffect, useRef, useState } from "react";

import { useGraphInteraction } from "../../graph-interaction";
import { Surface, Tab, TabList, TabPanel, Tabs } from "../../../shared/ui";
import type { ProjectWorkspace } from "../../project/types/workspace";

import { FileInspectorPanel } from "./file-inspector-panel";
import { FiltersPanel } from "./filters-panel";
import { GraphViewPanel } from "./graph-view-panel";
import { ProblemsPanel } from "./problems-panel";

export interface RightSidebarProps {
  workspace: ProjectWorkspace;
}

export function RightSidebar({ workspace }: RightSidebarProps) {
  const { focusedModuleId } = useGraphInteraction();
  const [activeTab, setActiveTab] = useState("problems");
  const autoSwitchedForProject = useRef<string | null>(null);

  useEffect(() => {
    if (!workspace.analysis || workspace.loading !== "idle") return;
    const key = workspace.projectRootAbsolute ?? "";
    if (autoSwitchedForProject.current === key) return;
    autoSwitchedForProject.current = key;
    setActiveTab("problems");
  }, [workspace.projectRootAbsolute, workspace.analysis, workspace.loading]);

  useEffect(() => {
    if (focusedModuleId !== null) {
      setActiveTab("file");
    }
  }, [focusedModuleId]);

  return (
    <Surface variant="sidebar" className="wb-side-panel wb-right-panel">
      <Tabs activeId={activeTab} onActiveIdChange={setActiveTab}>
        <TabList>
          <Tab id="problems">Problems</Tab>
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