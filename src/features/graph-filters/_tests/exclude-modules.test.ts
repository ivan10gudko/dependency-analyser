import { describe, expect, it } from "vitest";

import { directoryOf, fileNameOf } from "../../../lib/path";
import type { ModuleDependencyGraph, NodeId } from "../../graph-data/types";

import { excludeModules } from "../exclude-modules";
import { isTestModule } from "../is-test-module";

function graph(edges: Record<string, string[]>): ModuleDependencyGraph {
  const ids = new Set<NodeId>(Object.keys(edges));
  for (const targets of Object.values(edges)) {
    for (const target of targets) ids.add(target);
  }

  const nodes = new Map();
  const adjacencyList = new Map<NodeId, Set<NodeId>>();
  for (const id of ids) {
    nodes.set(id, { id, name: fileNameOf(id), directory: directoryOf(id) });
    adjacencyList.set(id, new Set(edges[id] ?? []));
  }
  return { nodes, adjacencyList };
}

describe("isTestModule", () => {
  it("matches test file names including tsx and jsx", () => {
    expect(isTestModule("src/foo.test.ts")).toBe(true);
    expect(isTestModule("src/foo.test.tsx")).toBe(true);
    expect(isTestModule("src/foo.test.js")).toBe(true);
    expect(isTestModule("src/foo.test.jsx")).toBe(true);
    expect(isTestModule("src/foo.ts")).toBe(false);
    expect(isTestModule("src/test.ts")).toBe(false);
  });
});

describe("excludeModules", () => {
  const source = graph({
    "src/app.ts": ["src/features/workbench/panel.tsx", "src/features/workbench/nested/row.tsx"],
    "src/features/workbench/panel.tsx": ["src/util.ts"],
    "src/features/workbench/nested/row.tsx": [],
    "src/features/other/a.ts": [],
    "src/util.ts": ["src/util.test.ts"],
    "src/util.test.ts": [],
    "src/__tests__/setup.ts": [],
    "src/foo/__tests__/more.ts": [],
    "src/button.test.tsx": [],
    "src/legacy.test.js": [],
  });

  it("returns the same graph when nothing is excluded", () => {
    expect(
      excludeModules(source, { showTestFiles: true, folderMasks: [], fileMasks: [] }),
    ).toBe(source);
  });

  it("hides a folder and everything nested under it", () => {
    const filtered = excludeModules(source, {
      showTestFiles: true,
      folderMasks: ["src/features/workbench"],
      fileMasks: [],
    });

    expect(filtered.nodes.has("src/features/workbench/panel.tsx")).toBe(false);
    expect(filtered.nodes.has("src/features/workbench/nested/row.tsx")).toBe(false);
    expect(filtered.nodes.has("src/features/other/a.ts")).toBe(true);
    expect(filtered.adjacencyList.get("src/app.ts")).toEqual(new Set());
  });

  it("hides folders matched by a glob, including nested files", () => {
    const filtered = excludeModules(source, {
      showTestFiles: true,
      folderMasks: ["**/__tests__"],
      fileMasks: [],
    });

    expect(filtered.nodes.has("src/__tests__/setup.ts")).toBe(false);
    expect(filtered.nodes.has("src/foo/__tests__/more.ts")).toBe(false);
    expect(filtered.nodes.has("src/app.ts")).toBe(true);
  });

  it("hides only the file matched by a file mask and drops edges to it", () => {
    const filtered = excludeModules(source, {
      showTestFiles: true,
      folderMasks: [],
      fileMasks: ["src/util.ts"],
    });

    expect(filtered.nodes.has("src/util.ts")).toBe(false);
    expect(filtered.nodes.has("src/util.test.ts")).toBe(true);
    expect(filtered.adjacencyList.get("src/features/workbench/panel.tsx")).toEqual(new Set());
    expect(filtered.adjacencyList.has("src/util.ts")).toBe(false);
  });

  it("hides test files when the test toggle is off", () => {
    const filtered = excludeModules(source, {
      showTestFiles: false,
      folderMasks: [],
      fileMasks: [],
    });

    expect(filtered.nodes.has("src/util.test.ts")).toBe(false);
    expect(filtered.nodes.has("src/button.test.tsx")).toBe(false);
    expect(filtered.nodes.has("src/legacy.test.js")).toBe(false);
    expect(filtered.nodes.has("src/util.ts")).toBe(true);
    expect(filtered.adjacencyList.get("src/util.ts")).toEqual(new Set());
  });

  it("returns the same graph when masks match nothing", () => {
    expect(
      excludeModules(source, {
        showTestFiles: true,
        folderMasks: ["missing/**"],
        fileMasks: ["nope.ts"],
      }),
    ).toBe(source);
  });
});
