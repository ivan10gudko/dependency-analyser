import { describe, expect, it } from "vitest";

import type { LayoutGraph, LayoutNode } from "./types";

import { assignYCoordinates } from "./assign-y-coordinates";

function layoutWith(nodes: LayoutNode[]): LayoutGraph {
  const map = new Map(nodes.map((node) => [node.id, node]));
  const adjacencyList = new Map<string, Set<string>>();
  for (const node of nodes) adjacencyList.set(node.id, new Set());
  return { nodes: map, adjacencyList };
}

describe("assignYCoordinates", () => {
  it("centers shorter nodes within the tallest row height", () => {
    const layout = layoutWith([
      {
        id: "D",
        isDummy: false,
        layer: 1,
        width: 100,
        height: 20,
      },
      {
        id: "E",
        isDummy: false,
        layer: 1,
        width: 100,
        height: 40,
      },
      {
        id: "F",
        isDummy: false,
        layer: 2,
        width: 100,
        height: 24,
      },
    ]);

    assignYCoordinates(layout, { verticalNodeOffset: 10 });

    expect(layout.nodes.get("E")!.y).toBe(0);
    expect(layout.nodes.get("D")!.y).toBe(10);
    expect(layout.nodes.get("F")!.y).toBe(50);
  });

  it("gives dummy nodes the same row y as real modules on that layer", () => {
    const layout = layoutWith([
      {
        id: "B",
        isDummy: false,
        layer: 2,
        width: 100,
        height: 28,
      },
      {
        id: "__dummy__/0/L3",
        isDummy: true,
        layer: 3,
        width: 0,
        height: 0,
      },
      {
        id: "F",
        isDummy: false,
        layer: 4,
        width: 100,
        height: 28,
      },
    ]);

    assignYCoordinates(layout, { verticalNodeOffset: 40 });

    expect(layout.nodes.get("__dummy__/0/L3")!.y).toBe(68);
    expect(layout.nodes.get("F")!.y).toBe(108);
  });
});