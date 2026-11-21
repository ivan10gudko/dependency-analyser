import { readStringEnum, writeStringSetting } from "../../lib/persisted-setting";
import { mergeMasks, normalizeMasks } from "../graph-filters";
import {
  isLocationColorId,
  normalizeLocationColorRules,
  removeLocationColorRuleByMask,
  upsertLocationColorRule,
  type LocationColorRule,
} from "../location-colors";
import type { ModuleId } from "../project/types";

import {
  DEFAULT_CONNECTIVITY_DEPTH,
  DEFAULT_FOCUS_DISPLAY_MODE,
  DEFAULT_NEIGHBORHOOD_DIRECTION,
  FOCUS_DISPLAY_MODES,
  NEIGHBORHOOD_DIRECTIONS,
  type ConnectivityDepth,
  type FocusDisplayMode,
  type NeighborhoodDirection,
} from "./types";

const DEPTH_STORAGE_KEY = "dependency-analyser.graph.connectivityDepth";
const DIRECTION_STORAGE_KEY = "dependency-analyser.graph.neighborhoodDirection";
const FOCUS_DISPLAY_MODE_KEY = "dependency-analyser.graph.focusDisplayMode";
const BARREL_VIEW_STORAGE_KEY = "dependency-analyser.graph.barrelViewEnabled";
const SHOW_TEST_FILES_KEY = "dependency-analyser.graph.showTestFiles";
const FILTERS_KEY_PREFIX = "dependency-analyser.graph.filters.";
const LOCATION_COLORING_KEY = "dependency-analyser.graph.locationColoringEnabled";
const LOCATION_AUTO_PRESETS_KEY = "dependency-analyser.graph.locationAutoPresetsEnabled";
const LOCATION_RULES_KEY_PREFIX = "dependency-analyser.graph.locationColors.";

export interface GraphInteractionState {
  focusedModuleId: ModuleId | null;
  connectivityDepth: ConnectivityDepth;
  neighborhoodDirection: NeighborhoodDirection;
  focusDisplayMode: FocusDisplayMode;
  barrelViewEnabled: boolean;
  expandedBarrelDirectories: Set<string>;
  showTestFiles: boolean;
  projectKey: string | null;
  folderMasks: string[];
  fileMasks: string[];
  locationColoringEnabled: boolean;
  locationAutoPresetsEnabled: boolean;
  locationColorRules: LocationColorRule[];
}

export type GraphInteractionAction =
  | { type: "FOCUS"; id: ModuleId }
  | { type: "CLEAR" }
  | { type: "SET_DEPTH"; depth: ConnectivityDepth }
  | { type: "SET_DIRECTION"; direction: NeighborhoodDirection }
  | { type: "SET_FOCUS_DISPLAY_MODE"; mode: FocusDisplayMode }
  | { type: "SET_BARREL_VIEW"; enabled: boolean }
  | { type: "TOGGLE_BARREL_EXPAND"; directory: string }
  | { type: "EXPAND_BARREL"; directory: string }
  | { type: "SET_SHOW_TEST_FILES"; enabled: boolean }
  | { type: "ADD_FOLDER_MASKS"; masks: readonly string[] }
  | { type: "REMOVE_FOLDER_MASK"; mask: string }
  | { type: "ADD_FILE_MASKS"; masks: readonly string[] }
  | { type: "REMOVE_FILE_MASK"; mask: string }
  | { type: "SET_LOCATION_COLORING"; enabled: boolean }
  | { type: "SET_LOCATION_AUTO_PRESETS"; enabled: boolean }
  | { type: "ADD_LOCATION_COLOR_RULE"; rule: LocationColorRule }
  | { type: "SET_LOCATION_COLOR_RULE"; rule: LocationColorRule }
  | { type: "REMOVE_LOCATION_COLOR_RULE"; mask: string }
  | { type: "RESET"; projectKey?: string | null };

