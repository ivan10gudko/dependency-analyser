import type { LocationColorRule } from "./types";
import { activePresetRules } from "./active-presets";

export function buildEffectiveLocationRules(
  manualRules: readonly LocationColorRule[],
  autoPresetsEnabled: boolean,
  moduleIds: readonly string[],
  disabledPresetIds: readonly string[] = [],
): LocationColorRule[] {
  const presetRules: LocationColorRule[] = autoPresetsEnabled
    ? activePresetRules(moduleIds, disabledPresetIds).map((preset) => ({
        mask: preset.mask,
        colorId: preset.colorId,
      }))
    : [];
  return [...manualRules, ...presetRules];
}