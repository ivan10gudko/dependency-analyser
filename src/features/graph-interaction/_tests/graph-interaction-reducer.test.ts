import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  graphInteractionReducer,
  parseConnectivityDepth,
  type GraphInteractionState,
} from "../graph-interaction-reducer";
import { DEFAULT_CONNECTIVITY_DEPTH, DEFAULT_NEIGHBORHOOD_DIRECTION } from "../types";

const baseState = (): GraphInteractionState => ({
  focusedModuleId: null,
  connectivityDepth: DEFAULT_CONNECTIVITY_DEPTH,
  neighborhoodDirection: DEFAULT_NEIGHBORHOOD_DIRECTION,
  barrelViewEnabled: false,
  expandedBarrelDirectories: new Set(),
});

describe("parseConnectivityDepth", () => {
  it("parses all", () => {
    expect(parseConnectivityDepth("all")).toBe("all");
  });

  it("returns default for null", () => {
    expect(parseConnectivityDepth(null)).toBe(DEFAULT_CONNECTIVITY_DEPTH);
  });

  it("parses positive integers", () => {
    expect(parseConnectivityDepth("3")).toBe(3);
    expect(parseConnectivityDepth("3.7")).toBe(3);
  });

  it("rejects invalid numbers", () => {
    expect(parseConnectivityDepth("0")).toBe(DEFAULT_CONNECTIVITY_DEPTH);
    expect(parseConnectivityDepth("nope")).toBe(DEFAULT_CONNECTIVITY_DEPTH);
  });
});

describe("graphInteractionReducer barrel view", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    });
  });

  it("persists toggle and clears expanded folders when barrel view is disabled", () => {
    const enabled = graphInteractionReducer(baseState(), {
      type: "SET_BARREL_VIEW",
      enabled: true,
    });
    const withExpand = graphInteractionReducer(enabled, {
      type: "TOGGLE_BARREL_EXPAND",
      directory: "src/ui",
    });
    expect(withExpand.expandedBarrelDirectories.has("src/ui")).toBe(true);

    const disabled = graphInteractionReducer(withExpand, {
      type: "SET_BARREL_VIEW",
      enabled: false,
    });
    expect(disabled.barrelViewEnabled).toBe(false);
    expect(disabled.expandedBarrelDirectories.size).toBe(0);
  });

  it("RESET clears expanded folders but keeps barrel preference", () => {
    const enabled = graphInteractionReducer(baseState(), {
      type: "SET_BARREL_VIEW",
      enabled: true,
    });
    const expanded = graphInteractionReducer(enabled, {
      type: "EXPAND_BARREL",
      directory: "src/ui",
    });
    const reset = graphInteractionReducer(expanded, { type: "RESET" });
    expect(reset.barrelViewEnabled).toBe(true);
    expect(reset.expandedBarrelDirectories.size).toBe(0);
    expect(reset.focusedModuleId).toBeNull();
  });
});