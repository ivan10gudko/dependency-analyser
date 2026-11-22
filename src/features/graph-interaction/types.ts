import type { ModuleDependencyGraph } from "../graph-data/types";
import type { LocationColorId, LocationColorRule } from "../location-colors";
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

export const FOCUS_DISPLAY_MODES = ["dimmed", "isolated"] as const;

export type FocusDisplayMode = (typeof FOCUS_DISPLAY_MODES)[number];

export const DEFAULT_FOCUS_DISPLAY_MODE: FocusDisplayMode = "dimmed";

export function isFocusDisplayMode(raw: string): raw is FocusDisplayMode {
  return (FOCUS_DISPLAY_MODES as readonly string[]).includes(raw);
}

export const FOCUS_SOURCES = ["user", "issue"] as const;

export type FocusSource = (typeof FOCUS_SOURCES)[number];

export type NodeVisualState =
  | "default"
  | "dimmed"
  | "ancestor"
  | "descendant"
  | "related"
  | "focus";

export type EdgeVisualState =
  | "default"
  | "dimmed"
  | "ancestor"
  | "descendant"
  | "highlighted";

export function isHighlightedNodeState(state: NodeVisualState): boolean {
  return (
    state === "focus" ||
    state === "related" ||
    state === "ancestor" ||
    state === "descendant"
  );
}

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
  focusSource: FocusSource;
  displayFocusModuleId: ModuleId | null;
  connectivityDepth: ConnectivityDepth;
  neighborhoodDirection: NeighborhoodDirection;
  focusDisplayMode: FocusDisplayMode;
  barrelViewEnabled: boolean;
  expandedBarrelDirectories: ReadonlySet<string>;
  showTestFiles: boolean;
  folderMasks: readonly string[];
  fileMasks: readonly string[];
  moduleIds: readonly string[];
  locationColoringEnabled: boolean;
  locationAutoPresetsEnabled: boolean;
  locationColorRules: readonly LocationColorRule[];
  disabledLocationPresetIds: readonly string[];
  locationColorByModuleId: ReadonlyMap<ModuleId, LocationColorId> | null;
  focusVisual: GraphFocusVisual | null;
  displayGraph: ModuleDependencyGraph | null;
  layoutDisplayGraph: ModuleDependencyGraph | null;
  dependencies: readonly ModuleLinkItem[];
  dependents: readonly ModuleLinkItem[];
  moduleFileStats: ReadonlyMap<ModuleId, ModuleFileStats>;
  projectRootAbsolute: string | null;
  focusModule: (id: ModuleId, source?: FocusSource) => void;
  clearFocus: () => void;
  setConnectivityDepth: (depth: ConnectivityDepth) => void;
  setNeighborhoodDirection: (direction: NeighborhoodDirection) => void;
  setFocusDisplayMode: (mode: FocusDisplayMode) => void;
  setBarrelViewEnabled: (enabled: boolean) => void;
  toggleBarrelExpand: (barrelNodeId: string) => void;
  setShowTestFiles: (enabled: boolean) => void;
  addFolderMasks: (masks: readonly string[]) => void;
  removeFolderMask: (mask: string) => void;
  addFileMasks: (masks: readonly string[]) => void;
  removeFileMask: (mask: string) => void;
  setLocationColoringEnabled: (enabled: boolean) => void;
  setLocationAutoPresetsEnabled: (enabled: boolean) => void;
  addLocationColorRule: (rule: LocationColorRule) => void;
  setLocationColorRule: (rule: LocationColorRule) => void;
  removeLocationColorRule: (mask: string) => void;
  setLocationPresetEnabled: (presetId: string, enabled: boolean) => void;
}