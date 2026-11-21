import { readStringEnum, writeStringSetting } from "../../lib/persisted-setting";
import type { ModuleId } from "../project/types";

import {
  DEFAULT_CONNECTIVITY_DEPTH,
  DEFAULT_NEIGHBORHOOD_DIRECTION,
  NEIGHBORHOOD_DIRECTIONS,
  type ConnectivityDepth,
  type NeighborhoodDirection,
} from "./types";

const DEPTH_STORAGE_KEY = "dependency-analyser.graph.connectivityDepth";
const DIRECTION_STORAGE_KEY = "dependency-analyser.graph.neighborhoodDirection";
const BARREL_VIEW_STORAGE_KEY = "dependency-analyser.graph.barrelViewEnabled";

export interface GraphInteractionState {
  focusedModuleId: ModuleId | null;
  connectivityDepth: ConnectivityDepth;
  neighborhoodDirection: NeighborhoodDirection;
  barrelViewEnabled: boolean;
  expandedBarrelDirectories: Set<string>;
}

export type GraphInteractionAction =
  | { type: "FOCUS"; id: ModuleId }
  | { type: "CLEAR" }
  | { type: "SET_DEPTH"; depth: ConnectivityDepth }
  | { type: "SET_DIRECTION"; direction: NeighborhoodDirection }
  | { type: "SET_BARREL_VIEW"; enabled: boolean }
  | { type: "TOGGLE_BARREL_EXPAND"; directory: string }
  | { type: "EXPAND_BARREL"; directory: string }
  | { type: "RESET" };

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

export function loadStoredBarrelViewEnabled(): boolean {
  return localStorage.getItem(BARREL_VIEW_STORAGE_KEY) === "true";
}

export function persistBarrelViewEnabled(enabled: boolean): void {
  writeStringSetting(BARREL_VIEW_STORAGE_KEY, String(enabled));
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
    case "RESET":
      return {
        focusedModuleId: null,
        connectivityDepth: state.connectivityDepth,
        neighborhoodDirection: state.neighborhoodDirection,
        barrelViewEnabled: state.barrelViewEnabled,
        expandedBarrelDirectories: new Set(),
      };
    default:
      return state;
  }
}

export function createInitialGraphInteractionState(): GraphInteractionState {
  return {
    focusedModuleId: null,
    connectivityDepth: loadStoredConnectivityDepth(),
    neighborhoodDirection: loadStoredNeighborhoodDirection(),
    barrelViewEnabled: loadStoredBarrelViewEnabled(),
    expandedBarrelDirectories: new Set(),
  };
}