import { describe, expect, it } from "vitest";

import type { ModuleDependencyGraph, NodeId } from "../graph-data/types";

import { assignLayers, assignLayersFromRoot } from "./assign-layers";

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

function assertLayerOrder(
  graph: ModuleDependencyGraph,
  layers: Map<NodeId, number>,
): void {
  for (const [from, targets] of graph.adjacencyList) {
    const fromLayer = layers.get(from);
    expect(fromLayer, `missing layer for ${from}`).toBeDefined();
    for (const to of targets) {
      const toLayer = layers.get(to);
      expect(toLayer, `missing layer for ${to}`).toBeDefined();
      expect(fromLayer!).toBeLessThan(toLayer!);
    }
  }
}

describe("assignLayers", () => {
  it("layers a chain with one node per layer", () => {
    const graph = graphOf([
      ["A", "B"],
      ["B", "C"],
    ]);

    expect(assignLayers(graph)).toEqual(
      new Map([
        ["A", 1],
        ["B", 2],
        ["C", 3],
      ]),
    );
  });

  it("merges independent successors into the same layer", () => {
    const graph = graphOf([
      ["A", "B"],
      ["A", "C"],
      ["B", "D"],
      ["C", "D"],
    ]);

    const layers = assignLayers(graph);

    expect(layers.get("A")).toBe(1);
    expect(layers.get("B")).toBe(2);
    expect(layers.get("C")).toBe(2);
    expect(layers.get("D")).toBe(3);
    assertLayerOrder(graph, layers);
  });

  it("assigns layer 1 to every source", () => {
    const graph = graphOf([
      ["A", "C"],
      ["B", "C"],
    ]);

    const layers = assignLayers(graph);

    expect(layers.get("A")).toBe(1);
    expect(layers.get("B")).toBe(1);
    expect(layers.get("C")).toBe(2);
  });

  it("assigns deepest descendants lower when layering from root", () => {
    const graph = graphOf([
      ["root", "A"],
      ["root", "B"],
      ["A", "shared"],
      ["B", "shared"],
    ]);

    const layers = assignLayersFromRoot(graph, "root");

    expect(layers.get("root")).toBe(1);
    expect(layers.get("A")).toBe(2);
    expect(layers.get("B")).toBe(2);
    expect(layers.get("shared")).toBe(3);
    assertLayerOrder(graph, layers);
  });

  it("satisfies the edge layering postcondition on the Figure 6.2 DAG", () => {
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

    expect(layers.size).toBe(graph.nodes.size);
    assertLayerOrder(graph, layers);
  });
});