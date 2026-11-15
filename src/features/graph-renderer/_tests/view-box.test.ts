import { describe, expect, it } from "vitest";

import { formatViewBox, parseViewBox, zoomViewBoxAt } from "../utils/view-box";

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