import { describe, expect, it } from "vitest";

import { buildModuleDependencyGraph } from "../../graph-data/build";
import type { AnalyzedModule } from "../../source-analyser/types";

import { buildBarrelAwareFocusVisual } from "../barrel-focus-visual";
import { buildBarrelDisplayGraph } from "../build-barrel-display-graph";
import { toBarrelNodeId } from "../barrel-node-id";

function graphFrom(modules: AnalyzedModule[]) {
  return buildModuleDependencyGraph(modules);
}

describe("buildBarrelAwareFocusVisual", () => {
  it("highlights the barrel and internal deps when index is focused", () => {
    const canonical = graphFrom([
      { path: "src/ui/index.ts", dependencies: ["src/ui/a.ts", "src/out.ts"] },
      { path: "src/ui/a.ts", dependencies: [] },
      { path: "src/out.ts", dependencies: [] },
      { path: "src/app.ts", dependencies: ["src/ui/index.ts"] },
    ]);

    const options = {
      barrelViewEnabled: true,
      expandedDirectories: new Set(["src/ui"]),
    };
    const display = buildBarrelDisplayGraph(canonical, options);
    const barrelId = toBarrelNodeId("src/ui");

    const visual = buildBarrelAwareFocusVisual(
      canonical,
      display,
      "src/ui/index.ts",
      options,
      1,
      "both",
    );

    expect(visual?.nodeStateById.get(barrelId)).toBe("focus");
    expect(visual?.nodeStateById.get("src/ui/a.ts")).toBe("related");
    expect(visual?.nodeStateById.get("src/out.ts")).toBe("related");
    expect(visual?.nodeStateById.get("src/app.ts")).toBe("related");
  });
});