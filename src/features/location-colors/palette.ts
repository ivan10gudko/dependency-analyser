import type { LocationColorId } from "./types";

export interface LocationColorSwatch {
  id: LocationColorId;
  label: string;
}

export const LOCATION_COLOR_SWATCHES: readonly LocationColorSwatch[] = [
  { id: "green", label: "Green" },
  { id: "blue", label: "Blue" },
  { id: "purple", label: "Purple" },
  { id: "amber", label: "Amber" },
  { id: "rose", label: "Rose" },
  { id: "teal", label: "Teal" },
  { id: "indigo", label: "Indigo" },
  { id: "slate", label: "Slate" },
  { id: "orange", label: "Orange" },
  { id: "cyan", label: "Cyan" },
];

export const DEFAULT_LOCATION_COLOR_ID: LocationColorId = "green";