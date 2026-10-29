import type { ModuleId } from "../project/types";

/**
 * Result of AST analysis for one file.
 * `importSpecifiers` are literal strings from source; targets are not resolved.
 */
export interface AnalyzedModule {
  path: ModuleId;
  importSpecifiers: string[];
}

export interface AnalyzeModuleSkipped {
  reason: "unsupportedExtension";
  message: string;
}

export type AnalyzeModuleResult =
  | { ok: true; module: AnalyzedModule }
  | { ok: false; skipped: AnalyzeModuleSkipped };
