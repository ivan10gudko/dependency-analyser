import { beforeEach, describe, expect, it, vi } from "vitest";

import { fsdLayerPreset } from "../rules/fsd-preset";
import {
  defaultAnalysisSettings,
  loadAnalysisSettings,
  parseAnalysisSettings,
  saveAnalysisSettings,
} from "../settings";

describe("parseAnalysisSettings", () => {
  it("fills defaults for an empty payload", () => {
    expect(parseAnalysisSettings({})).toEqual(defaultAnalysisSettings());
  });

  it("keeps known flags and ignores invalid thresholds", () => {
    const parsed = parseAnalysisSettings({
      enabledRules: { "self-dependency": false, unknown: false },
      fanInThreshold: 0,
      fanOutThreshold: 4,
      entryPointMasks: [" src/boot.ts ", "src/boot.ts", ""],
    });

    expect(parsed.enabledRules["self-dependency"]).toBe(false);
    expect(parsed.enabledRules["circular-dependency"]).toBe(true);
    expect(parsed.fanInThreshold).toBe(10);
    expect(parsed.fanOutThreshold).toBe(4);
    expect(parsed.entryPointMasks).toEqual(["src/boot.ts"]);
    expect(parsed.layers).toEqual(fsdLayerPreset());
  });

  it("keeps an edited layer list and drops invalid rows", () => {
    const parsed = parseAnalysisSettings({
      layers: [
        { name: " ui ", mask: " src/ui/** ", sliced: true },
        { name: "", mask: "src/empty/**", sliced: true },
        { name: "ui", mask: "src/ui/**", sliced: false },
        { name: "other", mask: "src/ui/**", sliced: true },
        "features",
      ],
    });

    expect(parsed.layers).toEqual([{ name: "ui", mask: "src/ui/**", sliced: true }]);
  });

  it("treats an explicit empty layer list as no layers", () => {
    expect(parseAnalysisSettings({ layers: [] }).layers).toEqual([]);
  });
});

describe("loadAnalysisSettings", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    });
  });

  it("round-trips project settings", () => {
    const settings = defaultAnalysisSettings();
    settings.enabledRules["public-api"] = false;
    settings.fanInThreshold = 6;
    saveAnalysisSettings("/repo", settings);

    expect(loadAnalysisSettings("/repo").enabledRules["public-api"]).toBe(false);
    expect(loadAnalysisSettings("/repo").fanInThreshold).toBe(6);
    expect(loadAnalysisSettings(null)).toEqual(defaultAnalysisSettings());
  });
});
