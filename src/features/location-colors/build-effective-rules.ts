import type { LocationColorRule } from "./types";
import { activePresetRules } from "./active-presets";

export function buildEffectiveLocationRules(
  manualRules: readonly LocationColorRule[],
  autoPresetsEnabled: boolean,
  moduleIds: readonly string[],
): LocationColorRule[] {
  const presetRules: LocationColorRule[] = autoPresetsEnabled
    ? activePresetRules(moduleIds).map((preset) => ({
        mask: preset.mask,
        colorId: preset.colorId,
      }))
    : [];
  return [...manualRules, ...presetRules];
}