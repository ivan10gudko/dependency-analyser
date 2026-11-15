import { describe, expect, it } from "vitest";

import { DEFAULT_CONNECTIVITY_DEPTH } from "../types";
import { parseConnectivityDepth } from "../graph-interaction-reducer";

describe("parseConnectivityDepth", () => {
  it("parses all", () => {
    expect(parseConnectivityDepth("all")).toBe("all");
  });

  it("returns default for null", () => {
    expect(parseConnectivityDepth(null)).toBe(DEFAULT_CONNECTIVITY_DEPTH);
  });

  it("parses positive integers", () => {
    expect(parseConnectivityDepth("3")).toBe(3);
    expect(parseConnectivityDepth("3.7")).toBe(3);
  });

  it("rejects invalid numbers", () => {
    expect(parseConnectivityDepth("0")).toBe(DEFAULT_CONNECTIVITY_DEPTH);
    expect(parseConnectivityDepth("nope")).toBe(DEFAULT_CONNECTIVITY_DEPTH);
  });
});