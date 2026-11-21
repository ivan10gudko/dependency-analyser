export const LOCATION_COLOR_IDS = [
  "green",
  "blue",
  "purple",
  "amber",
  "rose",
  "teal",
  "indigo",
  "slate",
  "orange",
  "cyan",
] as const;

export type LocationColorId = (typeof LOCATION_COLOR_IDS)[number];

export function isLocationColorId(raw: string): raw is LocationColorId {
  return (LOCATION_COLOR_IDS as readonly string[]).includes(raw);
}

export interface LocationColorRule {
  mask: string;
  colorId: LocationColorId;
}

export interface LocationColorPreset {
  id: string;
  label: string;
  mask: string;
  colorId: LocationColorId;
}