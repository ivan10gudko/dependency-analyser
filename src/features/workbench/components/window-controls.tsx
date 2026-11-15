import { MinusIcon, SquareIcon, XIcon } from "@phosphor-icons/react";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { IconButton } from "../../../shared/ui";

export function WindowControls() {
  const appWindow = getCurrentWindow();

  return (
    <div className="wb-window-controls" data-tauri-drag-region="false">
      <IconButton
        label="Minimize"
        className="wb-window-controls__btn"
        onClick={() => void appWindow.minimize()}
      >
        <MinusIcon size={14} weight="bold" />
      </IconButton>
      <IconButton
        label="Maximize"
        className="wb-window-controls__btn"
        onClick={() => void appWindow.toggleMaximize()}
      >
        <SquareIcon size={12} weight="bold" />
      </IconButton>
      <IconButton
        label="Close"
        className="wb-window-controls__btn wb-window-controls__btn--close"
        onClick={() => void appWindow.close()}
      >
        <XIcon size={14} weight="bold" />
      </IconButton>
    </div>
  );
}