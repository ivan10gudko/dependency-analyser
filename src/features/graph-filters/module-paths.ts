import { directoryOf } from "../../lib/path";

export function collectDirectories(moduleIds: readonly string[]): string[] {
  const directories = new Set<string>();
  for (const moduleId of moduleIds) {
    for (const directory of ancestorDirectories(directoryOf(moduleId))) {
      directories.add(directory);
    }
  }
  return [...directories].sort((left, right) => left.localeCompare(right));
}

export function ancestorDirectories(directory: string): string[] {
  if (!directory || directory === "/") return [];

  const directories: string[] = [];
  let current = "";
  for (const segment of directory.split("/")) {
    if (!segment) continue;
    current = current ? `${current}/${segment}` : segment;
    directories.push(current);
  }
  return directories;
}
