import { describe, expect, it } from "vitest";

import type { LayoutRenderNode } from "../../hierarchical-graph-layout";

import { buildLogicalEdges, restoreReversedLogicalEdges } from "../utils/logical-edges";

function node(
  id: string,
  overrides: Partial<LayoutRenderNode> = {},
): LayoutRenderNode {
  return {
    id,
    isDummy: false,
    layer: 1,
    x: 0,
    y: 0,
    width: 100,
    height: 28,
    ...overrides,
  };
}

describe("buildLogicalEdges", () => {
  it("chains dummy hops into one module-to-module edge", () => {
    const nodes = [
      node("A", { layer: 1 }),
      node("__d1", { isDummy: true, layer: 2, width: 0, height: 0 }),
      node("B", { layer: 3 }),
    ];
    const nodeById = new Map(nodes.map((entry) => [entry.id, entry]));
    const edges = [
      { from: "A", to: "__d1" },
      { from: "__d1", to: "B" },
    ];

    expect(buildLogicalEdges(edges, nodeById)).toEqual([
      {
        from: "A",
        to: "B",
        waypoints: [nodes[1]],
      },
    ]);
  });

  it("draws a layout-reversed edge in its original direction", () => {
    const edges = buildLogicalEdges(
      [
        { from: "B", to: "A" },
      ],
      new Map([
        ["A", node("A", { y: 80 })],
        ["B", node("B", { y: 0 })],
      ]),
    );

    expect(restoreReversedLogicalEdges(edges, [{ from: "A", to: "B" }])).toEqual([
      { from: "A", to: "B", waypoints: [] },
    ]);
  });

  it("keeps both directions when the reversal shares the layout edge", () => {
    const edges = [{ from: "A", to: "B", waypoints: [] }];
    expect(
      restoreReversedLogicalEdges(edges, [
        { from: "B", to: "A", sharesLayoutEdge: true },
      ]),
    ).toEqual([
      { from: "A", to: "B", waypoints: [] },
      { from: "B", to: "A", waypoints: [] },
    ]);
  });
});
