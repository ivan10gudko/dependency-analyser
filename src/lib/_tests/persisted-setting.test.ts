import { describe, expect, it } from "vitest";

import { parseStringEnum } from "../persisted-setting";

describe("parseStringEnum", () => {
  const allowed = ["a", "b"] as const;

  it("returns fallback when missing", () => {
    expect(parseStringEnum(null, allowed, "a")).toBe("a");
  });

  it("returns stored value when allowed", () => {
    expect(parseStringEnum("b", allowed, "a")).toBe("b");
  });

  it("returns fallback when value is not allowed", () => {
    expect(parseStringEnum("c", allowed, "a")).toBe("a");
  });
});