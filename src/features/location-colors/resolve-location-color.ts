import { pathMatchesMask } from "../graph-filters";

import type { LocationColorId, LocationColorRule } from "./types";

export function resolveColorId(
  moduleId: string,
  rules: readonly LocationColorRule[],
): LocationColorId | null {
  for (const rule of rules) {
    if (pathMatchesMask(rule.mask, moduleId)) {
      return rule.colorId;
    }
  }
  return null;
}