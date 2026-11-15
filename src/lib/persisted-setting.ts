export function parseStringEnum<T extends string>(
  raw: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  if (raw != null && (allowed as readonly string[]).includes(raw)) {
    return raw as T;
  }
  return fallback;
}

// Reads a string from `localStorage` when it is one of `allowed`; otherwise `fallback`.
export function readStringEnum<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  return parseStringEnum(localStorage.getItem(key), allowed, fallback);
}

export function writeStringSetting(key: string, value: string): void {
  localStorage.setItem(key, value);
}