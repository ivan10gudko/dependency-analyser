import type { LocationColorId, LocationColorRule } from "./types";

export function manualColorForMask(
  rules: readonly LocationColorRule[],
  mask: string,
): LocationColorId | null {
  const entry = rules.find((rule) => rule.mask === mask);
  return entry?.colorId ?? null;
}