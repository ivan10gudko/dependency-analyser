import { describe, expect, it } from "vitest";

import {
  focusFitPaddingForCount,
  viewBoxToFitContent,
} from "../utils/focus-viewport";

describe("focusFitPaddingForCount", () => {
  it("uses more padding for smaller highlights", () => {
    expect(focusFitPaddingForCount(1)).toBeGreaterThan(focusFitPaddingForCount(10));
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