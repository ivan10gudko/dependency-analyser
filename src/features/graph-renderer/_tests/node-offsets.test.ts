import { describe, expect, it } from "vitest";

import type { LayoutRenderNode } from "../../hierarchical-graph-layout";

import { applyNodeOffsets, screenDeltaToViewDelta } from "../utils/node-offsets";

function node(id: string, overrides: Partial<LayoutRenderNode> = {}): LayoutRenderNode {
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

describe("applyNodeOffsets", () => {
  it("shifts a module node and leaves the rest in place", () => {
    const nodes = [
      node("a", { x: 10, y: 20 }),
      node("dummy", { isDummy: true, x: 1, y: 2, width: 0, height: 0 }),
      node("b", { x: 40, y: 50 }),
    ];
    const offsets = new Map([
      ["a", { dx: 5, dy: -3 }],
      ["dummy", { dx: 100, dy: 100 }],
    ]);

    const next = applyNodeOffsets(nodes, offsets);

    expect(next[0]).toMatchObject({ id: "a", x: 15, y: 17 });
    expect(next[1]).toBe(nodes[1]);
    expect(next[2]).toBe(nodes[2]);
  });

  it("returns the same array when nothing moves", () => {
    const nodes = [node("a")];
    expect(applyNodeOffsets(nodes, new Map())).toBe(nodes);
    expect(applyNodeOffsets(nodes, new Map([["a", { dx: 0, dy: 0 }]]))).toBe(nodes);
  });
});

describe("screenDeltaToViewDelta", () => {
  it("maps a screen delta into viewBox units", () => {
    const delta = screenDeltaToViewDelta(
      10,
      -20,
      { x: 0, y: 0, width: 200, height: 100 },
      100,
      50,
    );
    expect(delta).toEqual({ dx: 20, dy: -40 });
  });

  it("returns zero when the viewport has no size", () => {
    expect(
      screenDeltaToViewDelta(10, 10, { x: 0, y: 0, width: 100, height: 100 }, 0, 0),
    ).toEqual({ dx: 0, dy: 0 });
  });

  it("uses uniform SVG meet scale for vertical node drag in mismatched aspect ratios", () => {
    const delta = screenDeltaToViewDelta(
      10,
      20,
      { x: 0, y: 0, width: 8000, height: 500 },
      800,
      600,
    );
    expect(delta).toEqual({ dx: 100, dy: 200 });
  });
});
