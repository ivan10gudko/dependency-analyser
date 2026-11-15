import { describe, expect, it } from "vitest";

import type { ModuleDependencyGraph, NodeId } from "../../graph-data/types";

import { collectReachableFromRoot, subgraphOf } from "../subgraph";

function graphOf(edges: [NodeId, NodeId][]): ModuleDependencyGraph {
  const nodes = new Map<NodeId, { id: NodeId; name: string; directory: string }>();
  const adjacencyList = new Map<NodeId, Set<NodeId>>();

  const ensureNode = (id: NodeId) => {
    if (!nodes.has(id)) {
      nodes.set(id, { id, name: id, directory: "" });
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

describe("collectReachableFromRoot", () => {
  it("collects descendants along import direction", () => {
    const graph = graphOf([
      ["root", "page"],
      ["page", "util"],
      ["orphan", "other"],
    ]);

    expect(collectReachableFromRoot(graph, "root")).toEqual(
      new Set(["root", "page", "util"]),
    );
  });
});

describe("subgraphOf", () => {
  it("keeps only nodes and internal edges from the keep set", () => {
    const graph = graphOf([
      ["A", "B"],
      ["B", "C"],
      ["C", "D"],
    ]);
    const scoped = subgraphOf(graph, new Set(["A", "B", "C"]));

    expect(scoped.nodes.size).toBe(3);
    expect(scoped.adjacencyList.get("B")).toEqual(new Set(["C"]));
    expect(scoped.adjacencyList.has("D")).toBe(false);
  });
});