export function parseConnectivityDepth(raw: string | null): ConnectivityDepth {
  if (raw === "all") return "all";
  if (raw === null) return DEFAULT_CONNECTIVITY_DEPTH;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1) return DEFAULT_CONNECTIVITY_DEPTH;
  return Math.floor(value);
}

export function loadStoredConnectivityDepth(): ConnectivityDepth {
  return parseConnectivityDepth(localStorage.getItem(DEPTH_STORAGE_KEY));
}

export function persistConnectivityDepth(depth: ConnectivityDepth): void {
  writeStringSetting(DEPTH_STORAGE_KEY, String(depth));
}

export function loadStoredNeighborhoodDirection(): NeighborhoodDirection {
  return readStringEnum(
    DIRECTION_STORAGE_KEY,
    NEIGHBORHOOD_DIRECTIONS,
    DEFAULT_NEIGHBORHOOD_DIRECTION,
  );
}

export function persistNeighborhoodDirection(direction: NeighborhoodDirection): void {
  writeStringSetting(DIRECTION_STORAGE_KEY, direction);
}

export function loadStoredFocusDisplayMode(): FocusDisplayMode {
  return readStringEnum(
    FOCUS_DISPLAY_MODE_KEY,
    FOCUS_DISPLAY_MODES,
    DEFAULT_FOCUS_DISPLAY_MODE,
  );
}

export function persistFocusDisplayMode(mode: FocusDisplayMode): void {
  writeStringSetting(FOCUS_DISPLAY_MODE_KEY, mode);
}

export function loadStoredBarrelViewEnabled(): boolean {
  return localStorage.getItem(BARREL_VIEW_STORAGE_KEY) === "true";
}

export function persistBarrelViewEnabled(enabled: boolean): void {
  writeStringSetting(BARREL_VIEW_STORAGE_KEY, String(enabled));
}

export function loadStoredShowTestFiles(): boolean {
  const raw = localStorage.getItem(SHOW_TEST_FILES_KEY);
  if (raw === null) return true;
  return raw === "true";
}

export function persistShowTestFiles(enabled: boolean): void {
  writeStringSetting(SHOW_TEST_FILES_KEY, String(enabled));
}

export function loadStoredLocationColoringEnabled(): boolean {
  return localStorage.getItem(LOCATION_COLORING_KEY) === "true";
}

export function persistLocationColoringEnabled(enabled: boolean): void {
  writeStringSetting(LOCATION_COLORING_KEY, String(enabled));
}

export function loadStoredLocationAutoPresetsEnabled(): boolean {
  const raw = localStorage.getItem(LOCATION_AUTO_PRESETS_KEY);
  if (raw === null) return true;
  return raw === "true";
}

export function persistLocationAutoPresetsEnabled(enabled: boolean): void {
  writeStringSetting(LOCATION_AUTO_PRESETS_KEY, String(enabled));
}

export function loadStoredLocationColorRules(projectKey: string | null): LocationColorRule[] {
  if (!projectKey) return [];
  try {
    const raw = localStorage.getItem(locationRulesStorageKey(projectKey));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const rules: LocationColorRule[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const record = item as { mask?: unknown; colorId?: unknown };
      if (typeof record.mask !== "string") continue;
      if (typeof record.colorId !== "string" || !isLocationColorId(record.colorId)) continue;
      rules.push({ mask: record.mask, colorId: record.colorId });
    }
    return normalizeLocationColorRules(rules);
  } catch {
    return [];
  }
}

function persistLocationColorRules(
  projectKey: string | null,
  rules: readonly LocationColorRule[],
): void {
  if (!projectKey) return;
  writeStringSetting(
    locationRulesStorageKey(projectKey),
    JSON.stringify(rules),
  );
}

function locationRulesStorageKey(projectKey: string): string {
  return `${LOCATION_RULES_KEY_PREFIX}${projectKey}`;
}

