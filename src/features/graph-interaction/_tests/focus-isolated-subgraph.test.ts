import { describe, expect, it } from "vitest";

import { buildModuleDependencyGraph } from "../../graph-data/build";
import type { AnalyzedModule } from "../../source-analyser/types";
import type { BarrelDisplayOptions } from "../../barrel-view";

import { buildFocusIsolatedSubgraph } from "../model/focus-isolated-subgraph";
import { buildIsolatedFocusVisual } from "../model/focus-isolated-visual";
import { computeDisplayHighlightedNodeIds } from "../model/focus-display-highlight";

const barrelOff: BarrelDisplayOptions = {
  barrelViewEnabled: false,
  expandedDirectories: new Set(),
};

function moduleOf(path: string, dependencies: string[]): AnalyzedModule {
  return { path, dependencies };
}

describe("buildFocusIsolatedSubgraph", () => {
  const modules = [
    moduleOf("src/a.ts", ["src/b.ts"]),
    moduleOf("src/b.ts", ["src/c.ts"]),
    moduleOf("src/c.ts", []),
    moduleOf("src/d.ts", []),
  ];
  const graph = buildModuleDependencyGraph(modules);

  it("depth 1 keeps direct neighborhood and internal edges only", () => {
    const sub = buildFocusIsolatedSubgraph(
      graph,
      graph,
      "src/b.ts",
      1,
      "both",
      barrelOff,
    );
    expect([...sub.nodes.keys()].sort()).toEqual(["src/a.ts", "src/b.ts", "src/c.ts"]);
    expect(sub.adjacencyList.get("src/b.ts")).toEqual(new Set(["src/c.ts"]));
    expect(sub.nodes.has("src/d.ts")).toBe(false);
  });

  it("dependencies direction excludes dependents", () => {
    const sub = buildFocusIsolatedSubgraph(
      graph,
      graph,
      "src/b.ts",
      1,
      "dependencies",
      barrelOff,
    );
    expect([...sub.nodes.keys()].sort()).toEqual(["src/b.ts", "src/c.ts"]);
  });

  it("dependents direction excludes dependencies", () => {
    const sub = buildFocusIsolatedSubgraph(
      graph,
      graph,
      "src/b.ts",
      1,
      "dependents",
      barrelOff,
    );
    expect([...sub.nodes.keys()].sort()).toEqual(["src/a.ts", "src/b.ts"]);
  });

  it("focus-only subgraph when node has no neighbors in direction", () => {
    const sub = buildFocusIsolatedSubgraph(
      graph,
      graph,
      "src/d.ts",
      1,
      "both",
      barrelOff,
    );
    expect(sub.nodes.size).toBe(1);
    expect(sub.nodes.has("src/d.ts")).toBe(true);
    expect(sub.adjacencyList.get("src/d.ts")?.size ?? 0).toBe(0);
  });

  it("cycles do not inflate the keep set", () => {
    const cyclic = buildModuleDependencyGraph([
      moduleOf("src/x.ts", ["src/y.ts"]),
      moduleOf("src/y.ts", ["src/x.ts"]),
    ]);
    const sub = buildFocusIsolatedSubgraph(
      cyclic,
      cyclic,
      "src/x.ts",
      "all",
      "dependencies",
      barrelOff,
    );
    expect(sub.nodes.size).toBe(2);
  });
});

describe("buildIsolatedFocusVisual", () => {
  const graph = buildModuleDependencyGraph([
    moduleOf("src/a.ts", ["src/b.ts"]),
    moduleOf("src/b.ts", []),
  ]);

  it("marks focus, descendants, and descendant edges", () => {
    const sub = buildFocusIsolatedSubgraph(
      graph,
      graph,
      "src/a.ts",
      1,
      "both",
      barrelOff,
    );
    const visual = buildIsolatedFocusVisual(sub, "src/a.ts");
    expect(visual?.nodeStateById.get("src/a.ts")).toBe("focus");
    expect(visual?.nodeStateById.get("src/b.ts")).toBe("descendant");
    expect(visual?.edgeStateByKey.get("src/a.ts\u2192src/b.ts")).toBe("descendant");
  });
});

describe("computeDisplayHighlightedNodeIds", () => {
  it("matches highlighted set on display graph when barrel is off", () => {
    const graph = buildModuleDependencyGraph([
      moduleOf("src/a.ts", ["src/b.ts"]),
      moduleOf("src/b.ts", []),
    ]);
    const ids = computeDisplayHighlightedNodeIds(
      graph,
      graph,
      "src/a.ts",
      1,
      "both",
      barrelOff,
    );
    expect([...ids].sort()).toEqual(["src/a.ts", "src/b.ts"]);
  });
});