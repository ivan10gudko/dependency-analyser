import { describe, expect, it } from "vitest";

import { buildModuleDependencyGraph } from "../../graph-data/build";
import type { AnalyzedModule } from "../../source-analyser/types";
import {
  computeHighlightedEdgeKeys,
  computeHighlightedNodeIds,
} from "../model/focus-neighborhood";

function moduleOf(path: string, dependencies: string[]): AnalyzedModule {
  return { path, dependencies };
}

describe("computeHighlightedNodeIds", () => {
  const modules = [
    moduleOf("src/a.ts", ["src/b.ts"]),
    moduleOf("src/b.ts", ["src/c.ts"]),
    moduleOf("src/c.ts", []),
    moduleOf("src/d.ts", []),
  ];
  const graph = buildModuleDependencyGraph(modules);

  it("depth 1 includes focus and direct neighbors", () => {
    const ids = computeHighlightedNodeIds(graph, "src/b.ts", 1);
    expect([...ids].sort()).toEqual(["src/a.ts", "src/b.ts", "src/c.ts"]);
  });

  it("depth 2 expands one more hop", () => {
    const ids = computeHighlightedNodeIds(graph, "src/b.ts", 2);
    expect([...ids].sort()).toEqual(["src/a.ts", "src/b.ts", "src/c.ts"]);
  });

  it("all includes connected component but not isolated nodes", () => {
    const ids = computeHighlightedNodeIds(graph, "src/b.ts", "all");
    expect(ids.has("src/d.ts")).toBe(false);
    expect(ids.size).toBe(3);
  });

  it("dependencies only follows outgoing edges", () => {
    const ids = computeHighlightedNodeIds(graph, "src/b.ts", 1, "dependencies");
    expect([...ids].sort()).toEqual(["src/b.ts", "src/c.ts"]);
  });

  it("dependents only follows incoming edges", () => {
    const ids = computeHighlightedNodeIds(graph, "src/b.ts", 1, "dependents");
    expect([...ids].sort()).toEqual(["src/a.ts", "src/b.ts"]);
  });

  it("both with numeric depth does not walk from dependents into their imports", () => {
    const zigzag = buildModuleDependencyGraph([
      moduleOf("src/focus.ts", ["src/dep.ts"]),
      moduleOf("src/dep.ts", []),
      moduleOf("src/user.ts", ["src/dep.ts"]),
    ]);

    const ids = computeHighlightedNodeIds(zigzag, "src/focus.ts", 2, "both");
    expect(ids.has("src/user.ts")).toBe(false);
    expect([...ids].sort()).toEqual(["src/dep.ts", "src/focus.ts"]);
  });

  it("both depth 2 keeps dependents' own dependencies out of the highlight", () => {
    const graph = buildModuleDependencyGraph([
      moduleOf("view-box.ts", []),
      moduleOf("graph-viewport.tsx", ["view-box.ts", "layout-bounds.ts", "pan-util.ts"]),
      moduleOf("view-box.test.ts", ["view-box.ts"]),
      moduleOf("layout-bounds.ts", []),
      moduleOf("pan-util.ts", []),
    ]);

    const ids = computeHighlightedNodeIds(graph, "view-box.ts", 2, "both");
    expect([...ids].sort()).toEqual([
      "graph-viewport.tsx",
      "view-box.test.ts",
      "view-box.ts",
    ]);
  });

  it("both with all does not flood through importers of dependencies", () => {
    const fan = buildModuleDependencyGraph([
      moduleOf("src/focus.ts", ["src/dep.ts"]),
      moduleOf("src/dep.ts", []),
      moduleOf("src/user-a.ts", ["src/dep.ts"]),
      moduleOf("src/user-b.ts", ["src/dep.ts"]),
    ]);

    const ids = computeHighlightedNodeIds(fan, "src/focus.ts", "all", "both");
    expect([...ids].sort()).toEqual(["src/dep.ts", "src/focus.ts"]);
    expect(ids.has("src/user-a.ts")).toBe(false);
    expect(ids.has("src/user-b.ts")).toBe(false);
  });

  it("dependents depth grows along importer chain", () => {
    const chain = buildModuleDependencyGraph([
      moduleOf("hop0.ts", ["hop1.ts"]),
      moduleOf("hop1.ts", ["hop2.ts"]),
      moduleOf("hop2.ts", ["hop3.ts"]),
      moduleOf("hop3.ts", []),
    ]);

    const at2 = computeHighlightedNodeIds(chain, "hop3.ts", 2, "dependents");
    expect([...at2].sort()).toEqual(["hop1.ts", "hop2.ts", "hop3.ts"]);

    const at3 = computeHighlightedNodeIds(chain, "hop3.ts", 3, "dependents");
    expect([...at3].sort()).toEqual(["hop0.ts", "hop1.ts", "hop2.ts", "hop3.ts"]);
  });
});

describe("computeHighlightedEdgeKeys", () => {
  const graph = buildModuleDependencyGraph([
    moduleOf("src/a.ts", ["src/b.ts"]),
    moduleOf("src/b.ts", ["src/c.ts"]),
    moduleOf("src/c.ts", []),
  ]);

  it("includes edges whose endpoints are both highlighted", () => {
    const nodes = computeHighlightedNodeIds(graph, "src/b.ts", 1);
    const keys = computeHighlightedEdgeKeys(graph, nodes);
    expect([...keys].sort()).toEqual(["src/a.ts\u2192src/b.ts", "src/b.ts\u2192src/c.ts"]);
  });
});