export function loadStoredGraphFilters(projectKey: string | null): {
  folderMasks: string[];
  fileMasks: string[];
} {
  if (!projectKey) return { folderMasks: [], fileMasks: [] };
  try {
    const raw = localStorage.getItem(filtersStorageKey(projectKey));
    if (!raw) return { folderMasks: [], fileMasks: [] };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { folderMasks: [], fileMasks: [] };
    const record = parsed as { folderMasks?: unknown; fileMasks?: unknown };
    return {
      folderMasks: normalizeMasks(stringList(record.folderMasks)),
      fileMasks: normalizeMasks(stringList(record.fileMasks)),
    };
  } catch {
    return { folderMasks: [], fileMasks: [] };
  }
}

function persistGraphFilters(
  projectKey: string | null,
  folderMasks: readonly string[],
  fileMasks: readonly string[],
): void {
  if (!projectKey) return;
  writeStringSetting(
    filtersStorageKey(projectKey),
    JSON.stringify({ folderMasks, fileMasks }),
  );
}

function filtersStorageKey(projectKey: string): string {
  return `${FILTERS_KEY_PREFIX}${projectKey}`;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function sameMasks(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((mask, index) => mask === right[index]);
}

function sameLocationRules(
  left: readonly LocationColorRule[],
  right: readonly LocationColorRule[],
): boolean {
  if (left.length !== right.length) return false;
  return left.every(
    (rule, index) =>
      rule.mask === right[index]!.mask && rule.colorId === right[index]!.colorId,
  );
}

export function graphInteractionReducer(
  state: GraphInteractionState,
  action: GraphInteractionAction,
): GraphInteractionState {
  switch (action.type) {
    case "FOCUS":
      if (state.focusedModuleId === action.id) return state;
      return { ...state, focusedModuleId: action.id };
    case "CLEAR":
      if (state.focusedModuleId === null) return state;
      return { ...state, focusedModuleId: null };
    case "SET_DEPTH":
      if (state.connectivityDepth === action.depth) return state;
      persistConnectivityDepth(action.depth);
      return { ...state, connectivityDepth: action.depth };
    case "SET_DIRECTION":
      if (state.neighborhoodDirection === action.direction) return state;
      persistNeighborhoodDirection(action.direction);
      return { ...state, neighborhoodDirection: action.direction };
    case "SET_FOCUS_DISPLAY_MODE":
      if (state.focusDisplayMode === action.mode) return state;
      persistFocusDisplayMode(action.mode);
      return { ...state, focusDisplayMode: action.mode };
    case "SET_BARREL_VIEW":
      if (state.barrelViewEnabled === action.enabled) return state;
      persistBarrelViewEnabled(action.enabled);
      return {
        ...state,
        barrelViewEnabled: action.enabled,
        expandedBarrelDirectories: new Set(),
      };
    case "TOGGLE_BARREL_EXPAND": {
      const next = new Set(state.expandedBarrelDirectories);
      if (next.has(action.directory)) next.delete(action.directory);
      else next.add(action.directory);
      return { ...state, expandedBarrelDirectories: next };
    }
    case "EXPAND_BARREL": {
      if (state.expandedBarrelDirectories.has(action.directory)) return state;
      const next = new Set(state.expandedBarrelDirectories);
      next.add(action.directory);
      return { ...state, expandedBarrelDirectories: next };
    }
    case "SET_SHOW_TEST_FILES":
      if (state.showTestFiles === action.enabled) return state;
      persistShowTestFiles(action.enabled);
      return { ...state, showTestFiles: action.enabled };
    case "ADD_FOLDER_MASKS": {
      const folderMasks = mergeMasks(state.folderMasks, action.masks);
      if (sameMasks(state.folderMasks, folderMasks)) return state;
      persistGraphFilters(state.projectKey, folderMasks, state.fileMasks);
      return { ...state, folderMasks };
    }
    case "REMOVE_FOLDER_MASK": {
      if (!state.folderMasks.includes(action.mask)) return state;
      const folderMasks = state.folderMasks.filter((mask) => mask !== action.mask);
      persistGraphFilters(state.projectKey, folderMasks, state.fileMasks);
      return { ...state, folderMasks };
    }
    case "ADD_FILE_MASKS": {
      const fileMasks = mergeMasks(state.fileMasks, action.masks);
      if (sameMasks(state.fileMasks, fileMasks)) return state;
      persistGraphFilters(state.projectKey, state.folderMasks, fileMasks);
      return { ...state, fileMasks };
    }
    case "REMOVE_FILE_MASK": {
      if (!state.fileMasks.includes(action.mask)) return state;
      const fileMasks = state.fileMasks.filter((mask) => mask !== action.mask);
      persistGraphFilters(state.projectKey, state.folderMasks, fileMasks);
      return { ...state, fileMasks };
    }
    case "SET_LOCATION_COLORING":
      if (state.locationColoringEnabled === action.enabled) return state;
      persistLocationColoringEnabled(action.enabled);
      return { ...state, locationColoringEnabled: action.enabled };
    case "SET_LOCATION_AUTO_PRESETS":
      if (state.locationAutoPresetsEnabled === action.enabled) return state;
      persistLocationAutoPresetsEnabled(action.enabled);
      return { ...state, locationAutoPresetsEnabled: action.enabled };
    case "ADD_LOCATION_COLOR_RULE":
    case "SET_LOCATION_COLOR_RULE": {
      const locationColorRules = upsertLocationColorRule(
        state.locationColorRules,
        action.rule,
      );
      if (sameLocationRules(state.locationColorRules, locationColorRules)) return state;
      persistLocationColorRules(state.projectKey, locationColorRules);
      return { ...state, locationColorRules };
    }
    case "REMOVE_LOCATION_COLOR_RULE": {
      const locationColorRules = removeLocationColorRuleByMask(
        state.locationColorRules,
        action.mask,
      );
      if (sameLocationRules(state.locationColorRules, locationColorRules)) return state;
      persistLocationColorRules(state.projectKey, locationColorRules);
      return { ...state, locationColorRules };
    }
    case "RESET": {
      const projectKey = action.projectKey ?? null;
      const filters = loadStoredGraphFilters(projectKey);
      const locationColorRules = loadStoredLocationColorRules(projectKey);
      return {
        focusedModuleId: null,
        connectivityDepth: state.connectivityDepth,
        neighborhoodDirection: state.neighborhoodDirection,
        focusDisplayMode: state.focusDisplayMode,
        barrelViewEnabled: state.barrelViewEnabled,
        expandedBarrelDirectories: new Set(),
        showTestFiles: state.showTestFiles,
        projectKey,
        folderMasks: filters.folderMasks,
        fileMasks: filters.fileMasks,
        locationColoringEnabled: state.locationColoringEnabled,
        locationAutoPresetsEnabled: state.locationAutoPresetsEnabled,
        locationColorRules,
      };
    }
    default:
      return state;
  }
}

export function createInitialGraphInteractionState(): GraphInteractionState {
  return {
    focusedModuleId: null,
    connectivityDepth: loadStoredConnectivityDepth(),
    neighborhoodDirection: loadStoredNeighborhoodDirection(),
    focusDisplayMode: loadStoredFocusDisplayMode(),
    barrelViewEnabled: loadStoredBarrelViewEnabled(),
    expandedBarrelDirectories: new Set(),
    showTestFiles: loadStoredShowTestFiles(),
    projectKey: null,
    folderMasks: [],
    fileMasks: [],
    locationColoringEnabled: loadStoredLocationColoringEnabled(),
    locationAutoPresetsEnabled: loadStoredLocationAutoPresetsEnabled(),
    locationColorRules: [],
  };
}