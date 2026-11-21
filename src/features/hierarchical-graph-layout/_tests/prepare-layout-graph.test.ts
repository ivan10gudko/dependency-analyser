import { describe, expect, it } from "vitest";

import type { ModuleDependencyGraph, NodeId } from "../../graph-data/types";

import { prepareGraphForLayout } from "../prepare-layout-graph";

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

describe("prepareGraphForLayout", () => {
  it("removes self-edges from the layout copy only", () => {
    const graph = graphOf([
      ["ui/index.ts", "ui/index.ts"],
      ["app/page.tsx", "ui/index.ts"],
    ]);

    const prepared = prepareGraphForLayout(graph);

    expect(graph.adjacencyList.get("ui/index.ts")!.has("ui/index.ts")).toBe(true);
    expect(prepared.adjacencyList.get("ui/index.ts")!.has("ui/index.ts")).toBe(false);
    expect(prepared.adjacencyList.get("app/page.tsx")).toEqual(new Set(["ui/index.ts"]));
    expect(prepared.nodes).toBe(graph.nodes);
  });

  it("leaves graphs without self-edges unchanged", () => {
    const graph = graphOf([
      ["A", "B"],
      ["B", "C"],
    ]);

    const prepared = prepareGraphForLayout(graph);

    expect(prepared.adjacencyList.get("A")).toEqual(new Set(["B"]));
    expect(prepared.adjacencyList.get("B")).toEqual(new Set(["C"]));
  });
});