import type { AnalyzedModule } from "../source-analyser/types";

/** Normalized project-relative path; unique module key. */
export type ModuleId = string;

export interface ProjectFile {
  path: ModuleId;
  content: string;
}

export interface ProjectAnalysisStats {
  fileCount: number;
  moduleCount: number;
  totalImportSpecifiers: number;
}

export interface ProjectAnalysis {
  /** Empty string denotes the project root as module namespace. */
  rootPath: "";
  rootPathAbsolute?: string;
  modules: AnalyzedModule[];
  stats: ProjectAnalysisStats;
}

export interface NormalizePathOptions {
  projectRootAbsolute: string;
}
