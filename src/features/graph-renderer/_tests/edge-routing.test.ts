import { describe, expect, it } from "vitest";

import type { LayoutRenderNode } from "../../hierarchical-graph-layout";

import { buildEdgeRoutingProfiles, portTowardNeighbor } from "../utils/edge-routing";
import type { LogicalEdge } from "../utils/logical-edges";

function node(id: string, overrides: Partial<LayoutRenderNode> = {}): LayoutRenderNode {
  return {
    id,
    isDummy: false,
    layer: 1,
    x: 0,
    y: 0,
    width: 120,
    height: 28,
    ...overrides,
  };
}

describe("portTowardNeighbor", () => {
  it("aims the port toward the neighbor center", () => {
    const source = node("A", { x: 0, y: 0, width: 200 });
    const port = portTowardNeighbor(source, 170, "bottom", 0, 1);
    expect(port.x).toBe(170);
    expect(port.y).toBe(28);
  });
});

describe("buildEdgeRoutingProfiles", () => {
  it("orders fan-out by target x and separates ports", () => {
    const edges: LogicalEdge[] = [
      { from: "A", to: "B", waypoints: [] },
      { from: "A", to: "C", waypoints: [] },
      { from: "A", to: "D", waypoints: [] },
    ];
    const nodeById = new Map<string, LayoutRenderNode>([
      ["A", node("A", { width: 360 })],
      ["B", node("B", { x: 0, y: 80 })],
      ["C", node("C", { x: 140, y: 80 })],
      ["D", node("D", { x: 280, y: 80 })],
    ]);

    const profiles = buildEdgeRoutingProfiles(edges, nodeById);

    const bPort = profiles.get("A\u2192B")!.source.x;
    const cPort = profiles.get("A\u2192C")!.source.x;
    const dPort = profiles.get("A\u2192D")!.source.x;

    expect(bPort).toBeLessThan(cPort);
    expect(cPort).toBeLessThan(dPort);
  });

  it("aims target ports toward source positions", () => {
    const edges: LogicalEdge[] = [
      { from: "L", to: "T", waypoints: [] },
      { from: "R", to: "T", waypoints: [] },
    ];
    const nodeById = new Map<string, LayoutRenderNode>([
      ["L", node("L", { x: 0, y: 0 })],
      ["R", node("R", { x: 240, y: 0 })],
      ["T", node("T", { x: 80, y: 90, width: 160 })],
    ]);

    const profiles = buildEdgeRoutingProfiles(edges, nodeById);
    const leftPort = profiles.get("L\u2192T")!.target.x;
    const rightPort = profiles.get("R\u2192T")!.target.x;

    expect(leftPort).toBeLessThan(rightPort);
    expect(leftPort).toBeLessThan(80 + 80);
    expect(rightPort).toBeGreaterThan(80);
  });

  it("anchors an upward edge on the facing borders", () => {
    const edges: LogicalEdge[] = [{ from: "Low", to: "High", waypoints: [] }];
    const nodeById = new Map<string, LayoutRenderNode>([
      ["Low", node("Low", { x: 40, y: 120, width: 80, height: 28 })],
      ["High", node("High", { x: 40, y: 0, width: 80, height: 28 })],
    ]);

    const profile = buildEdgeRoutingProfiles(edges, nodeById).get("Low\u2192High");
    expect(profile?.source.y).toBe(120);
    expect(profile?.target.y).toBe(28);
  });
});