import { describe, expect, it } from "vitest";

import type { LayoutGraph, LayoutNode } from "./types";

import {
  computeGapForBoundary,
  countInterLayerEdges,
} from "./compute-inter-layer-gap";
import { assignYCoordinates } from "./assign-y-coordinates";

describe("countInterLayerEdges", () => {
  it("counts only edges that advance exactly one layer", () => {
    const graph = layoutWith(
      [
        node("a0", 0),
        node("a1", 1),
        node("b1", 1),
        node("c2", 2),
      ],
      [
        ["a0", "a1"],
        ["a0", "b1"],
        ["a1", "c2"],
        ["a0", "c2"],
      ],
    );

    const counts = countInterLayerEdges(graph);
    expect(counts.get(0)).toBe(2);
    expect(counts.get(1)).toBe(1);
    expect(counts.has(2)).toBe(false);
  });
});

describe("computeGapForBoundary", () => {
  const opts = {
    gapMin: 100,
    gapMax: 200,
    edgeThreshold: 10,
    edgeNormalizeM: 20,
  };

  it("returns gapMin when edge count is at or below threshold", () => {
    expect(computeGapForBoundary(10, opts)).toBe(100);
    expect(computeGapForBoundary(3, opts)).toBe(100);
  });

  it("returns gapMax when excess reaches normalize M", () => {
    expect(computeGapForBoundary(30, opts)).toBe(200);
    expect(computeGapForBoundary(100, opts)).toBe(200);
  });

  it("interpolates linearly between min and max", () => {
    expect(computeGapForBoundary(20, opts)).toBe(150);
  });
});

describe("assignYCoordinates adaptive gaps", () => {
  it("uses a larger gap after the denser inter-layer boundary", () => {
    const manyTargets = Array.from({ length: 30 }, (_, index) =>
      node(`t${index}`, 1),
    );
    const graph = layoutWith(
      [node("root", 0), ...manyTargets, node("leaf", 2)],
      [
        ...manyTargets.map((t) => ["root", t.id] as [string, string]),
        ["t0", "leaf"],
        ["t1", "leaf"],
      ],
    );

    assignYCoordinates(graph, {
      gapMin: 50,
      gapMax: 150,
      edgeThreshold: 5,
      edgeNormalizeM: 25,
      adaptiveVerticalGap: true,
    });

    const rootY = graph.nodes.get("root")!.y!;
    const leafY = graph.nodes.get("leaf")!.y!;
    const layer1Y = graph.nodes.get("t0")!.y!;

    const gap0to1 = layer1Y - (rootY + 28);
    const gap1to2 = leafY - (layer1Y + 28);

    expect(gap0to1).toBeGreaterThan(gap1to2);
    expect(gap0to1).toBe(150);
    expect(gap1to2).toBe(50);
  });
});

function node(id: string, layer: number, height = 28): LayoutNode {
  return { id, isDummy: false, layer, width: 100, height };
}

function layoutWith(
  nodes: LayoutNode[],
  edges: [string, string][],
): LayoutGraph {
  const map = new Map(nodes.map((n) => [n.id, n]));
  const adjacencyList = new Map<string, Set<string>>();
  for (const n of nodes) adjacencyList.set(n.id, new Set());
  for (const [from, to] of edges) {
    adjacencyList.get(from)!.add(to);
  }
  return { nodes: map, adjacencyList };
}