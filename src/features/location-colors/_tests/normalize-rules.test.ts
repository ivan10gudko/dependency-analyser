import { describe, expect, it } from "vitest";

import {
  removeLocationColorRuleByMask,
  upsertLocationColorRule,
} from "../normalize-rules";

describe("upsertLocationColorRule", () => {
  it("replaces color for the same mask", () => {
    const next = upsertLocationColorRule(
      [{ mask: "**/features/**", colorId: "green" }],
      { mask: "**/features/**", colorId: "rose" },
    );
    expect(next).toEqual([{ mask: "**/features/**", colorId: "rose" }]);
  });
});

describe("removeLocationColorRuleByMask", () => {
  it("drops rules with the given mask", () => {
    const next = removeLocationColorRuleByMask(
      [
        { mask: "**/features/**", colorId: "green" },
        { mask: "src/app/**", colorId: "blue" },
      ],
      "**/features/**",
    );
    expect(next).toEqual([{ mask: "src/app/**", colorId: "blue" }]);
  });
});