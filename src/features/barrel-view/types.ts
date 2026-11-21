import type { ModuleId } from "../project/types";

export const BARREL_INDEX_NAMES = [
  "index.ts",
  "index.tsx",
  "index.js",
  "index.jsx",
] as const;

export interface BarrelDeepImport {
  importer: ModuleId;
  target: ModuleId;
}

export interface BarrelFolderInfo {
  directory: string;
  indexModuleId: ModuleId;
  hiddenModules: ReadonlySet<ModuleId>;
  /** Shown as separate module nodes when collapsed (deep imports). */
  exposedModules: ReadonlySet<ModuleId>;
  deepImports: readonly BarrelDeepImport[];
}

export interface BarrelDisplayOptions {
  barrelViewEnabled: boolean;
  expandedDirectories: ReadonlySet<string>;
}