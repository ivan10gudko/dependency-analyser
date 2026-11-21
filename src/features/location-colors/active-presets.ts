import { pathMatchesMask } from "../graph-filters";

import { LOCATION_COLOR_PRESETS } from "./presets";
import type { LocationColorPreset } from "./types";

export function listPresetActivity(
  moduleIds: readonly string[],
): { preset: LocationColorPreset; active: boolean }[] {
  return LOCATION_COLOR_PRESETS.map((preset) => ({
    preset,
    active: moduleIds.some((id) => pathMatchesMask(preset.mask, id)),
  }));
}

export function activePresetRules(
  moduleIds: readonly string[],
  disabledPresetIds: readonly string[] = [],
): LocationColorPreset[] {
  const disabled = new Set(disabledPresetIds);
  return listPresetActivity(moduleIds)
    .filter((entry) => entry.active)
    .map((entry) => entry.preset)
    .filter((preset) => !disabled.has(preset.id));
}