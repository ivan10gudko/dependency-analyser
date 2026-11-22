import { describe, expect, it } from "vitest";

import { toBarrelNodeId } from "../../barrel-view";
import { edgeKey } from "../../graph-interaction/model/focus-neighborhood";
import { buildIssueHighlight, buildIssueFocusVisual } from "../issue-highlight";
import type { AnalysisIssue } from "../types";

import { graphOf } from "./graph-fixture";

describe("buildIssueHighlight", () => {
  it("maps a hidden module onto its barrel node", () => {
    const graph = graphOf([
      ["src/app/main.tsx", "src/shared/ui/index.ts"],
      ["src/shared/ui/index.ts", "src/shared/ui/button.tsx"],
    ]);
    const issue: AnalysisIssue = {
      id: "hidden",
      ruleId: "unused-module",
      severity: "warning",
      category: "unused",
      message: "hidden",
      moduleIds: ["src/app/main.tsx", "src/shared/ui/button.tsx"],
      edges: [{ from: "src/app/main.tsx", to: "src/shared/ui/button.tsx" }],
      primaryModuleId: "src/shared/ui/button.tsx",
    };

    const highlight = buildIssueHighlight(issue, graph, {
      barrelViewEnabled: true,
      expandedDirectories: new Set(),
    });

    const barrelId = toBarrelNodeId("src/shared/ui");
    expect(highlight.nodeIds.has("src/app/main.tsx")).toBe(true);
    expect(highlight.nodeIds.has(barrelId)).toBe(true);
    expect(highlight.edgeKeys.has(edgeKey("src/app/main.tsx", barrelId))).toBe(true);
  });
});

describe("buildIssueFocusVisual", () => {
  it("marks only the issue participants for framing", () => {
    const visual = buildIssueFocusVisual({
      severity: "error",
      nodeIds: new Set(["a.ts", "b.ts"]),
      edgeKeys: new Set(["a.ts→b.ts"]),
    });

    expect(visual.active).toBe(true);
    expect(visual.nodeStateById.get("a.ts")).toBe("focus");
    expect(visual.nodeStateById.get("b.ts")).toBe("focus");
    expect(visual.edgeStateByKey.get("a.ts→b.ts")).toBe("highlighted");
    expect(visual.nodeStateById.has("c.ts")).toBe(false);
  });
});
