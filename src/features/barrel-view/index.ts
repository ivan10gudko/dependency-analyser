export { buildBarrelAwareFocusVisual } from "./barrel-focus-visual";
export {
  buildBarrelDisplayGraph,
  buildProxyToBarrelMap,
  directoryForBarrelInteraction,
  isModuleHiddenInBarrelView,
  mapModuleIdToDisplay,
  resolveDisplayFocusModuleId,
} from "./build-barrel-display-graph";
export { detectBarrelFolders } from "./detect-barrel-folders";
export {
  BARREL_NODE_PREFIX,
  barrelFolderFromNodeId,
  folderLabel,
  isBarrelNodeId,
  parentDirectoryOfFolder,
  toBarrelNodeId,
} from "./barrel-node-id";
export type { BarrelDeepImport, BarrelDisplayOptions, BarrelFolderInfo } from "./types";