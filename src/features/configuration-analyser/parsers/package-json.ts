import { isRecord } from "../../../lib/utils";

import { emptyParsedConfig } from "../merge";
import type {
  ConfigParser,
  PackageImportMapping,
  ParseContext,
  ParsedConfig,
} from "../types";

const DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
] as const;

const IMPORT_CONDITIONS = ["default", "import", "require", "browser", "node"] as const;

export class PackageJsonParser implements ConfigParser {
  readonly fileNames = ["package.json"];

  canParse(fileName: string): boolean {
    return fileName === "package.json";
  }

  async parse(filePath: string, context: ParseContext): Promise<ParsedConfig> {
    const text = await context.readText(filePath);
    const manifest: unknown = JSON.parse(text);
    if (!isRecord(manifest)) {
      throw new Error(`cannot parse ${filePath}`);
    }

    const parsed = emptyParsedConfig();
    parsed.packageImports = packageImportsOf(manifest.imports);
    parsed.externalPackages = externalPackagesOf(manifest);
    return parsed;
  }
}

function packageImportsOf(importsField: unknown): PackageImportMapping[] {
  if (!isRecord(importsField)) return [];

  const mappings: PackageImportMapping[] = [];
  for (const [pattern, value] of Object.entries(importsField)) {
    const targets = importTargets(value);
    if (targets.length === 0) continue;
    mappings.push({ pattern, targets });
  }
  return mappings;
}

function importTargets(value: unknown): string[] {
  if (typeof value === "string" || Array.isArray(value)) return literalTargets(value);
  if (!isRecord(value)) return [];

  const targets: string[] = [];
  for (const condition of IMPORT_CONDITIONS) {
    targets.push(...literalTargets(value[condition]));
  }
  return targets;
}

function literalTargets(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return [];
}

function externalPackagesOf(manifest: Record<string, unknown>): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const field of DEPENDENCY_FIELDS) {
    const section = manifest[field];
    if (!isRecord(section)) continue;
    for (const name of Object.keys(section)) {
      if (seen.has(name)) continue;
      seen.add(name);
      names.push(name);
    }
  }
  return names;
}
