import { describe, expect, it } from "vitest";

import type { ModuleDependencyGraph, NodeId } from "../../graph-data/types";

import { assignLayers } from "../assign-layers";
import { createDummyNodes } from "../insert-dummy-nodes";
import { DUMMY_NODE_PREFIX } from "../types";

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

function assertUnitLayerEdges(
  layout: ReturnType<typeof createDummyNodes>,
): void {
  for (const [from, targets] of layout.adjacencyList) {
    const fromLayer = layout.nodes.get(from)!.layer;
    for (const to of targets) {
      expect(layout.nodes.get(to)!.layer).toBe(fromLayer + 1);
    }
  }
}

describe("createDummyNodes", () => {
  it("does not insert dummies when endpoints are on adjacent layers", () => {
    const graph = graphOf([
      ["A", "B"],
      ["B", "C"],
    ]);
    const layers = assignLayers(graph);
    const layout = createDummyNodes(graph, layers);

    expect([...layout.nodes.values()].filter((node) => node.isDummy)).toHaveLength(0);
    assertUnitLayerEdges(layout);
  });

  it("inserts one dummy between B and F in the layered example graph", () => {
    const graph = graphOf([
      ["A", "B"],
      ["A", "C"],
      ["B", "D"],
      ["C", "E"],
      ["C", "D"],
      ["D", "F"],
      ["B", "F"],
    ]);
    const layers = assignLayers(graph);

    expect(layers.get("B")).toBe(2);
    expect(layers.get("F")).toBe(4);

    const layout = createDummyNodes(graph, layers);
    const dummies = [...layout.nodes.values()].filter((node) => node.isDummy);

    expect(dummies).toHaveLength(1);
    expect(dummies[0]!.layer).toBe(3);
    expect(dummies[0]!.width).toBe(0);
    expect(dummies[0]!.height).toBe(0);
    expect(dummies[0]!.id.startsWith(DUMMY_NODE_PREFIX)).toBe(true);

    const bNeighbors = [...(layout.adjacencyList.get("B") ?? [])];
    expect(bNeighbors.some((id) => layout.nodes.get(id)!.isDummy)).toBe(true);
    assertUnitLayerEdges(layout);
  });
});