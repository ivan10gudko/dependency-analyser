import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  graphInteractionReducer,
  parseConnectivityDepth,
  type GraphInteractionState,
} from "../graph-interaction-reducer";
import {
  DEFAULT_CONNECTIVITY_DEPTH,
  DEFAULT_FOCUS_DISPLAY_MODE,
  DEFAULT_NEIGHBORHOOD_DIRECTION,
} from "../types";

const baseState = (): GraphInteractionState => ({
  focusedModuleId: null,
  connectivityDepth: DEFAULT_CONNECTIVITY_DEPTH,
  neighborhoodDirection: DEFAULT_NEIGHBORHOOD_DIRECTION,
  focusDisplayMode: DEFAULT_FOCUS_DISPLAY_MODE,
  barrelViewEnabled: false,
  expandedBarrelDirectories: new Set(),
  showTestFiles: true,
  projectKey: null,
  folderMasks: [],
  fileMasks: [],
  locationColoringEnabled: false,
  locationAutoPresetsEnabled: true,
  locationColorRules: [],
  disabledLocationPresetIds: [],
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

describe("graphInteractionReducer focus display mode", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    });
  });

  it("persists isolated display mode", () => {
    const next = graphInteractionReducer(baseState(), {
      type: "SET_FOCUS_DISPLAY_MODE",
      mode: "isolated",
    });
    expect(next.focusDisplayMode).toBe("isolated");
    expect(localStorage.getItem("dependency-analyser.graph.focusDisplayMode")).toBe("isolated");
  });

  it("ignores duplicate display mode updates", () => {
    const isolated = graphInteractionReducer(baseState(), {
      type: "SET_FOCUS_DISPLAY_MODE",
      mode: "isolated",
    });
    const again = graphInteractionReducer(isolated, {
      type: "SET_FOCUS_DISPLAY_MODE",
      mode: "isolated",
    });
    expect(again).toBe(isolated);
  });

  it("keeps display mode across project reset", () => {
    const isolated = graphInteractionReducer(baseState(), {
      type: "SET_FOCUS_DISPLAY_MODE",
      mode: "isolated",
    });
    const reset = graphInteractionReducer(isolated, { type: "RESET", projectKey: "/repo" });
    expect(reset.focusDisplayMode).toBe("isolated");
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
    expect(reset.showTestFiles).toBe(true);
  });
});

describe("graphInteractionReducer filters", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    });
  });

  it("stores masks for the open project and reloads them on reset", () => {
    const opened = graphInteractionReducer(baseState(), {
      type: "RESET",
      projectKey: "/repo",
    });
    const withMasks = graphInteractionReducer(opened, {
      type: "ADD_FOLDER_MASKS",
      masks: [" src/legacy ", "src/legacy", "**/__tests__"],
    });
    const withFiles = graphInteractionReducer(withMasks, {
      type: "ADD_FILE_MASKS",
      masks: ["src/main.ts"],
    });
    expect(withFiles.folderMasks).toEqual(["src/legacy", "**/__tests__"]);
    expect(withFiles.fileMasks).toEqual(["src/main.ts"]);

    const otherProject = graphInteractionReducer(withFiles, {
      type: "RESET",
      projectKey: "/other",
    });
    expect(otherProject.folderMasks).toEqual([]);
    expect(otherProject.fileMasks).toEqual([]);

    const reopened = graphInteractionReducer(otherProject, {
      type: "RESET",
      projectKey: "/repo",
    });
    expect(reopened.folderMasks).toEqual(["src/legacy", "**/__tests__"]);
    expect(reopened.fileMasks).toEqual(["src/main.ts"]);
  });

  it("removes a mask and ignores a duplicate add", () => {
    const opened = graphInteractionReducer(
      { ...baseState(), projectKey: "/repo" },
      { type: "ADD_FILE_MASKS", masks: ["src/main.ts"] },
    );
    const duplicate = graphInteractionReducer(opened, {
      type: "ADD_FILE_MASKS",
      masks: ["src/main.ts"],
    });
    expect(duplicate).toBe(opened);

    const removed = graphInteractionReducer(opened, {
      type: "REMOVE_FILE_MASK",
      mask: "src/main.ts",
    });
    expect(removed.fileMasks).toEqual([]);
    const missing = graphInteractionReducer(removed, {
      type: "REMOVE_FILE_MASK",
      mask: "src/main.ts",
    });
    expect(missing).toBe(removed);
  });

  it("persists the test-file toggle and keeps it across projects", () => {
    const hidden = graphInteractionReducer(baseState(), {
      type: "SET_SHOW_TEST_FILES",
      enabled: false,
    });
    expect(hidden.showTestFiles).toBe(false);
    const reset = graphInteractionReducer(hidden, { type: "RESET", projectKey: "/repo" });
    expect(reset.showTestFiles).toBe(false);
  });
});

