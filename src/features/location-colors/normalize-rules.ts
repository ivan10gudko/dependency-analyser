import { isLocationColorId, type LocationColorRule } from "./types";

export function normalizeLocationColorRules(
  rules: readonly LocationColorRule[],
): LocationColorRule[] {
  const seen = new Set<string>();
  const result: LocationColorRule[] = [];
  for (const rule of rules) {
    const mask = rule.mask.trim();
    if (!mask || !isLocationColorId(rule.colorId)) continue;
    const key = `${mask}\0${rule.colorId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ mask, colorId: rule.colorId });
  }
  return result;
}

export function mergeLocationColorRule(
  existing: readonly LocationColorRule[],
  added: LocationColorRule,
): LocationColorRule[] {
  return upsertLocationColorRule(existing, added);
}

export function upsertLocationColorRule(
  existing: readonly LocationColorRule[],
  rule: LocationColorRule,
): LocationColorRule[] {
  const mask = rule.mask.trim();
  if (!mask || !isLocationColorId(rule.colorId)) {
    return normalizeLocationColorRules([...existing]);
  }
  const without = existing.filter((entry) => entry.mask !== mask);
  return normalizeLocationColorRules([...without, { mask, colorId: rule.colorId }]);
}

export function removeLocationColorRuleByMask(
  existing: readonly LocationColorRule[],
  mask: string,
): LocationColorRule[] {
  const trimmed = mask.trim();
  return existing.filter((entry) => entry.mask !== trimmed);
}