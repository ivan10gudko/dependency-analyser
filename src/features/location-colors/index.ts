export { listPresetActivity, activePresetRules } from "./active-presets";
export { buildEffectiveLocationRules } from "./build-effective-rules";
export { buildLocationColorMap } from "./build-location-color-map";
export {
  DEFAULT_LOCATION_COLOR_ID,
  LOCATION_COLOR_SWATCHES,
  type LocationColorSwatch,
} from "./palette";
export { LOCATION_COLOR_PRESETS } from "./presets";
export { resolveColorId } from "./resolve-location-color";
export { manualColorForMask } from "./resolve-manual-color";
export {
  mergeLocationColorRule,
  normalizeLocationColorRules,
  removeLocationColorRuleByMask,
  upsertLocationColorRule,
} from "./normalize-rules";
export type {
  LocationColorId,
  LocationColorPreset,
  LocationColorRule,
} from "./types";
export { LOCATION_COLOR_IDS, isLocationColorId } from "./types";