import { describe, expect, it } from "vitest";

import { buildModuleDependencyGraph } from "../../graph-data/build";
import type { AnalyzedModule } from "../../source-analyser/types";

import { buildBarrelDisplayGraph } from "../build-barrel-display-graph";
import { detectBarrelFolders } from "../detect-barrel-folders";
import { isBarrelNodeId, toBarrelNodeId } from "../barrel-node-id";

function graphFrom(modules: AnalyzedModule[]) {
  return buildModuleDependencyGraph(modules);
}

describe("detectBarrelFolders", () => {
  it("classifies internal-only siblings as hidden and deep-imported as exposed", () => {
    const graph = graphFrom([
      { path: "src/ui/index.ts", dependencies: ["src/ui/a.ts", "src/ui/b.ts"] },
      { path: "src/ui/a.ts", dependencies: [] },
      { path: "src/ui/b.ts", dependencies: [] },
      { path: "src/ui/public.ts", dependencies: [] },
      { path: "src/app.ts", dependencies: ["src/ui/index.ts", "src/ui/public.ts"] },
    ]);

    const folders = detectBarrelFolders(graph);
    const ui = folders.get("src/ui");
    expect(ui).toBeDefined();
    expect(ui!.indexModuleId).toBe("src/ui/index.ts");
    expect([...ui!.hiddenModules].sort()).toEqual(
      ["src/ui/a.ts", "src/ui/b.ts", "src/ui/index.ts"].sort(),
    );
    expect([...ui!.exposedModules]).toEqual(["src/ui/public.ts"]);
    expect(ui!.deepImports).toEqual([
      { importer: "src/app.ts", target: "src/ui/public.ts" },
    ]);
  });
});

describe("buildBarrelDisplayGraph", () => {
  it("rewrites external edges through the barrel node when collapsed", () => {
    const canonical = graphFrom([
      { path: "src/ui/index.ts", dependencies: ["src/ui/a.ts"] },
      { path: "src/ui/a.ts", dependencies: [] },
      { path: "src/app.ts", dependencies: ["src/ui/index.ts"] },
    ]);

    const display = buildBarrelDisplayGraph(canonical, {
      barrelViewEnabled: true,
      expandedDirectories: new Set(),
    });

    const barrelId = toBarrelNodeId("src/ui");
    expect(display.nodes.has(barrelId)).toBe(true);
    expect(isBarrelNodeId(barrelId)).toBe(true);
    expect(display.nodes.has("src/ui/index.ts")).toBe(false);
    expect(display.nodes.has("src/ui/a.ts")).toBe(false);
    expect(display.adjacencyList.get("src/app.ts")).toEqual(new Set([barrelId]));
  });

  it("keeps deep-import targets visible with direct edges", () => {
    const canonical = graphFrom([
      { path: "src/ui/index.ts", dependencies: ["src/ui/internal.ts"] },
      { path: "src/ui/internal.ts", dependencies: [] },
      { path: "src/ui/public.ts", dependencies: [] },
      { path: "src/app.ts", dependencies: ["src/ui/index.ts", "src/ui/public.ts"] },
    ]);

    const display = buildBarrelDisplayGraph(canonical, {
      barrelViewEnabled: true,
      expandedDirectories: new Set(),
    });

    const barrelId = toBarrelNodeId("src/ui");
    expect(display.nodes.has("src/ui/public.ts")).toBe(true);
    expect(display.adjacencyList.get("src/app.ts")).toEqual(
      new Set([barrelId, "src/ui/public.ts"]),
    );
  });

  it("keeps the barrel oval when expanded but shows internal modules", () => {
    const canonical = graphFrom([
      { path: "src/ui/index.ts", dependencies: ["src/ui/a.ts"] },
      { path: "src/ui/a.ts", dependencies: [] },
      { path: "src/app.ts", dependencies: ["src/ui/index.ts"] },
    ]);

    const display = buildBarrelDisplayGraph(canonical, {
      barrelViewEnabled: true,
      expandedDirectories: new Set(["src/ui"]),
    });

    const barrelId = toBarrelNodeId("src/ui");
    expect(display.nodes.has(barrelId)).toBe(true);
    expect(display.nodes.has("src/ui/index.ts")).toBe(false);
    expect(display.nodes.has("src/ui/a.ts")).toBe(true);
    expect(display.adjacencyList.get("src/app.ts")).toEqual(new Set([barrelId]));
    expect(display.adjacencyList.get(barrelId)).toEqual(new Set(["src/ui/a.ts"]));
  });
});