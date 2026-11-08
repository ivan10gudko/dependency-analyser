import ts from "typescript";

import { fileNameOf } from "../../lib/path";
import type { ProjectConfig } from "../configuration-analyser/types";
import type { ModuleId, ProjectAnalysis, ProjectFile } from "../project/types";

import { resolveDependencies, SOURCE_EXTENSIONS } from "./resolve";
import type {
  AnalyzedModule,
  AnalyzeModuleResult,
} from "./types";

const SOURCE_EXTENSION_SET = new Set<string>(SOURCE_EXTENSIONS);

function convertToSourceFile(file: ProjectFile): ts.SourceFile {
  return ts.createSourceFile(
    fileNameOf(file.path),
    file.content,
    ts.ScriptTarget.Latest,
    true,
  );
}

function moduleSpecifierOf(node: ts.Node): string | undefined {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
    const specifier = node.moduleSpecifier;
    if (specifier && ts.isStringLiteral(specifier)) return specifier.text;
    return undefined;
  }

  if (
    ts.isCallExpression(node) &&
    node.expression.kind === ts.SyntaxKind.ImportKeyword &&
    node.arguments[0] &&
    ts.isStringLiteral(node.arguments[0])
  ) {
    return node.arguments[0].text;
  }

  return undefined;
}

function findImportSpecifiers(sourceFile: ts.SourceFile): string[] {
  const importSpecifiers: string[] = [];

  function visit(node: ts.Node): void {
    const specifier = moduleSpecifierOf(node);
    if (specifier) importSpecifiers.push(specifier);
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return importSpecifiers;
}

function extensionOfModulePath(path: string): string {
  const name = fileNameOf(path);
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return "";
  return name.slice(dot).toLowerCase();
}

/**
 * Extracts import specifiers from one file and resolves them to module ids.
 */
export async function analyzeModule(
  file: ProjectFile,
  context: { config: ProjectConfig; moduleIds: ReadonlySet<ModuleId> },
): Promise<AnalyzeModuleResult> {
  const extension = extensionOfModulePath(file.path);
  if (!SOURCE_EXTENSION_SET.has(extension)) {
    return {
      ok: false,
      skipped: {
        reason: "unsupportedExtension",
        message: `expected a JavaScript or TypeScript file, got "${fileNameOf(file.path)}"`,
      },
    };
  }

  const sourceFile = convertToSourceFile(file);
  const module: AnalyzedModule = {
    path: file.path,
    dependencies: resolveDependencies(
      findImportSpecifiers(sourceFile),
      file.path,
      context.config,
      context.moduleIds,
    ),
  };

  return { ok: true, module };
}


function emptyProjectConfig(rootPath: string): ProjectConfig {
  return {
    rootPath,
    aliases: [],
    packageImports: [],
    externalPackages: [],
  };
}

export async function analyzeProject(
  files: ProjectFile[],
  options?: { rootPathAbsolute?: string; config?: ProjectConfig },
): Promise<ProjectAnalysis> {
  const config = options?.config ?? emptyProjectConfig(options?.rootPathAbsolute ?? "");
  const moduleIds = new Set(
    files
      .filter((file) => SOURCE_EXTENSION_SET.has(extensionOfModulePath(file.path)))
      .map((file) => file.path),
  );
  const modules: AnalyzedModule[] = [];
  let totalDependencies = 0;

  for (const file of files) {
    const result = await analyzeModule(file, { config, moduleIds });
    if (!result.ok) continue;
    modules.push(result.module);
    totalDependencies += result.module.dependencies.length;
  }

  return {
    rootPath: "",
    rootPathAbsolute: options?.rootPathAbsolute,
    config,
    modules,
    stats: {
      fileCount: files.length,
      moduleCount: modules.length,
      totalDependencies,
    },
  };
}
