import { describe, expect, it } from "vitest";

import { buildModuleDependencyGraph } from "../../graph-data/build";
import type { AnalyzedModule } from "../../source-analyser/types";
import { getDependents, getDependencies, linkListsForModule } from "../model/module-links";

function moduleOf(path: string, dependencies: string[]): AnalyzedModule {
  return { path, dependencies };
}

describe("module-links", () => {
  const graph = buildModuleDependencyGraph([
    moduleOf("src/a.ts", ["src/b.ts"]),
    moduleOf("src/b.ts", ["src/c.ts"]),
    moduleOf("src/c.ts", []),
  ]);

  it("linkListsForModule matches outgoing and reverse adjacency", () => {
    const lists = linkListsForModule(graph, "src/b.ts");
    expect(lists.dependencies.map((item) => item.id)).toEqual(["src/c.ts"]);
    expect(lists.dependents.map((item) => item.id)).toEqual(["src/a.ts"]);
  });

  it("getDependencies and getDependents align with linkListsForModule", () => {
    const combined = linkListsForModule(graph, "src/b.ts");
    expect(getDependencies(graph, "src/b.ts")).toEqual(combined.dependencies);
    expect(getDependents(graph, "src/b.ts")).toEqual(combined.dependents);
  });
});