import { describe, expect, it } from "vitest";

import { computeLayoutBounds } from "../utils/layout-bounds";

describe("computeLayoutBounds", () => {
  it("returns stable bounds for an empty graph", () => {
    expect(computeLayoutBounds([], 16)).toEqual({
      width: 32,
      height: 32,
      viewBox: "-16 -16 32 32",
    });
  });

  it("accounts for min coordinates and padding", () => {
    const bounds = computeLayoutBounds(
      [
        {
          id: "a",
          isDummy: false,
          layer: 1,
          x: 50,
          y: 40,
          width: 100,
          height: 28,
        },
      ],
      10,
    );

    expect(bounds).toEqual({
      width: 120,
      height: 48,
      viewBox: "40 30 120 48",
    });
  });
});