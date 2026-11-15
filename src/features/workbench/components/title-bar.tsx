import { isTauri } from "@tauri-apps/api/core";

import type { ThemePreference } from "../../../shared/theme/use-theme";
import type { ProjectWorkspace } from "../../project/types/workspace";

import { WorkbenchMenuBar } from "./menu-bar";
import { WindowControls } from "./window-controls";

const APP_TITLE = "dependency-analyser";

export interface TitleBarProps {
  workspace: ProjectWorkspace;
  themePreference: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  leftVisible: boolean;
  rightVisible: boolean;
}

export function TitleBar(props: TitleBarProps) {
  const inTauri = isTauri();

  return (
    <header className="wb-titlebar ui-surface">
      <div className="wb-titlebar__menus">
        <WorkbenchMenuBar {...props} embedded />
      </div>

      <div className="wb-titlebar__drag" data-tauri-drag-region={inTauri ? true : undefined}>
        <span className="wb-titlebar__title">{APP_TITLE}</span>
      </div>

      {inTauri ? <WindowControls /> : null}
    </header>
  );
}