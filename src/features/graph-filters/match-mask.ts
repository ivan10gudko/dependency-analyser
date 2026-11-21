const GLOB_PATTERN = /[*?]/;

export function containsGlob(mask: string): boolean {
  return GLOB_PATTERN.test(mask);
}

export function maskToRegExp(mask: string): RegExp {
  let pattern = "";
  let index = 0;

  while (index < mask.length) {
    const char = mask[index]!;
    if (char === "*") {
      if (mask[index + 1] === "*") {
        if (mask[index + 2] === "/") {
          pattern += "(?:.*/)?";
          index += 3;
          continue;
        }
        pattern += ".*";
        index += 2;
        continue;
      }
      pattern += "[^/]*";
      index += 1;
      continue;
    }
    if (char === "?") {
      pattern += "[^/]";
      index += 1;
      continue;
    }
    pattern += escapeRegExp(char);
    index += 1;
  }

  return new RegExp(`^${pattern}$`);
}

export function pathMatchesMask(mask: string, path: string): boolean {
  return maskToRegExp(mask).test(path);
}

export function searchPaths(
  paths: readonly string[],
  query: string,
  limit = 12,
): string[] {
  const trimmed = query.trim();
  if (!trimmed || limit <= 0) return [];

  if (containsGlob(trimmed)) {
    const pattern = maskToRegExp(trimmed);
    return paths.filter((path) => pattern.test(path)).slice(0, limit);
  }

  const needle = trimmed.toLowerCase();
  return paths.filter((path) => path.toLowerCase().includes(needle)).slice(0, limit);
}

export function normalizeMasks(masks: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const mask of masks) {
    const trimmed = mask.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

export function mergeMasks(existing: readonly string[], added: readonly string[]): string[] {
  return normalizeMasks([...existing, ...added]);
}

function escapeRegExp(char: string): string {
  return /[\\^$.*+?()[\]{}|]/.test(char) ? `\\${char}` : char;
}
