import {
  classifyImportSpecifier,
  ImportSpecifierResolution,
  mappedTargets,
} from "../configuration-analyser/classify";
import type { ProjectConfig } from "../configuration-analyser/types";
import type { ModuleId } from "../project/types";

export const SOURCE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
] as const;

const EXTENSION_SWAPS: Record<string, readonly string[]> = {
  ".js": [".ts", ".tsx"],
  ".jsx": [".tsx", ".ts"],
  ".mjs": [".mts", ".ts"],
  ".cjs": [".cts", ".ts"],
};

function stripQuery(specifier: string): string {
  const query = specifier.indexOf("?");
  const hash = specifier.indexOf("#");
  const cuts = [query, hash].filter((index) => index > 0);
  if (cuts.length === 0) return specifier;
  return specifier.slice(0, Math.min(...cuts));
}

function extensionOf(path: string): string {
  const slash = path.lastIndexOf("/");
  const dot = path.lastIndexOf(".");
  if (dot <= slash) return "";
  return path.slice(dot);
}

/** Collapses `.` and `..`. Returns undefined when the path leaves the project. */
function normalizeInsideProject(path: string): string | undefined {
  const segments: string[] = [];
  for (const segment of path.replace(/\\/g, "/").split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      if (segments.length === 0) return undefined;
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  if (segments.length === 0) return undefined;
  return segments.join("/");
}

function resolveRelative(fromModuleId: string, specifier: string): string | undefined {
  const slash = fromModuleId.lastIndexOf("/");
  const directory = slash === -1 ? "" : fromModuleId.slice(0, slash);
  return normalizeInsideProject(`${directory}/${specifier}`);
}

function candidatesFor(path: string): string[] {
  const candidates = [path];
  const extension = extensionOf(path);
  const swaps = EXTENSION_SWAPS[extension];
  if (swaps) {
    const stem = path.slice(0, -extension.length);
    for (const swap of swaps) candidates.push(stem + swap);
    return candidates;
  }

  if ((SOURCE_EXTENSIONS as readonly string[]).includes(extension)) return candidates;

  for (const sourceExtension of SOURCE_EXTENSIONS) candidates.push(path + sourceExtension);
  for (const sourceExtension of SOURCE_EXTENSIONS) {
    candidates.push(`${path}/index${sourceExtension}`);
  }
  return candidates;
}

function lookup(moduleIds: ReadonlySet<ModuleId>, rawPath: string): ModuleId | undefined {
  const normalized = normalizeInsideProject(rawPath);
  if (!normalized) return undefined;
  for (const candidate of candidatesFor(normalized)) {
    if (moduleIds.has(candidate)) return candidate;
  }
  return undefined;
}

function lookupAliasTarget(
  target: string,
  config: ProjectConfig,
  moduleIds: ReadonlySet<ModuleId>,
): ModuleId | undefined {
  const direct = lookup(moduleIds, target);
  if (direct) return direct;
  if (!config.baseUrl || config.baseUrl === ".") return undefined;
  return lookup(moduleIds, `${config.baseUrl}/${target}`);
}

/**
 * Resolves an import specifier to a project module id.
 * External packages are dropped. The result matches `AnalyzedModule.path`.
 */
export function resolveImportToModule(
  specifier: string,
  fromModuleId: ModuleId,
  config: ProjectConfig,
  moduleIds: ReadonlySet<ModuleId>,
): ModuleId | undefined {
  const literal = stripQuery(specifier);
  const kind = classifyImportSpecifier(literal, config);

  if (kind === ImportSpecifierResolution.External) return undefined;

  if (kind === ImportSpecifierResolution.Relative) {
    const relative = resolveRelative(fromModuleId, literal);
    return relative ? lookup(moduleIds, relative) : undefined;
  }

  const mappings =
    kind === ImportSpecifierResolution.Package ? config.packageImports : config.aliases;
  for (const target of mappedTargets(literal, mappings)) {
    const resolved =
      kind === ImportSpecifierResolution.Alias
        ? lookupAliasTarget(target, config, moduleIds)
        : lookup(moduleIds, target);
    if (resolved) return resolved;
  }
  return undefined;
}

export function resolveDependencies(
  specifiers: readonly string[],
  fromModuleId: ModuleId,
  config: ProjectConfig,
  moduleIds: ReadonlySet<ModuleId>,
): ModuleId[] {
  const dependencies: ModuleId[] = [];
  const seen = new Set<ModuleId>();
  for (const specifier of specifiers) {
    const resolved = resolveImportToModule(specifier, fromModuleId, config, moduleIds);
    if (!resolved || seen.has(resolved)) continue;
    seen.add(resolved);
    dependencies.push(resolved);
  }
  return dependencies;
}
