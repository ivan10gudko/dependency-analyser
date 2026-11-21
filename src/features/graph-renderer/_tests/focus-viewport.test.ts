import { describe, expect, it } from "vitest";

import {
  focusFitPaddingForCount,
  focusNodeCenterInLayout,
  shouldPlayFocusRevealAnimation,
  viewBoxToFitContent,
  viewBoxWithSameScaleCenteredOn,
} from "../utils/focus-viewport";
import type { LayoutRenderModel } from "../../hierarchical-graph-layout";

describe("focusFitPaddingForCount", () => {
  it("uses more padding for smaller highlights", () => {
    expect(focusFitPaddingForCount(1)).toBeGreaterThan(focusFitPaddingForCount(10));
  });
});

describe("shouldPlayFocusRevealAnimation", () => {
  const base = { x: 0, y: 0, width: 10_000, height: 5_000 };
  const prior = { x: 200, y: 100, width: 800, height: 450 };

  it("reveals when overview is much wider than prior view", () => {
    const overview = { x: 0, y: 0, width: 1_400, height: 787.5 };
    expect(shouldPlayFocusRevealAnimation(overview, prior, base)).toBe(true);
  });

  it("skips reveal for modest overview expansion", () => {
    const overview = { x: 150, y: 80, width: 1_000, height: 562.5 };
    expect(shouldPlayFocusRevealAnimation(overview, prior, base)).toBe(false);
  });

  it("reveals when overview covers a large slice of the graph", () => {
    const overview = { x: 0, y: 0, width: 3_200, height: 1_800 };
    const zoomedPrior = { x: 0, y: 0, width: 2_800, height: 1_575 };
    expect(shouldPlayFocusRevealAnimation(overview, zoomedPrior, base)).toBe(true);
  });
});

describe("viewBoxWithSameScaleCenteredOn", () => {
  it("keeps dimensions and centers on the focus node", () => {
    const prior = { x: 100, y: 50, width: 400, height: 225 };
    const centered = viewBoxWithSameScaleCenteredOn(prior, { x: 500, y: 300 });
    expect(centered.width).toBe(prior.width);
    expect(centered.height).toBe(prior.height);
    expect(centered.x + centered.width / 2).toBe(500);
    expect(centered.y + centered.height / 2).toBe(300);
  });
});

describe("focusNodeCenterInLayout", () => {
  it("returns the node bbox center", () => {
    const layout: LayoutRenderModel = {
      nodes: [
        {
          id: "a.ts",
          isDummy: false,
          layer: 0,
          width: 100,
          height: 20,
          x: 40,
          y: 10,
        },
      ],
      edges: [],
      layerOrder: {},
    };
    expect(focusNodeCenterInLayout(layout, "a.ts")).toEqual({ x: 90, y: 20 });
  });
});

describe("viewBoxToFitContent", () => {
  it("centers content in viewport aspect", () => {
    const content = { x: 100, y: 50, width: 80, height: 40 };
    const fitted = viewBoxToFitContent(content, 16 / 9, 0.1);
    const cx = fitted.x + fitted.width / 2;
    const cy = fitted.y + fitted.height / 2;
    expect(cx).toBeCloseTo(140, 0);
    expect(cy).toBeCloseTo(70, 0);
    expect(fitted.width / fitted.height).toBeCloseTo(16 / 9, 5);
  });
});