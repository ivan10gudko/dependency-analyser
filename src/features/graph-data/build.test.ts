import { describe, expect, it } from "vitest";

import type { AnalyzedModule } from "../source-analyser/types";

import { buildModuleDependencyGraph, edgeCount } from "./build";

describe("buildModuleDependencyGraph", () => {
  it("maps importer to dependencies in the adjacency list", () => {
    const modules: AnalyzedModule[] = [
      {
        path: "src/components/Header.tsx",
        dependencies: ["src/components/Button.tsx", "src/services/auth.ts"],
      },
      { path: "src/components/Button.tsx", dependencies: [] },
      { path: "src/services/auth.ts", dependencies: [] },
    ];

    const graph = buildModuleDependencyGraph(modules);
    const headerNeighbors = graph.adjacencyList.get("src/components/Header.tsx");

    expect(headerNeighbors).toEqual(
      new Set(["src/components/Button.tsx", "src/services/auth.ts"]),
    );
    expect(edgeCount(graph)).toBe(2);
  });

  it("includes nodes with empty neighbor sets", () => {
    const modules: AnalyzedModule[] = [
      { path: "src/util.ts", dependencies: [] },
    ];

    const graph = buildModuleDependencyGraph(modules);

    expect(graph.nodes.has("src/util.ts")).toBe(true);
    expect(graph.adjacencyList.get("src/util.ts")).toEqual(new Set());
    expect(graph.nodes.size).toBe(1);
  });

  it("deduplicates repeated dependencies", () => {
    const modules: AnalyzedModule[] = [
      {
        path: "src/a.ts",
        dependencies: ["src/b.ts", "src/b.ts"],
      },
      { path: "src/b.ts", dependencies: [] },
    ];

    const graph = buildModuleDependencyGraph(modules);

    expect(graph.adjacencyList.get("src/a.ts")).toEqual(new Set(["src/b.ts"]));
    expect(edgeCount(graph)).toBe(1);
  });

  it("fills name and directory on graph nodes", () => {
    const modules: AnalyzedModule[] = [
      { path: "src/components/Header.tsx", dependencies: [] },
    ];

    const node = buildModuleDependencyGraph(modules).nodes.get(
      "src/components/Header.tsx",
    );

    expect(node).toEqual({
      id: "src/components/Header.tsx",
      name: "Header.tsx",
      directory: "src/components",
    });
  });
});