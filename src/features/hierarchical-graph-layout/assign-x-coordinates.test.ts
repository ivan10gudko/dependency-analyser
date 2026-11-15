import { describe, expect, it } from "vitest";

import type { LayoutGraph, LayoutNode } from "./types";

import {
  addNode,
  assignDagX,
  compactLayers,
  dagDownSweep,
  dagUpSweep,
} from "./assign-x-coordinates";
import { buildInitialLayerOrder } from "./layer-order";

function layoutWith(nodes: LayoutNode[], edges: [string, string][]): LayoutGraph {
  const map = new Map(nodes.map((node) => [node.id, { ...node }]));
  const adjacencyList = new Map<string, Set<string>>();
  for (const node of nodes) adjacencyList.set(node.id, new Set());
  for (const [from, to] of edges) {
    adjacencyList.get(from)!.add(to);
  }
  return { nodes: map, adjacencyList };
}

describe("addNode", () => {
  it("clamps the optimal x position into the legal range", () => {
    const graph = layoutWith(
      [
        { id: "L", isDummy: false, layer: 2, width: 40, height: 0, x: 0 },
        { id: "X", isDummy: false, layer: 2, width: 40, height: 0 },
        { id: "R", isDummy: false, layer: 2, width: 40, height: 0, x: 200 },
      ],
      [],
    );

    const order = new Map([[2, ["L", "X", "R"]]] as const);
    graph.nodes.get("X")!.x = undefined;
    addNode(graph, order, 2, "X", 500, 20);

    expect(graph.nodes.get("X")!.x).toBeLessThanOrEqual(200 - 40 - 20);
    expect(graph.nodes.get("X")!.x!).toBeGreaterThanOrEqual(40 + 20);
  });
});

describe("dagDownSweep", () => {
  it("places layer 1 leftmost and layer 2 at the median of predecessors", () => {
    const graph = layoutWith(
      [
        { id: "A", isDummy: false, layer: 1, width: 100, height: 0 },
        { id: "B", isDummy: false, layer: 2, width: 50, height: 0 },
      ],
      [["A", "B"]],
    );

    const order = buildInitialLayerOrder(graph);
    dagDownSweep(graph, order, { horizontalNodeOffset: 0 });

    expect(graph.nodes.get("A")!.x).toBe(0);
    expect(graph.nodes.get("B")!.x).toBe(0);
  });

  it("uses the mean of the two middle predecessors for an even count", () => {
    const graph = layoutWith(
      [
        { id: "A", isDummy: false, layer: 1, width: 40, height: 0 },
        { id: "B", isDummy: false, layer: 1, width: 40, height: 0 },
        { id: "C", isDummy: false, layer: 2, width: 20, height: 0 },
      ],
      [
        ["A", "C"],
        ["B", "C"],
      ],
    );

    const order = new Map([
      [1, ["A", "B"]],
      [2, ["C"]],
    ]);
    dagDownSweep(graph, order, { horizontalNodeOffset: 20 });

    expect(graph.nodes.get("A")!.x).toBe(0);
    expect(graph.nodes.get("B")!.x).toBe(60);
    expect(graph.nodes.get("C")!.x).toBe(30);
  });
});

describe("dagUpSweep", () => {
  it("repositions a node using the median successor x", () => {
    const graph = layoutWith(
      [
        { id: "A", isDummy: false, layer: 1, width: 20, height: 0, x: 0 },
        { id: "B", isDummy: false, layer: 2, width: 20, height: 0, x: 0 },
        { id: "C", isDummy: false, layer: 3, width: 20, height: 0, x: 80 },
      ],
      [
        ["A", "B"],
        ["B", "C"],
      ],
    );

    const order = new Map([
      [1, ["A"]],
      [2, ["B"]],
      [3, ["C"]],
    ]);

    dagUpSweep(graph, order, { horizontalNodeOffset: 0 });

    expect(graph.nodes.get("B")!.x).toBe(80);
  });
});

describe("compactLayers", () => {
  it("separates overlapping nodes on the same layer", () => {
    const graph = layoutWith(
      [
        { id: "A", isDummy: false, layer: 2, width: 160, height: 0, x: 0 },
        { id: "B", isDummy: false, layer: 2, width: 160, height: 0, x: 40 },
        { id: "C", isDummy: false, layer: 2, width: 160, height: 0, x: 80 },
      ],
      [],
    );
    const order = new Map([[2, ["A", "B", "C"]]] as const);

    compactLayers(graph, order, 24);

    expect(graph.nodes.get("B")!.x).toBe(184);
    expect(graph.nodes.get("C")!.x).toBe(368);
  });
});

describe("assignDagX", () => {
  it("assigns x to every node after two down/up iterations", () => {
    const graph = layoutWith(
      [
        { id: "A", isDummy: false, layer: 1, width: 30, height: 0 },
        { id: "B", isDummy: false, layer: 2, width: 30, height: 0 },
        { id: "C", isDummy: false, layer: 3, width: 30, height: 0 },
      ],
      [
        ["A", "B"],
        ["B", "C"],
      ],
    );

    const order = buildInitialLayerOrder(graph);
    assignDagX(graph, order, { horizontalNodeOffset: 10, iterations: 2 });

    for (const node of graph.nodes.values()) {
      expect(node.x).toBeTypeOf("number");
    }
  });
});