describe("graphInteractionReducer location colors", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    });
  });

  it("persists global toggles", () => {
    const enabled = graphInteractionReducer(baseState(), {
      type: "SET_LOCATION_COLORING",
      enabled: true,
    });
    expect(enabled.locationColoringEnabled).toBe(true);
    expect(localStorage.getItem("dependency-analyser.graph.locationColoringEnabled")).toBe("true");

    const autoOff = graphInteractionReducer(enabled, {
      type: "SET_LOCATION_AUTO_PRESETS",
      enabled: false,
    });
    expect(autoOff.locationAutoPresetsEnabled).toBe(false);
    expect(localStorage.getItem("dependency-analyser.graph.locationAutoPresetsEnabled")).toBe(
      "false",
    );
  });

  it("stores rules per project and reloads on reset", () => {
    const opened = graphInteractionReducer(baseState(), {
      type: "RESET",
      projectKey: "/repo",
    });
    const withRule = graphInteractionReducer(opened, {
      type: "ADD_LOCATION_COLOR_RULE",
      rule: { mask: "src/legacy/**", colorId: "rose" },
    });
    expect(withRule.locationColorRules).toEqual([{ mask: "src/legacy/**", colorId: "rose" }]);

    const other = graphInteractionReducer(withRule, {
      type: "RESET",
      projectKey: "/other",
    });
    expect(other.locationColorRules).toEqual([]);

    const reopened = graphInteractionReducer(other, {
      type: "RESET",
      projectKey: "/repo",
    });
    expect(reopened.locationColorRules).toEqual([{ mask: "src/legacy/**", colorId: "rose" }]);
  });

  it("stores disabled presets per project", () => {
    const opened = graphInteractionReducer(baseState(), {
      type: "RESET",
      projectKey: "/repo",
    });
    const disabled = graphInteractionReducer(opened, {
      type: "SET_LOCATION_PRESET_ENABLED",
      presetId: "features",
      enabled: false,
    });
    expect(disabled.disabledLocationPresetIds).toEqual(["features"]);

    const reenabled = graphInteractionReducer(disabled, {
      type: "SET_LOCATION_PRESET_ENABLED",
      presetId: "features",
      enabled: true,
    });
    expect(reenabled.disabledLocationPresetIds).toEqual([]);

    const disabledAgain = graphInteractionReducer(reenabled, {
      type: "SET_LOCATION_PRESET_ENABLED",
      presetId: "shared",
      enabled: false,
    });
    expect(
      localStorage.getItem("dependency-analyser.graph.disabledLocationPresets./repo"),
    ).toBe(JSON.stringify(["shared"]));

    const reopened = graphInteractionReducer(disabledAgain, {
      type: "RESET",
      projectKey: "/other",
    });
    expect(reopened.disabledLocationPresetIds).toEqual([]);

    const backToRepo = graphInteractionReducer(reopened, {
      type: "RESET",
      projectKey: "/repo",
    });
    expect(backToRepo.disabledLocationPresetIds).toEqual(["shared"]);
  });
});