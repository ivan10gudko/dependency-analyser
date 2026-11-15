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

export interface GraphInteractionState {
  focusedModuleId: ModuleId | null;
  connectivityDepth: ConnectivityDepth;
  neighborhoodDirection: NeighborhoodDirection;
}

export type GraphInteractionAction =
  | { type: "FOCUS"; id: ModuleId }
  | { type: "CLEAR" }
  | { type: "SET_DEPTH"; depth: ConnectivityDepth }
  | { type: "SET_DIRECTION"; direction: NeighborhoodDirection }
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
    case "RESET":
      return {
        focusedModuleId: null,
        connectivityDepth: state.connectivityDepth,
        neighborhoodDirection: state.neighborhoodDirection,
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
  };
}