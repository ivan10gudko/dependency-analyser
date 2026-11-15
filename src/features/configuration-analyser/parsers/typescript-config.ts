import ts from "typescript";

import {
  directoryOf,
  fileNameOf,
  normalizePosixPath,
  resolveRelativePath,
  toPosix,
  toProjectRelative,
} from "../../../lib/path";
import { isRecord } from "../../../lib/utils";

import { emptyParsedConfig, overlayParsed } from "../merge";
import type { AliasMapping, ParseContext, ParsedConfig } from "../types";

export async function parseTypeScriptConfig(
  filePath: string,
  context: ParseContext,
): Promise<ParsedConfig> {
  const parsed = await readTypeScriptConfig(
    filePath,
    context,
    new Set(),
    directoryOf(filePath),
  );
  if (!parsed) {
    throw new Error(`cannot parse ${filePath}`);
  }
  return parsed;
}

async function readTypeScriptConfig(
  filePath: string,
  context: ParseContext,
  seen: Set<string>,
  projectDirectory: string,
): Promise<ParsedConfig | null> {
  const normalized = normalizePosixPath(toPosix(filePath));
  if (seen.has(normalized)) return null;
  seen.add(normalized);

  let text: string;
  try {
    text = await context.readText(filePath);
  } catch {
    return null;
  }

  const parsed = ts.parseConfigFileTextToJson(fileNameOf(filePath), text);
  if (parsed.error || parsed.config == null || !isRecord(parsed.config)) return null;

  const parents = await readExtends(
    parsed.config.extends,
    filePath,
    context,
    seen,
    projectDirectory,
  );
  return overlayParsed(parents, extractOwnConfig(parsed.config, filePath, projectDirectory));
}

async function readExtends(
  extendsValue: unknown,
  fromFile: string,
  context: ParseContext,
  seen: Set<string>,
  projectDirectory: string,
): Promise<ParsedConfig> {
  let merged = emptyParsedConfig();
  for (const specifier of relativeExtendSpecs(extendsValue)) {
    const parentPath = resolveRelativePath(fromFile, ensureJsonExtension(specifier));
    const parent = await readTypeScriptConfig(parentPath, context, seen, projectDirectory);
    if (parent) merged = overlayParsed(merged, parent);
  }
  return merged;
}

function extractOwnConfig(
  config: Record<string, unknown>,
  filePath: string,
  projectDirectory: string,
): ParsedConfig {
  const compilerOptions = isRecord(config.compilerOptions) ? config.compilerOptions : {};
  const parsed = emptyParsedConfig();
  if (typeof compilerOptions.baseUrl === "string") {
    parsed.baseUrl = toProjectRelative(filePath, compilerOptions.baseUrl, projectDirectory);
  }
  parsed.aliases = aliasesFromPaths(compilerOptions.paths);
  return parsed;
}

function aliasesFromPaths(paths: unknown): AliasMapping[] {
  if (!isRecord(paths)) return [];

  const aliases: AliasMapping[] = [];
  for (const [pattern, value] of Object.entries(paths)) {
    if (!Array.isArray(value)) continue;
    const targets = value.filter((item): item is string => typeof item === "string");
    if (targets.length === 0) continue;
    aliases.push({ pattern, targets });
  }
  return aliases;
}

function relativeExtendSpecs(value: unknown): string[] {
  const entries = typeof value === "string" ? [value] : Array.isArray(value) ? value : [];
  return entries.filter(
    (entry): entry is string =>
      typeof entry === "string" && (entry.startsWith("./") || entry.startsWith("../")),
  );
}

function ensureJsonExtension(specifier: string): string {
  return specifier.endsWith(".json") ? specifier : `${specifier}.json`;
}
