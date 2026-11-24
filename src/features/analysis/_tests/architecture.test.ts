import { describe, expect, it } from "vitest";

import { defaultAnalysisSettings } from "../settings";
import { buildArchitectureModel } from "../rules/architecture-model";
import { fsdCrossSliceAnalyzer, fsdLayerAnalyzer } from "../rules/fsd-architecture";
import { publicApiAnalyzer } from "../rules/public-api";
import type { ArchitectureLayer } from "../types";

import { graphOf } from "./graph-fixture";

const settings = defaultAnalysisSettings();

const friendAction = "app/features/manageFriends/hooks/useFriendAction.ts";
const friendProfile = "app/features/profile/index.ts";
const friendship = "app/entities/friendship/index.ts";
const sharedLib = "app/shared/lib/index.ts";
const sameSlice = "app/features/manageFriends/hooks/useFriends.ts";

describe("buildArchitectureModel", () => {
  it("places a sliced layer and ignores files outside every mask", () => {
    const graph = graphOf([], ["src/features/auth/ui/form.tsx", "src/lib/util.ts"]);
    const model = buildArchitectureModel(graph, settings.layers);
    expect(model.layers).toEqual(["features"]);
    expect(model.placements.get("src/lib/util.ts")).toBeUndefined();
    expect(model.placements.get("src/features/auth/ui/form.tsx")).toMatchObject({
      layer: "features",
      slice: "auth",
    });
    expect(fsdLayerAnalyzer.run({ graph, settings })).toEqual([]);
    expect(fsdCrossSliceAnalyzer.run({ graph, settings })).toEqual([]);
  });

  it("gives shared no slices and ranks it below features", () => {
    const graph = graphOf([], ["src/shared/ui/button.tsx", "src/features/auth/ui/form.tsx"]);
    const model = buildArchitectureModel(graph, settings.layers);
    expect(model.layers).toEqual(["shared", "features"]);
    expect(model.placements.get("src/shared/ui/button.tsx")).toMatchObject({
      layer: "shared",
      rank: 0,
      slice: null,
    });
    expect(model.placements.get("src/features/auth/ui/form.tsx")).toMatchObject({
      layer: "features",
      rank: 2,
      slice: "auth",
    });
  });

  it("prefers the deeper layer when app wraps features", () => {
    const graph = graphOf([], ["app/features/profile/index.ts", "app/root.tsx"]);
    const model = buildArchitectureModel(graph, settings.layers);
    expect(model.placements.get("app/features/profile/index.ts")).toMatchObject({
      layer: "features",
      slice: "profile",
    });
    expect(model.placements.get("app/root.tsx")).toMatchObject({
      layer: "app",
      slice: null,
    });
  });

  it("prefers the longer anchor when two masks sit at the same depth", () => {
    const layers: ArchitectureLayer[] = [
      { name: "features", mask: "**/features/**", sliced: true },
      { name: "app-features", mask: "app/features/**", sliced: true },
    ];
    const graph = graphOf([], ["app/features/profile/index.ts"]);
    const model = buildArchitectureModel(graph, layers);
    expect(model.placements.get("app/features/profile/index.ts")?.layer).toBe("app-features");
  });
});

describe("FSD architecture rules", () => {
  it("allows a downward import", () => {
    const graph = graphOf([
      ["src/features/auth/ui/form.tsx", "src/entities/user/index.ts"],
      ["src/shared/ui/button.tsx", "src/shared/lib/format.ts"],
    ]);
    expect(fsdLayerAnalyzer.run({ graph, settings })).toEqual([]);
    expect(fsdCrossSliceAnalyzer.run({ graph, settings })).toEqual([]);
  });

  it("reports an upward layer import", () => {
    const graph = graphOf([
      ["src/entities/user/model.ts", "src/features/auth/index.ts"],
    ]);
    const issues = fsdLayerAnalyzer.run({ graph, settings });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.edges).toEqual([
      { from: "src/entities/user/model.ts", to: "src/features/auth/index.ts" },
    ]);
  });

  it("reports a cross-slice import even through a public index", () => {
    const graph = graphOf([
      ["src/features/auth/ui/form.tsx", "src/features/billing/index.ts"],
    ]);
    const issues = fsdCrossSliceAnalyzer.run({ graph, settings });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe("warning");
    expect(fsdLayerAnalyzer.run({ graph, settings })).toEqual([]);
  });

  it("allows imports inside shared and inside one slice", () => {
    const graph = graphOf([
      ["src/shared/ui/button.tsx", "src/shared/lib/format.ts"],
      ["src/features/auth/ui/form.tsx", "src/shared/ui/button.tsx"],
      ["src/features/auth/ui/form.tsx", "src/features/auth/model.ts"],
    ]);
    expect(fsdCrossSliceAnalyzer.run({ graph, settings })).toEqual([]);
    expect(fsdLayerAnalyzer.run({ graph, settings })).toEqual([]);
  });

  it("reports a feature importing another feature under app", () => {
    const graph = graphOf([
      [friendAction, friendProfile],
      [friendAction, friendship],
      [friendAction, sharedLib],
      [friendAction, sameSlice],
    ]);
    const issues = fsdCrossSliceAnalyzer.run({ graph, settings });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.edges).toEqual([{ from: friendAction, to: friendProfile }]);
    expect(fsdLayerAnalyzer.run({ graph, settings })).toEqual([]);
  });

  it("reports an upward import from entities to features under app", () => {
    const graph = graphOf([[friendship, friendProfile]]);
    const issues = fsdLayerAnalyzer.run({ graph, settings });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.edges).toEqual([{ from: friendship, to: friendProfile }]);
    expect(fsdCrossSliceAnalyzer.run({ graph, settings })).toEqual([]);
  });

  it("follows a custom layer order", () => {
    const layers: ArchitectureLayer[] = [
      { name: "features", mask: "**/features/**", sliced: true },
      { name: "entities", mask: "**/entities/**", sliced: true },
    ];
    const custom = { ...settings, layers };
    const upward = graphOf([["src/features/auth/ui/form.tsx", "src/entities/user/index.ts"]]);
    expect(fsdLayerAnalyzer.run({ graph: upward, settings: custom })).toHaveLength(1);

    const downward = graphOf([["src/entities/user/index.ts", "src/features/auth/ui/form.tsx"]]);
    expect(fsdLayerAnalyzer.run({ graph: downward, settings: custom })).toEqual([]);
  });

  it("reports nothing when the layer list is empty", () => {
    const graph = graphOf([
      [friendAction, friendProfile],
      [friendship, friendProfile],
    ]);
    const empty = { ...settings, layers: [] };
    expect(fsdLayerAnalyzer.run({ graph, settings: empty })).toEqual([]);
    expect(fsdCrossSliceAnalyzer.run({ graph, settings: empty })).toEqual([]);
  });
});

describe("publicApiAnalyzer", () => {
  it("warns about a deep import and ignores an index import", () => {
    const graph = graphOf([
      ["src/app/main.tsx", "src/shared/ui/button.tsx"],
      ["src/app/page.tsx", "src/shared/ui/index.ts"],
      ["src/shared/ui/button.tsx", "src/shared/ui/icon.tsx"],
    ]);
    const issues = publicApiAnalyzer.run({ graph, settings });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain("src/app/main.tsx");
    expect(issues[0]?.message).toContain("src/shared/ui/button.tsx");
    expect(issues[0]?.edges).toEqual([
      { from: "src/app/main.tsx", to: "src/shared/ui/button.tsx" },
    ]);
  });
});
