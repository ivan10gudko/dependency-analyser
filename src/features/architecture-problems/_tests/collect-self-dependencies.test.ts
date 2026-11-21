import { describe, expect, it } from "vitest";

import type { ModuleDependencyGraph, NodeId } from "../../graph-data/types";

import { collectSelfDependencies } from "../collect-self-dependencies";

function graphOf(edges: [NodeId, NodeId][]): ModuleDependencyGraph {
  const nodes = new Map<NodeId, { id: NodeId; name: string; directory: string }>();
  const adjacencyList = new Map<NodeId, Set<NodeId>>();

  const ensureNode = (id: NodeId) => {
    if (!nodes.has(id)) {
      const slash = id.lastIndexOf("/");
      nodes.set(id, {
        id,
        name: slash < 0 ? id : id.slice(slash + 1),
        directory: slash < 0 ? "" : id.slice(0, slash),
      });
    }
    if (!adjacencyList.has(id)) adjacencyList.set(id, new Set());
  };

  for (const [from, to] of edges) {
    ensureNode(from);
    ensureNode(to);
    adjacencyList.get(from)!.add(to);
  }

  return { nodes, adjacencyList };
}

describe("collectSelfDependencies", () => {
  it("returns an empty list when there are no self-edges", () => {
    const graph = graphOf([["A", "B"]]);
    expect(collectSelfDependencies(graph)).toEqual([]);
  });

  it("collects one or more self-dependent modules", () => {
    const graph = graphOf([
      ["ui/index.ts", "ui/index.ts"],
      ["app/page.tsx", "ui/index.ts"],
      ["config.ts", "config.ts"],
    ]);

    expect(collectSelfDependencies(graph)).toEqual([
      { moduleId: "config.ts" },
      { moduleId: "ui/index.ts" },
    ]);
  });
});