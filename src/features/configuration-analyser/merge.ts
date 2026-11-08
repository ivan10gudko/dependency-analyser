import type { ParsedConfig } from "./types";

export function emptyParsedConfig(): ParsedConfig {
  return {
    aliases: [],
    packageImports: [],
    externalPackages: [],
  };
}

export function upsertByPattern<T extends { pattern: string }>(
  current: readonly T[],
  incoming: readonly T[],
): T[] {
  const byPattern = new Map(current.map((item) => [item.pattern, item]));
  for (const item of incoming) {
    byPattern.set(item.pattern, item);
  }
  return [...byPattern.values()];
}

export function unionNames(
  current: readonly string[],
  incoming: readonly string[],
): string[] {
  const seen = new Set(current);
  const names = [...current];
  for (const name of incoming) {
    if (seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }
  return names;
}

// Later config overrides alias targets, package-import targets, and baseUrl.
export function overlayParsed(base: ParsedConfig, overlay: ParsedConfig): ParsedConfig {
  return {
    aliases: upsertByPattern(base.aliases, overlay.aliases),
    packageImports: upsertByPattern(base.packageImports, overlay.packageImports),
    externalPackages: unionNames(base.externalPackages, overlay.externalPackages),
    baseUrl: overlay.baseUrl ?? base.baseUrl,
  };
}
