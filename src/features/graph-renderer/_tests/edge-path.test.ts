import { describe, expect, it } from "vitest";

import {
  buildOrthogonalEdgePoints,
  cubicBezierEdgePath,
  edgeSegmentPath,
  edgeSourceAnchor,
  edgeTargetAnchor,
  logicalEdgePath,
  pointsToSvgPath,
} from "../utils/edge-path";
import type { EdgeRoutingProfile } from "../utils/edge-routing";

describe("edge anchors", () => {
  it("uses bottom-center and top-center for module boxes", () => {
    const from = { x: 10, y: 20, width: 100, height: 28 };
    const to = { x: 50, y: 80, width: 160, height: 28 };

    expect(edgeSourceAnchor(from)).toEqual({ x: 60, y: 48 });
    expect(edgeTargetAnchor(to)).toEqual({ x: 130, y: 80 });
  });

  it("uses x for zero-width dummy anchors", () => {
    const dummy = { x: 42, y: 60, width: 0, height: 0 };
    expect(edgeSourceAnchor(dummy)).toEqual({ x: 42, y: 60 });
    expect(edgeTargetAnchor(dummy)).toEqual({ x: 42, y: 60 });
  });
});

describe("buildOrthogonalEdgePoints", () => {
  it("builds downward midY routing", () => {
    const from = { x: 0, y: 0, width: 40, height: 20 };
    const to = { x: 80, y: 60, width: 40, height: 20 };

    const points = buildOrthogonalEdgePoints(from, to);
    expect(points).toEqual([
      { x: 20, y: 20 },
      { x: 20, y: 40 },
      { x: 100, y: 40 },
      { x: 100, y: 60 },
    ]);
  });
});

describe("pointsToSvgPath", () => {
  it("formats an SVG polyline", () => {
    expect(
      pointsToSvgPath([
        { x: 0, y: 0 },
        { x: 0, y: 10 },
        { x: 5, y: 10 },
      ]),
    ).toBe("M 0 0 L 0 10 L 5 10");
  });
});

describe("edgeSegmentPath", () => {
  it("returns a path for a downward segment", () => {
    const path = edgeSegmentPath(
      { x: 0, y: 0, width: 20, height: 10 },
      { x: 0, y: 40, width: 20, height: 10 },
    );
    expect(path).toContain("M 10 10");
    expect(path).toContain("L 10 25");
  });
});

describe("cubicBezierEdgePath", () => {
  it("emits a cubic command between ports", () => {
    const routing: EdgeRoutingProfile = {
      source: { x: 40, y: 10 },
      target: { x: 120, y: 110 },
      lateralBias: 0,
    };

  const path = cubicBezierEdgePath(routing);
    expect(path).toMatch(/^M 40 10 C /);
    expect(path).toContain("120 110");
  });

  it("applies lateral bias to control points", () => {
    const routing: EdgeRoutingProfile = {
      source: { x: 0, y: 0 },
      target: { x: 100, y: 100 },
      lateralBias: 6,
    };

    const path = cubicBezierEdgePath(routing);
    expect(path).toContain("6 ");
  });
});

describe("logicalEdgePath", () => {
  it("delegates to cubic bezier routing", () => {
    const routing: EdgeRoutingProfile = {
      source: { x: 10, y: 20 },
      target: { x: 80, y: 120 },
      lateralBias: 0,
    };

    expect(logicalEdgePath(routing)).toBe(cubicBezierEdgePath(routing));
  });
});