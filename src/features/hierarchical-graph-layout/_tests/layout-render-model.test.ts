import { describe, expect, it } from "vitest";

import type { ModuleDependencyGraph, NodeId } from "../../graph-data/types";

import { buildHierarchicalLayout } from "../layout-render-model";

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

    const { model, layoutGraph, scope } = buildHierarchicalLayout(graph, { root: "A" });

    expect(scope.totalModules).toBe(3);

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

  it("builds layout when a module has a self-edge", () => {
    const graph = graphOf([
      ["ui/index.ts", "ui/index.ts"],
      ["app/page.tsx", "ui/index.ts"],
    ]);

    const { model, scope } = buildHierarchicalLayout(graph, { root: "app/page.tsx" });

    expect(scope.totalModules).toBe(2);
    expect(model.nodes.filter((node) => !node.isDummy)).toHaveLength(2);
  });

  it("does not place module nodes on the same layer with horizontal overlap", () => {
    const leaves = ["L1", "L2", "L3", "L4", "L5", "L6"] as const;
    const edges: [NodeId, NodeId][] = [["root", "hub"]];
    for (const leaf of leaves) {
      edges.push(["hub", leaf]);
    }

    const graph = graphOf(edges);
    const { model } = buildHierarchicalLayout(graph, { root: "root" });
    const gap = 24;

    const byLayer = new Map<number, typeof model.nodes>();
    for (const node of model.nodes) {
      if (node.isDummy) continue;
      const bucket = byLayer.get(node.layer) ?? [];
      bucket.push(node);
      byLayer.set(node.layer, bucket);
    }

    for (const nodes of byLayer.values()) {
      const ordered = [...nodes].sort((left, right) => left.x - right.x);
      for (let index = 1; index < ordered.length; index += 1) {
        const previous = ordered[index - 1]!;
        const current = ordered[index]!;
        expect(current.x).toBeGreaterThanOrEqual(previous.x + previous.width + gap - 0.001);
      }
    }
  });
});