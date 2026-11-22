import { describe, expect, it } from "vitest";

import { defaultAnalysisSettings } from "../settings";
import { resolveEntryPoints } from "../rules/entry-points";
import { highCouplingAnalyzer } from "../rules/high-coupling";
import { unreachableModuleAnalyzer } from "../rules/unreachable-modules";
import { unusedModuleAnalyzer } from "../rules/unused-modules";

import { graphOf } from "./graph-fixture";

describe("resolveEntryPoints", () => {
  it("uses preferred roots when they exist", () => {
    const graph = graphOf(
      [
        ["src/main.tsx", "src/app.tsx"],
        ["src/orphan.ts", "src/app.tsx"],
      ],
      ["src/other.ts"],
    );
    const resolved = resolveEntryPoints(graph, []);
    expect(resolved.explicit).toBe(true);
    expect([...resolved.moduleIds]).toEqual(["src/main.tsx"]);
  });

  it("adds modules that match extra masks", () => {
    const graph = graphOf([], ["src/main.tsx", "src/boot/cli.ts"]);
    const resolved = resolveEntryPoints(graph, ["src/boot/**"]);
    expect([...resolved.moduleIds].sort()).toEqual(["src/boot/cli.ts", "src/main.tsx"]);
  });

  it("falls back to non-special sources when nothing matches", () => {
    const graph = graphOf(
      [["src/lib/util.ts", "src/lib/math.ts"]],
      ["src/lib/util.test.ts", "src/types.d.ts"],
    );
    const resolved = resolveEntryPoints(graph, []);
    expect(resolved.explicit).toBe(false);
    expect([...resolved.moduleIds]).toEqual(["src/lib/util.ts"]);
  });
});

describe("unused and unreachable modules", () => {
  const settings = defaultAnalysisSettings();

  it("warns about sources that are not entry points and skips special files", () => {
    const graph = graphOf(
      [["src/main.tsx", "src/app.tsx"]],
      ["src/legacy.ts", "src/legacy.test.ts", "src/types.d.ts"],
    );
    expect(unusedModuleAnalyzer.run({ graph, settings }).map((issue) => issue.primaryModuleId)).toEqual([
      "src/legacy.ts",
    ]);
  });

  it("reports dead clusters and leaves in-degree-zero modules to the unused rule", () => {
    const graph = graphOf(
      [
        ["src/main.tsx", "src/app.tsx"],
        ["src/dead/a.ts", "src/dead/b.ts"],
        ["src/dead/b.ts", "src/dead/a.ts"],
      ],
      ["src/lonely.ts"],
    );
    const unreachable = unreachableModuleAnalyzer.run({ graph, settings });
    expect(unreachable.map((issue) => issue.primaryModuleId)).toEqual([
      "src/dead/a.ts",
      "src/dead/b.ts",
    ]);
    expect(unusedModuleAnalyzer.run({ graph, settings }).map((issue) => issue.primaryModuleId)).toEqual([
      "src/lonely.ts",
    ]);
  });

  it("stays quiet when no entry point can be resolved", () => {
    const graph = graphOf([
      ["a.ts", "b.ts"],
      ["b.ts", "a.ts"],
    ]);
    expect(unreachableModuleAnalyzer.run({ graph, settings })).toEqual([]);
  });
});

describe("highCouplingAnalyzer", () => {
  it("warns only when a threshold is exceeded", () => {
    const settings = { ...defaultAnalysisSettings(), fanInThreshold: 2, fanOutThreshold: 2 };
    const graph = graphOf([
      ["src/main.tsx", "src/hub.ts"],
      ["src/other.ts", "src/hub.ts"],
      ["src/hub.ts", "src/a.ts"],
      ["src/hub.ts", "src/b.ts"],
      ["src/hub.ts", "src/c.ts"],
      ["src/leaf.ts", "src/a.ts"],
    ]);

    const issues = highCouplingAnalyzer.run({ graph, settings });
    expect(issues.map((issue) => issue.primaryModuleId)).toEqual(["src/hub.ts"]);
    expect(issues[0]?.message).toContain("fan-in 2");
    expect(issues[0]?.message).toContain("fan-out 3");
  });
});
