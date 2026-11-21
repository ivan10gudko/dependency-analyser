import type { LocationColorId } from "./types";
import { resolveColorId } from "./resolve-location-color";
import type { LocationColorRule } from "./types";

export function buildLocationColorMap(
  moduleIds: readonly string[],
  rules: readonly LocationColorRule[],
): ReadonlyMap<string, LocationColorId> {
  const map = new Map<string, LocationColorId>();
  for (const moduleId of moduleIds) {
    const colorId = resolveColorId(moduleId, rules);
    if (colorId) map.set(moduleId, colorId);
  }
  return map;
}