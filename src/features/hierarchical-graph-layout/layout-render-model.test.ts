import { describe, expect, it } from "vitest";

import type { ModuleDependencyGraph, NodeId } from "../graph-data/types";

import { buildHierarchicalLayout } from "./layout-render-model";

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

describe("buildHierarchicalLayout", () => {
  it("produces render nodes with x, y, and unit-layer edges", () => {
    const graph = graphOf([
      ["A", "B"],
      ["B", "C"],
    ]);

    const { model, layoutGraph } = buildHierarchicalLayout(graph, { root: "A" });

    expect(model.nodes).toHaveLength(3);
    expect(model.edges).toHaveLength(2);

    for (const node of model.nodes) {
      expect(node.x).toBeTypeOf("number");
      expect(node.y).toBeTypeOf("number");
    }

    for (const edge of model.edges) {
      const from = layoutGraph.nodes.get(edge.from)!;
      const to = layoutGraph.nodes.get(edge.to)!;
      expect(to.layer).toBe(from.layer + 1);
    }
  });
});