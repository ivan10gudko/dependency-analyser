import type { ModuleId, NormalizePathOptions, ProjectFile } from "./types";

function toPosix(path: string): string {
  return path.replace(/\\/g, "/");
}

function splitSegments(path: string): string[] {
  const posix = toPosix(path);
  return posix.split("/").filter((segment) => segment.length > 0);
}

function normalizeSegments(segments: string[]): string[] {
  const normalized: string[] = [];

  for (const segment of segments) {
    if (segment === ".") {
      continue;
    }
    if (segment === "..") {
      if (normalized.length === 0) {
        throw new Error("path is outside the selected project");
      }
      normalized.pop();
      continue;
    }
    normalized.push(segment);
  }

  return normalized;
}

function segmentsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((segment, index) => segment === b[index]);
}

/**
 * Converts an absolute or project-relative path into a normalized ModuleId.
 */
export function normalizeModuleId(
  absoluteOrRelativePath: string,
  options: NormalizePathOptions,
): ModuleId {
  const rootSegments = normalizeSegments(
    splitSegments(options.projectRootAbsolute),
  );
  const inputPosix = toPosix(absoluteOrRelativePath);

  let fileSegments: string[];
  const isAbsolute =
    inputPosix.startsWith("/") || /^[A-Za-z]:\//.test(inputPosix);

  if (isAbsolute) {
    fileSegments = normalizeSegments(splitSegments(inputPosix));
  } else {
    fileSegments = normalizeSegments([
      ...rootSegments,
      ...splitSegments(inputPosix),
    ]);
  }

  if (fileSegments.length < rootSegments.length) {
    throw new Error("path is outside the selected project");
  }

  const prefix = fileSegments.slice(0, rootSegments.length);
  if (!segmentsEqual(prefix, rootSegments)) {
    throw new Error("path is outside the selected project");
  }

  const relative = fileSegments.slice(rootSegments.length);
  if (relative.length === 0) {
    throw new Error("path must refer to a file inside the project");
  }

  return relative.join("/");
}

export function moduleBaseName(path: ModuleId): string {
  const segments = splitSegments(path);
  const last = segments[segments.length - 1];
  if (!last) {
    throw new Error("invalid module path");
  }
  return last;
}

export function toProjectFile(
  filePathAbsolute: string,
  content: string,
  projectRootAbsolute: string,
): ProjectFile {
  return {
    path: normalizeModuleId(filePathAbsolute, { projectRootAbsolute }),
    content,
  };
}
