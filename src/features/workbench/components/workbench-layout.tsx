import { useState } from "react";

import { useTheme } from "../../../shared/theme/use-theme";
import type { ProjectWorkspace } from "../../project/types/workspace";

import { FileExplorerPanel } from "./file-explorer-panel";
import { GraphPanel } from "./graph-panel";
import { usePanelLayout } from "../hooks/use-panel-layout";
import { TitleBar } from "./title-bar";
import { RightSidebar } from "./right-sidebar";
import { CollapsedRail, PanelSlot, ResizeHandle } from "./resizable-split";

import "../styles/workbench-layout.css";

export interface WorkbenchLayoutProps {
  workspace: ProjectWorkspace;
}

export function WorkbenchLayout({ workspace }: WorkbenchLayoutProps) {
  const { preference, setPreference } = useTheme();
  const panels = usePanelLayout();
  const [sidebarTab, setSidebarTab] = useState("problems");

  return (
    <main className="wb-root">
      <TitleBar
        workspace={workspace}
        themePreference={preference}
        onThemeChange={setPreference}
        onToggleLeft={panels.toggleLeft}
        onToggleRight={panels.toggleRight}
        leftVisible={panels.leftVisible}
        rightVisible={panels.rightVisible}
      />

      <div className="wb-main">
        {!panels.leftVisible && (
          <CollapsedRail label="Explorer" onExpand={panels.toggleLeft} />
        )}

        <PanelSlot visible={panels.leftVisible} width={panels.leftWidth}>
          <FileExplorerPanel workspace={workspace} />
        </PanelSlot>

        {panels.leftVisible && (
          <ResizeHandle onResize={panels.adjustLeftWidth} />
        )}

        <GraphPanel workspace={workspace} sidebarTab={sidebarTab} />

        {panels.rightVisible && (
          <ResizeHandle onResize={(delta) => panels.adjustRightWidth(-delta)} />
        )}

        {!panels.rightVisible && (
          <CollapsedRail label="Panel" onExpand={panels.toggleRight} />
        )}

        <PanelSlot visible={panels.rightVisible} width={panels.rightWidth}>
          <RightSidebar
            workspace={workspace}
            activeTab={sidebarTab}
            onActiveTabChange={setSidebarTab}
          />
        </PanelSlot>
      </div>
    </main>
  );
}