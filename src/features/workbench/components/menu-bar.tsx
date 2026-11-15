import type { ThemePreference } from "../../../shared/theme/use-theme";
import { Menu, MenuBar, MenuItem, MenuSeparator } from "../../../shared/ui";
import type { ProjectWorkspace } from "../../project/types/workspace";

export interface WorkbenchMenuBarProps {
  workspace: ProjectWorkspace;
  themePreference: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  leftVisible: boolean;
  rightVisible: boolean;
  embedded?: boolean;
}

export function WorkbenchMenuBar({
  workspace,
  themePreference,
  onThemeChange,
  onToggleLeft,
  onToggleRight,
  leftVisible,
  rightVisible,
  embedded = false,
}: WorkbenchMenuBarProps) {
  return (
    <MenuBar className={embedded ? "ui-menubar--embedded" : undefined}>
      <Menu label="Project">
        <MenuItem onSelect={() => void workspace.openProject()} disabled={workspace.isBusy}>
          Open Project…
        </MenuItem>
        <MenuItem
          onSelect={workspace.closeProject}
          disabled={!workspace.projectRootAbsolute || workspace.isBusy}
        >
          Close Project
        </MenuItem>
      </Menu>

      <Menu label="File">
        <MenuItem onSelect={() => void workspace.openProject()} disabled={workspace.isBusy}>
          Open Project…
        </MenuItem>
      </Menu>

      <Menu label="View">
        <MenuItem
          checked={themePreference === "light"}
          onSelect={() => onThemeChange("light")}
        >
          Light Theme
        </MenuItem>
        <MenuItem
          checked={themePreference === "dark"}
          onSelect={() => onThemeChange("dark")}
        >
          Dark Theme
        </MenuItem>
        <MenuItem
          checked={themePreference === "system"}
          onSelect={() => onThemeChange("system")}
        >
          System Theme
        </MenuItem>
        <MenuSeparator />
        <MenuItem onSelect={onToggleLeft}>
          {leftVisible ? "Hide" : "Show"} Primary Side Bar
        </MenuItem>
        <MenuItem onSelect={onToggleRight}>
          {rightVisible ? "Hide" : "Show"} Secondary Side Bar
        </MenuItem>
      </Menu>

      <Menu label="Settings">
        <MenuItem disabled>Settings (next iteration)</MenuItem>
      </Menu>
    </MenuBar>
  );
}