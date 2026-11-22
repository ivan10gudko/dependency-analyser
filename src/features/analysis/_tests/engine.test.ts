import { describe, expect, it } from "vitest";

import { runAnalysis } from "../engine";
import { defaultAnalysisSettings } from "../settings";
import type { AnalysisIssue, Analyzer } from "../types";

import { graphOf } from "./graph-fixture";

describe("runAnalysis", () => {
  it("skips a disabled rule and sorts errors before warnings", () => {
    const calls: string[] = [];
    const cycle: AnalysisIssue = {
      id: "cycle",
      ruleId: "circular-dependency",
      severity: "error",
      category: "circular-dependency",
      message: "cycle",
      moduleIds: ["a.ts"],
      edges: [],
      primaryModuleId: "a.ts",
    };
    const unused: AnalysisIssue = {
      id: "unused",
      ruleId: "unused-module",
      severity: "warning",
      category: "unused",
      message: "unused",
      moduleIds: ["b.ts"],
      edges: [],
      primaryModuleId: "b.ts",
    };
    const analyzers: Analyzer[] = [
      {
        id: "self-dependency",
        run() {
          calls.push("self-dependency");
          return [];
        },
      },
      {
        id: "unused-module",
        run() {
          calls.push("unused-module");
          return [unused];
        },
      },
      {
        id: "circular-dependency",
        run() {
          calls.push("circular-dependency");
          return [cycle];
        },
      },
    ];
    const settings = defaultAnalysisSettings();
    settings.enabledRules["self-dependency"] = false;

    const report = runAnalysis(graphOf([]), settings, analyzers);

    expect(calls).toEqual(["unused-module", "circular-dependency"]);
    expect(report.issues.map((issue) => issue.id)).toEqual(["cycle", "unused"]);
    expect(report.counts).toEqual({ error: 1, warning: 1, info: 0 });
  });
});
