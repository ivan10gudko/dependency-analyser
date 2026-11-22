import { describe, expect, it } from "vitest";

import { defaultAnalysisSettings } from "../settings";
import { fsdCrossSliceAnalyzer, fsdLayerAnalyzer } from "../rules/fsd-architecture";
import { buildFsdModel } from "../rules/fsd-preset";
import { publicApiAnalyzer } from "../rules/public-api";

import { graphOf } from "./graph-fixture";

const settings = defaultAnalysisSettings();

describe("buildFsdModel", () => {
  it("stays inactive when fewer than two layers are present", () => {
    const graph = graphOf([], ["src/features/auth/ui/form.tsx", "src/lib/util.ts"]);
    expect(buildFsdModel(graph)).toBeNull();
    expect(fsdLayerAnalyzer.run({ graph, settings })).toEqual([]);
    expect(fsdCrossSliceAnalyzer.run({ graph, settings })).toEqual([]);
  });

  it("gives shared no slices and ranks it below features", () => {
    const graph = graphOf([], ["src/shared/ui/button.tsx", "src/features/auth/ui/form.tsx"]);
    const model = buildFsdModel(graph);
    expect(model?.layers).toEqual(["shared", "features"]);
    expect(model?.placements.get("src/shared/ui/button.tsx")).toMatchObject({
      layer: "shared",
      slice: null,
    });
    expect(model?.placements.get("src/features/auth/ui/form.tsx")?.slice).toBe("auth");
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
    const graph = graphOf(
      [["src/features/auth/ui/form.tsx", "src/features/billing/index.ts"]],
      ["src/shared/ui/button.tsx"],
    );
    const issues = fsdCrossSliceAnalyzer.run({ graph, settings });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe("warning");
    expect(fsdLayerAnalyzer.run({ graph, settings })).toEqual([]);
  });

  it("allows imports inside shared", () => {
    const graph = graphOf([
      ["src/shared/ui/button.tsx", "src/shared/lib/format.ts"],
      ["src/features/auth/ui/form.tsx", "src/shared/ui/button.tsx"],
    ]);
    expect(fsdCrossSliceAnalyzer.run({ graph, settings })).toEqual([]);
    expect(fsdLayerAnalyzer.run({ graph, settings })).toEqual([]);
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
