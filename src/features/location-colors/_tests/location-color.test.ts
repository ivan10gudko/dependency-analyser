import { describe, expect, it } from "vitest";

import { listPresetActivity } from "../active-presets";
import { buildEffectiveLocationRules } from "../build-effective-rules";
import { buildLocationColorMap } from "../build-location-color-map";
import { resolveColorId } from "../resolve-location-color";

describe("resolveColorId", () => {
  it("returns first matching rule", () => {
    const rules = [
      { mask: "src/features/**", colorId: "green" as const },
      { mask: "**/features/**", colorId: "blue" as const },
    ];
    expect(resolveColorId("src/features/auth/model.ts", rules)).toBe("green");
  });

  it("returns null when nothing matches", () => {
    const rules = [{ mask: "src/legacy/**", colorId: "rose" as const }];
    expect(resolveColorId("src/app/main.ts", rules)).toBeNull();
  });
});

describe("buildEffectiveLocationRules", () => {
  const moduleIds = ["src/features/a.ts", "src/app/main.ts"];

  it("manual rules come before auto presets", () => {
    const effective = buildEffectiveLocationRules(
      [{ mask: "**/features/**", colorId: "rose" }],
      true,
      moduleIds,
    );
    const color = resolveColorId("src/features/a.ts", effective);
    expect(color).toBe("rose");
  });

  it("omits presets when auto is off", () => {
    const effective = buildEffectiveLocationRules([], false, moduleIds);
    expect(resolveColorId("src/features/a.ts", effective)).toBeNull();
  });

  it("includes active presets when auto is on", () => {
    const effective = buildEffectiveLocationRules([], true, moduleIds);
    expect(resolveColorId("src/app/main.ts", effective)).toBe("blue");
  });
});

describe("buildLocationColorMap", () => {
  it("maps only matching modules", () => {
    const map = buildLocationColorMap(
      ["src/features/a.ts", "src/other/b.ts"],
      [{ mask: "**/features/**", colorId: "green" }],
    );
    expect(map.get("src/features/a.ts")).toBe("green");
    expect(map.has("src/other/b.ts")).toBe(false);
  });
});

describe("listPresetActivity", () => {
  it("marks presets active when any module matches", () => {
    const activity = listPresetActivity(["src/features/graph/panel.tsx"]);
    const features = activity.find((entry) => entry.preset.id === "features");
    expect(features?.active).toBe(true);
    const app = activity.find((entry) => entry.preset.id === "app");
    expect(app?.active).toBe(false);
  });
});