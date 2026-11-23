import { describe, expect, it } from "vitest";

import { toBarrelNodeId } from "../../barrel-view";
import {
  collectBarrelFolderNodeIds,
  focusFitPaddingForCount,
  focusNodeCenterInLayout,
  resolveBarrelToggleTargetViewBox,
  resolveFocusFramePlan,
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

describe("resolveBarrelToggleTargetViewBox", () => {
  const barrelId = toBarrelNodeId("src/features/ui");
  const layout: LayoutRenderModel = {
    nodes: [
      {
        id: barrelId,
        kind: "barrel",
        isDummy: false,
        layer: 0,
        width: 120,
        height: 28,
        x: 500,
        y: 100,
      },
      {
        id: "src/features/ui/button.tsx",
        isDummy: false,
        layer: 1,
        width: 120,
        height: 28,
        x: 700,
        y: 160,
      },
      {
        id: "src/app.tsx",
        isDummy: false,
        layer: 0,
        width: 120,
        height: 28,
        x: 5000,
        y: 100,
      },
    ],
    edges: [],
    layerOrder: {},
  };

  it("collects the barrel node and its visible folder siblings", () => {
    expect([...collectBarrelFolderNodeIds(layout, barrelId)].sort()).toEqual(
      [barrelId, "src/features/ui/button.tsx"].sort(),
    );
  });

  it("frames the expanded barrel and its siblings instead of zooming out to the whole graph", () => {
    const prior = { x: 200, y: 0, width: 800, height: 450 };
    const target = resolveBarrelToggleTargetViewBox(layout, barrelId, true, 16 / 9, prior);
    expect(target).not.toBeNull();
    // Should stay focused around x=[500..820], not pull out to src/app.tsx at x=5000
    expect(target!.width).toBeLessThan(1200);
    expect(target!.x).toBeLessThan(500);
    expect(target!.x + target!.width).toBeGreaterThan(820);
  });

  it("keeps prior zoom centered on the collapsed barrel node", () => {
    const prior = { x: 0, y: 0, width: 900, height: 500 };
    const target = resolveBarrelToggleTargetViewBox(layout, barrelId, false, 16 / 9, prior);
    expect(target).not.toBeNull();
    expect(target!.width).toBe(prior.width);
    expect(target!.height).toBe(prior.height);
    expect(target!.x + target!.width / 2).toBeCloseTo(560, 5);
    expect(target!.y + target!.height / 2).toBeCloseTo(114, 5);
  });
});

describe("resolveFocusFramePlan settleScaleViewBox", () => {
  it("settles back to the pre-reveal scale even when triggered mid-pullback", () => {
    const layout: LayoutRenderModel = {
      nodes: [
        { id: "a.ts", isDummy: false, layer: 0, width: 100, height: 28, x: 0, y: 0 },
        { id: "b.ts", isDummy: false, layer: 1, width: 100, height: 28, x: 2500, y: 0 },
      ],
      edges: [],
      layerOrder: {},
    };
    const focusVisual = {
      active: true,
      nodeStateById: new Map([
        ["a.ts", "focus" as const],
        ["b.ts", "descendant" as const],
      ]),
      edgeStateByKey: new Map(),
    };
    const base = { x: 0, y: 0, width: 10_000, height: 2_000 };
    const midPullbackView = { x: -500, y: -500, width: 4_000, height: 2_250 };
    const preRevealOrigin = { x: 0, y: 0, width: 600, height: 337.5 };

    const plan = resolveFocusFramePlan(
      layout,
      focusVisual,
      16 / 9,
      "a.ts",
      midPullbackView,
      base,
      preRevealOrigin,
    );

    expect(plan?.mode).toBe("reveal");
    if (plan?.mode === "reveal") {
      expect(plan.prior).toEqual(midPullbackView);
      expect(plan.settle.width).toBe(preRevealOrigin.width);
      expect(plan.settle.height).toBe(preRevealOrigin.height);
    }
  });
});