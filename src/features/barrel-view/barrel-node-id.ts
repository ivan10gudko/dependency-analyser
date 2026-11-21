import { directoryOf, fileNameOf } from "../../lib/path";

export const BARREL_NODE_PREFIX = "__barrel__:" as const;

export type BarrelFolderPath = string;

export function toBarrelNodeId(folderPath: BarrelFolderPath): string {
  return `${BARREL_NODE_PREFIX}${folderPath}`;
}

export function isBarrelNodeId(id: string): boolean {
  return id.startsWith(BARREL_NODE_PREFIX);
}

export function barrelFolderFromNodeId(id: string): BarrelFolderPath | null {
  if (!isBarrelNodeId(id)) return null;
  return id.slice(BARREL_NODE_PREFIX.length);
}

// src/ui ->ui
export function folderLabel(folderPath: BarrelFolderPath): string {
  const name = fileNameOf(folderPath);
  return name.length > 0 ? name : folderPath;
}

export function parentDirectoryOfFolder(folderPath: BarrelFolderPath): string {
  return directoryOf(`${folderPath}/_`);
}