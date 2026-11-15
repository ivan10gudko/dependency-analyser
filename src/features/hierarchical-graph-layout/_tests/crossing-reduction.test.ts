import { describe, expect, it } from "vitest";

import type { LayoutGraph, LayoutNode } from "../types";

import { downSweep, reduceCrossings, upSweep } from "../crossing-reduction";
import { buildInitialLayerOrder } from "../layer-order";

function layoutWith(nodes: LayoutNode[], edges: [string, string][]): LayoutGraph {
  const map = new Map(nodes.map((node) => [node.id, node]));
  const adjacencyList = new Map<string, Set<string>>();
  for (const node of nodes) adjacencyList.set(node.id, new Set());
  for (const [from, to] of edges) {
    adjacencyList.get(from)!.add(to);
  }
  return { nodes: map, adjacencyList };
}

function countCrossings(layerOrder: Map<number, string[]>, edges: [string, string][]): number {
  let crossings = 0;
  for (let index = 0; index < edges.length; index += 1) {
    for (let other = index + 1; other < edges.length; other += 1) {
      const [a, b] = edges[index]!;
      const [c, d] = edges[other]!;

      const layerOf = (id: string) =>
        [...layerOrder.entries()].find(([, ids]) => ids.includes(id))![0];
      const pos = (layer: number, id: string) => layerOrder.get(layer)!.indexOf(id);

      if (layerOf(a) !== layerOf(c)) continue;
      if (layerOf(b) !== layerOf(d)) continue;
      if (layerOf(b) - layerOf(a) !== layerOf(d) - layerOf(c)) continue;

      const upperLayer = layerOf(a);
      const lowerLayer = layerOf(b);
      const pA = pos(upperLayer, a);
      const pC = pos(upperLayer, c);
      const pB = pos(lowerLayer, b);
      const pD = pos(lowerLayer, d);

      if ((pA - pC) * (pB - pD) < 0) crossings += 1;
    }
  }
  return crossings;
}

describe("downSweep", () => {
  it("reorders layer 2 by the average predecessor position", () => {
    const graph = layoutWith(
      [
        { id: "A", isDummy: false, layer: 1, width: 0, height: 0 },
        { id: "B", isDummy: false, layer: 1, width: 0, height: 0 },
        { id: "x", isDummy: false, layer: 2, width: 0, height: 0 },
        { id: "y", isDummy: false, layer: 2, width: 0, height: 0 },
      ],
      [
        ["A", "y"],
        ["B", "x"],
      ],
    );

    const order = buildInitialLayerOrder(graph);
    expect(order.get(1)).toEqual(["A", "B"]);
    expect(order.get(2)).toEqual(["x", "y"]);

    const optimized = downSweep(graph, order);

    expect(optimized.get(2)).toEqual(["y", "x"]);
    expect(
      countCrossings(optimized, [
        ["A", "y"],
        ["B", "x"],
      ]),
    ).toBe(0);
  });

  it("upSweep can move layer 1 using successor positions", () => {
    const graph = layoutWith(
      [
        { id: "A", isDummy: false, layer: 1, width: 0, height: 0 },
        { id: "B", isDummy: false, layer: 1, width: 0, height: 0 },
        { id: "x", isDummy: false, layer: 2, width: 0, height: 0 },
        { id: "y", isDummy: false, layer: 2, width: 0, height: 0 },
      ],
      [
        ["A", "x"],
        ["B", "y"],
      ],
    );

    const order = buildInitialLayerOrder(graph);
    downSweep(graph, order);
    upSweep(graph, order);

    expect(order.get(1)).toEqual(["A", "B"]);
    expect(order.get(2)).toEqual(["x", "y"]);
  });

  it("reduceCrossings clears the crossing in two passes", () => {
    const graph = layoutWith(
      [
        { id: "A", isDummy: false, layer: 1, width: 0, height: 0 },
        { id: "B", isDummy: false, layer: 1, width: 0, height: 0 },
        { id: "x", isDummy: false, layer: 2, width: 0, height: 0 },
        { id: "y", isDummy: false, layer: 2, width: 0, height: 0 },
      ],
      [
        ["A", "y"],
        ["B", "x"],
      ],
    );

    const edges: [string, string][] = [
      ["A", "y"],
      ["B", "x"],
    ];
    const order = buildInitialLayerOrder(graph);
    expect(countCrossings(order, edges)).toBe(1);

    reduceCrossings(graph, order);

    expect(countCrossings(order, edges)).toBe(0);
  });

  it("leaves layer 1 unchanged", () => {
    const graph = layoutWith(
      [
        { id: "A", isDummy: false, layer: 1, width: 0, height: 0 },
        { id: "B", isDummy: false, layer: 2, width: 0, height: 0 },
      ],
      [["A", "B"]],
    );

    const order = buildInitialLayerOrder(graph);
    downSweep(graph, order);

    expect(order.get(1)).toEqual(["A"]);
    expect(order.get(2)).toEqual(["B"]);
  });
});