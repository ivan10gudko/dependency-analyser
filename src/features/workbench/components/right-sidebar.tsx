import { useEffect, useState } from "react";

import { Surface, Tab, TabList, TabPanel, Tabs } from "../../../shared/ui";
import type { ProjectWorkspace } from "../../project/types/workspace";

import { FiltersPanel } from "./filters-panel";
import { ProblemsPanel } from "./problems-panel";

export interface RightSidebarProps {
  workspace: ProjectWorkspace;
}

export function RightSidebar({ workspace }: RightSidebarProps) {
  const [activeTab, setActiveTab] = useState("problems");

  useEffect(() => {
    if (workspace.analysis && workspace.loading === "idle") {
      setActiveTab("problems");
    }
  }, [workspace.projectRootAbsolute, workspace.analysis, workspace.loading]);

  return (
    <Surface variant="sidebar" className="wb-side-panel wb-right-panel">
      <Tabs activeId={activeTab} onActiveIdChange={setActiveTab}>
        <TabList>
          <Tab id="problems">Problems</Tab>
          <Tab id="filters">Filters</Tab>
        </TabList>
        <TabPanel id="problems">
          <ProblemsPanel workspace={workspace} />
        </TabPanel>
        <TabPanel id="filters">
          <FiltersPanel />
        </TabPanel>
      </Tabs>
    </Surface>
  );
}