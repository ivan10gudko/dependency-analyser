import type { AliasMapping, ProjectConfig } from "./types";

export enum ImportSpecifierResolution {
  Relative = "relative",
  Alias = "alias",
  External = "external",
  Package = "package",
}

export function classifyImportSpecifier(
  specifier: string,
  config: ProjectConfig,
): ImportSpecifierResolution {
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    return ImportSpecifierResolution.Relative;
  }
  if (specifier.startsWith("#")) {
    return ImportSpecifierResolution.Package;
  }
  if (matchingAlias(specifier, config.aliases)) {
    return ImportSpecifierResolution.Alias;
  }
  return ImportSpecifierResolution.External;
}

export function mappedTargets(
  specifier: string,
  mappings: readonly AliasMapping[],
): string[] {
  const mapping = matchingAlias(specifier, mappings);
  if (!mapping) return [];

  return mapping.targets.flatMap((target) => {
    const expanded = expandPattern(mapping.pattern, target, specifier);
    return expanded === undefined ? [] : [expanded];
  });
}

function matchingAlias(specifier: string, aliases: readonly AliasMapping[]): AliasMapping | undefined {
  let best: AliasMapping | undefined;
  let bestScore = -1;

  for (const alias of aliases) {
    const match = matchPattern(alias.pattern, specifier);
    if (!match || match.score <= bestScore) continue;
    best = alias;
    bestScore = match.score;
  }

  return best;
}

export function expandPattern(
  pattern: string,
  target: string,
  specifier: string,
): string | undefined {
  const match = matchPattern(pattern, specifier);
  if (!match) return undefined;
  if (match.captured === undefined) return target;

  const star = target.indexOf("*");
  if (star === -1) return target;
  return target.slice(0, star) + match.captured + target.slice(star + 1);
}

function matchPattern(
  pattern: string,
  specifier: string,
): { score: number; captured?: string } | undefined {
  const star = pattern.indexOf("*");
  if (star === -1) {
    return specifier === pattern ? { score: pattern.length } : undefined;
  }

  const prefix = pattern.slice(0, star);
  const suffix = pattern.slice(star + 1);
  if (
    !specifier.startsWith(prefix) ||
    !specifier.endsWith(suffix) ||
    specifier.length < prefix.length + suffix.length
  ) {
    return undefined;
  }

  return {
    score: prefix.length,
    captured: specifier.slice(prefix.length, specifier.length - suffix.length),
  };
}
