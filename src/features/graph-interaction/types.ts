import type { ModuleDependencyGraph } from "../graph-data/types";
import type { ModuleId } from "../project/types";
import type { ModuleFileStats } from "../project/module-file-stats";

export type ConnectivityDepth = number | "all";

export const DEFAULT_CONNECTIVITY_DEPTH: ConnectivityDepth = 1;

export const NEIGHBORHOOD_DIRECTIONS = ["both", "dependencies", "dependents"] as const;

/** Edge A → B means A depends on B. Walk outgoing, incoming, or both. */
export type NeighborhoodDirection = (typeof NEIGHBORHOOD_DIRECTIONS)[number];

export const DEFAULT_NEIGHBORHOOD_DIRECTION: NeighborhoodDirection = "both";

export function isNeighborhoodDirection(raw: string): raw is NeighborhoodDirection {
  return (NEIGHBORHOOD_DIRECTIONS as readonly string[]).includes(raw);
}

export type NodeVisualState = "default" | "dimmed" | "related" | "focus";

export type EdgeVisualState = "default" | "dimmed" | "highlighted";

export interface GraphFocusVisual {
  active: boolean;
  nodeStateById: ReadonlyMap<ModuleId, NodeVisualState>;
  edgeStateByKey: ReadonlyMap<string, EdgeVisualState>;
}

export interface ModuleLinkItem {
  id: ModuleId;
  name: string;
}

export interface GraphInteractionValue {
  focusedModuleId: ModuleId | null;
  displayFocusModuleId: ModuleId | null;
  connectivityDepth: ConnectivityDepth;
  neighborhoodDirection: NeighborhoodDirection;
  barrelViewEnabled: boolean;
  expandedBarrelDirectories: ReadonlySet<string>;
  showTestFiles: boolean;
  folderMasks: readonly string[];
  fileMasks: readonly string[];
  moduleIds: readonly string[];
  focusVisual: GraphFocusVisual | null;
  displayGraph: ModuleDependencyGraph | null;
  dependencies: readonly ModuleLinkItem[];
  dependents: readonly ModuleLinkItem[];
  moduleFileStats: ReadonlyMap<ModuleId, ModuleFileStats>;
  projectRootAbsolute: string | null;
  focusModule: (id: ModuleId) => void;
  clearFocus: () => void;
  setConnectivityDepth: (depth: ConnectivityDepth) => void;
  setNeighborhoodDirection: (direction: NeighborhoodDirection) => void;
  setBarrelViewEnabled: (enabled: boolean) => void;
  toggleBarrelExpand: (barrelNodeId: string) => void;
  setShowTestFiles: (enabled: boolean) => void;
  addFolderMasks: (masks: readonly string[]) => void;
  removeFolderMask: (mask: string) => void;
  addFileMasks: (masks: readonly string[]) => void;
  removeFileMask: (mask: string) => void;
}