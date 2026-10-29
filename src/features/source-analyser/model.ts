import ts from "typescript";

import { moduleBaseName } from "../project/path";
import type { ProjectAnalysis, ProjectFile } from "../project/types";

import type {
  AnalyzedModule,
  AnalyzeModuleResult,
} from "./types";

const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
]);

function convertToSourceFile(file: ProjectFile): ts.SourceFile {
  return ts.createSourceFile(
    moduleBaseName(file.path),
    file.content,
    ts.ScriptTarget.Latest,
    true,
  );
}

function findImportSpecifiers(sourceFile: ts.SourceFile): string[] {
  const importSpecifiers: string[] = [];

  function visit(node: ts.Node): void {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      importSpecifiers.push(node.moduleSpecifier.text);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return importSpecifiers;
}

function extensionOfModulePath(path: string): string {
  const name = moduleBaseName(path);
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return "";
  return name.slice(dot).toLowerCase();
}

/**
 * Extracts import specifiers from one file. Does not resolve specifiers to project files.
 */
export function analyzeModule(file: ProjectFile): AnalyzeModuleResult {
  const extension = extensionOfModulePath(file.path);
  if (!SOURCE_EXTENSIONS.has(extension)) {
    return {
      ok: false,
      skipped: {
        reason: "unsupportedExtension",
        message: `expected a JavaScript or TypeScript file, got "${moduleBaseName(file.path)}"`,
      },
    };
  }

  const sourceFile = convertToSourceFile(file);
  const module: AnalyzedModule = {
    path: file.path,
    importSpecifiers: findImportSpecifiers(sourceFile),
  };

  return { ok: true, module };
}

export function analyzeProject(
  files: ProjectFile[],
  options?: { rootPathAbsolute?: string },
): ProjectAnalysis {
  const modules: AnalyzedModule[] = [];
  let totalImportSpecifiers = 0;

  for (const file of files) {
    const result = analyzeModule(file);
    if (!result.ok) {
      continue;
    }
    modules.push(result.module);
    totalImportSpecifiers += result.module.importSpecifiers.length;
  }

  return {
    rootPath: "",
    rootPathAbsolute: options?.rootPathAbsolute,
    modules,
    stats: {
      fileCount: files.length,
      moduleCount: modules.length,
      totalImportSpecifiers,
    },
  };
}
