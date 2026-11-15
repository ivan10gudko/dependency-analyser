import type { ModuleId } from "./types";

export interface ModuleFileStats {
  extension: string;
  sizeBytes: number;
  lineCount: number;
}

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

export function buildModuleFileStatsFromContent(
  moduleId: ModuleId,
  content: string,
): ModuleFileStats {
  const extension = extensionOf(moduleId);
  const encoder = new TextEncoder();
  const sizeBytes = encoder.encode(content).byteLength;
  const lineCount = countLines(content);

  return { extension, sizeBytes, lineCount };
}

export function buildModuleFileStatsMap(
  files: readonly { path: ModuleId; content: string }[],
): ReadonlyMap<ModuleId, ModuleFileStats> {
  const map = new Map<ModuleId, ModuleFileStats>();
  for (const file of files) {
    map.set(file.path, buildModuleFileStatsFromContent(file.path, file.content));
  }
  return map;
}

function extensionOf(moduleId: string): string {
  const dot = moduleId.lastIndexOf(".");
  if (dot === -1) return "";
  const ext = moduleId.slice(dot).toLowerCase();
  return SOURCE_EXTENSIONS.has(ext) ? ext : ext;
}

function countLines(content: string): number {
  if (content.length === 0) return 0;
  let lines = 1;
  for (let index = 0; index < content.length; index += 1) {
    if (content[index] === "\n") lines += 1;
  }
  return lines;
}