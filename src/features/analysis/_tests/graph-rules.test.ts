import { describe, expect, it } from "vitest";

import { defaultAnalysisSettings } from "../settings";
import { runAnalysis } from "../engine";
import { circularDependencyAnalyzer } from "../rules/circular-dependency";
import { selfDependencyAnalyzer } from "../rules/self-dependency";

import { graphOf } from "./graph-fixture";

const settings = defaultAnalysisSettings();

describe("selfDependencyAnalyzer", () => {
  it("reports modules that import themselves", () => {
    const graph = graphOf([
      ["ui/index.ts", "ui/index.ts"],
      ["app/page.tsx", "ui/index.ts"],
      ["config.ts", "config.ts"],
    ]);

    expect(selfDependencyAnalyzer.run({ graph, settings }).map((issue) => issue.primaryModuleId)).toEqual([
      "config.ts",
      "ui/index.ts",
    ]);
    expect(selfDependencyAnalyzer.run({ graph, settings })[0]?.edges).toEqual([
      { from: "config.ts", to: "config.ts" },
    ]);
  });
});

describe("circularDependencyAnalyzer", () => {
  it("returns nothing for a DAG", () => {
    const graph = graphOf([
      ["a.ts", "b.ts"],
      ["b.ts", "c.ts"],
    ]);
    expect(circularDependencyAnalyzer.run({ graph, settings })).toEqual([]);
  });

  it("reports one issue per strongly connected component", () => {
    const graph = graphOf([
      ["a.ts", "b.ts"],
      ["b.ts", "a.ts"],
      ["c.ts", "d.ts"],
      ["d.ts", "c.ts"],
      ["b.ts", "c.ts"],
    ]);
    const issues = circularDependencyAnalyzer.run({ graph, settings });
    expect(issues).toHaveLength(2);
    expect(issues.map((issue) => issue.moduleIds)).toEqual([
      ["a.ts", "b.ts"],
      ["c.ts", "d.ts"],
    ]);
    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.message).toBe("Circular dependency: a.ts → b.ts → a.ts");
  });

  it("does not treat a self-loop as a circular dependency", () => {
    const graph = graphOf([["a.ts", "a.ts"]]);
    expect(circularDependencyAnalyzer.run({ graph, settings })).toEqual([]);
  });
});

describe("analysis analyzers together", () => {
  it("keeps the self-loop out of the cycle rule when both run", () => {
    const graph = graphOf([
      ["a.ts", "a.ts"],
      ["a.ts", "b.ts"],
      ["b.ts", "a.ts"],
    ]);
    const report = runAnalysis(graph, settings, [
      selfDependencyAnalyzer,
      circularDependencyAnalyzer,
    ]);
    expect(report.issues.map((issue) => issue.ruleId)).toEqual([
      "circular-dependency",
      "self-dependency",
    ]);
  });
});
