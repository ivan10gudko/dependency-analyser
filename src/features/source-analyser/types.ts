import type { ModuleId } from "../project/types";

/**
 * One source file and the project modules it imports.
 * Each dependency is a module id, the same string as `AnalyzedModule.path`.
 */
export interface AnalyzedModule {
  path: ModuleId;
  dependencies: ModuleId[];
}

export interface AnalyzeModuleSkipped {
  reason: "unsupportedExtension";
  message: string;
}

export type AnalyzeModuleResult =
  | { ok: true; module: AnalyzedModule }
  | { ok: false; skipped: AnalyzeModuleSkipped };
