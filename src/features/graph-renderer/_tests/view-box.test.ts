import { describe, expect, it } from "vitest";

import { DEFAULT_MODULE_NODE_SIZE } from "../../hierarchical-graph-layout";
import {
  clampViewBoxZoom,
  formatViewBox,
  GRAPH_DETAIL_MIN_NODE_PX,
  graphDetailLevel,
  MIN_VIEW_BOX_WIDTH,
  MIN_VIEW_WIDTH_RATIO,
  parseViewBox,
  wheelZoomScaleFactor,
  zoomViewBoxAt,
} from "../utils/view-box";

describe("view-box", () => {
  it("round-trips parse/format", () => {
    const rect = { x: 10, y: 20, width: 100, height: 50 };
    expect(parseViewBox(formatViewBox(rect))).toEqual(rect);
  });

  it("zooms toward a focus point", () => {
    const rect = { x: 0, y: 0, width: 100, height: 100 };
    const zoomed = zoomViewBoxAt(rect, 0.5, 50, 50);
    expect(zoomed.width).toBe(50);
    expect(zoomed.x).toBe(25);
    expect(zoomed.y).toBe(25);
  });
});

describe("clampViewBoxZoom", () => {
  const center = { x: 0, y: 0, width: 1000, height: 500 };

  it("caps max zoom-in with ratio on small graphs", () => {
    const base = { x: 0, y: 0, width: 400, height: 200 };
    const tooDeep = { x: 0, y: 0, width: 10, height: 5 };
    const clamped = clampViewBoxZoom(tooDeep, base);
    expect(clamped.width).toBe(base.width * MIN_VIEW_WIDTH_RATIO);
  });

  it("caps max zoom-in with absolute width on large graphs", () => {
    const base = { x: 0, y: 0, width: 50_000, height: 25_000 };
    const tooDeep = { x: 0, y: 0, width: 8, height: 4 };
    const clamped = clampViewBoxZoom(tooDeep, base);
    expect(clamped.width).toBe(MIN_VIEW_BOX_WIDTH);
  });

  it("limits zoom-out", () => {
    const base = center;
    const tooWide = { x: -5000, y: -2500, width: 20_000, height: 10_000 };
    const clamped = clampViewBoxZoom(tooWide, base);
    expect(clamped.width).toBe(base.width * 8);
  });

  it("leaves in-range viewBox unchanged", () => {
    const base = center;
    const rect = { x: 100, y: 50, width: 400, height: 200 };
    expect(clampViewBoxZoom(rect, base)).toEqual(rect);
  });
});

describe("graphDetailLevel", () => {
  const nodeWidth = DEFAULT_MODULE_NODE_SIZE.width;
  const viewportWidth = 1000;
  const fullWidth = (nodeWidth / GRAPH_DETAIL_MIN_NODE_PX) * viewportWidth;

  it("shows labels when a module is at least the minimum screen size", () => {
    expect(graphDetailLevel(fullWidth, viewportWidth)).toBe("full");
    expect(graphDetailLevel(fullWidth / 2, viewportWidth)).toBe("full");
  });

  it("hides labels and markers when modules are smaller than the minimum", () => {
    expect(graphDetailLevel(fullWidth + 1, viewportWidth)).toBe("overview");
  });

  it("keeps detail until the viewport has a size", () => {
    expect(graphDetailLevel(fullWidth, 0)).toBe("full");
    expect(graphDetailLevel(0, viewportWidth)).toBe("full");
  });
});

describe("wheelZoomScaleFactor", () => {
  it("zooms in when deltaY is negative", () => {
    const factor = wheelZoomScaleFactor(-100, 0);
    expect(factor).toBeLessThan(1);
    expect(factor).toBeGreaterThanOrEqual(0.92);
  });

  it("zooms out when deltaY is positive", () => {
    const factor = wheelZoomScaleFactor(100, 0);
    expect(factor).toBeGreaterThan(1);
    expect(factor).toBeLessThanOrEqual(1.08);
  });

  it("clamps large trackpad deltas per event", () => {
    const factor = wheelZoomScaleFactor(500, 0);
    expect(factor).toBe(1.08);
    expect(wheelZoomScaleFactor(-500, 0)).toBe(0.92);
  });
});