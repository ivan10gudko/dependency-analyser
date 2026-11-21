import type { LocationColorPreset } from "./types";

export const LOCATION_COLOR_PRESETS: readonly LocationColorPreset[] = [
  { id: "app", label: "app", mask: "**/app/**", colorId: "blue" },
  { id: "pages", label: "pages", mask: "**/pages/**", colorId: "indigo" },
  { id: "widgets", label: "widgets", mask: "**/widgets/**", colorId: "purple" },
  { id: "features", label: "features", mask: "**/features/**", colorId: "green" },
  { id: "entities", label: "entities", mask: "**/entities/**", colorId: "teal" },
  { id: "shared", label: "shared", mask: "**/shared/**", colorId: "slate" },
  { id: "components", label: "components", mask: "**/components/**", colorId: "cyan" },
  { id: "lib", label: "lib", mask: "**/lib/**", colorId: "amber" },
  { id: "utils", label: "utils", mask: "**/utils/**", colorId: "orange" },
  { id: "hooks", label: "hooks", mask: "**/hooks/**", colorId: "rose" },
  { id: "api", label: "api", mask: "**/api/**", colorId: "blue" },
  { id: "services", label: "services", mask: "**/services/**", colorId: "teal" },
  { id: "models", label: "models", mask: "**/models/**", colorId: "purple" },
];