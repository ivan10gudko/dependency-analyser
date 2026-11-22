import { beforeEach, describe, expect, it, vi } from "vitest";

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
