export function toPosix(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

export function isAbsolutePath(filePath: string): boolean {
  const posix = toPosix(filePath);
  return posix.startsWith("/") || /^[A-Za-z]:\//.test(posix);
}

export function splitSegments(filePath: string): string[] {
  return toPosix(filePath)
    .split("/")
    .filter((segment) => segment.length > 0);
}

export function joinPath(root: string, name: string): string {
  const base = toPosix(root).replace(/\/+$/, "");
  return `${base}/${name}`;
}

export function fileNameOf(filePath: string): string {
  const posix = toPosix(filePath);
  const slash = posix.lastIndexOf("/");
  return slash === -1 ? posix : posix.slice(slash + 1);
}

export function directoryOf(filePath: string): string {
  const posix = toPosix(filePath);
  const slash = posix.lastIndexOf("/");
  if (slash < 0) return "";
  if (slash === 0) return "/";
  return posix.slice(0, slash);
}

export function normalizePosixPath(filePath: string): string {
  const posix = toPosix(filePath);
  const absolute = posix.startsWith("/");
  const segments: string[] = [];

  for (const segment of posix.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }

  const joined = segments.join("/");
  return absolute ? `/${joined}` : joined;
}

/** Resolves `./` and `../` against the directory of `fromFile`. */
export function resolveRelativePath(fromFile: string, relative: string): string {
  const directory = directoryOf(fromFile);
  const combined = directory === "/" ? `/${relative}` : `${directory}/${relative}`;
  return normalizePosixPath(combined);
}

/** Expresses `relative` (from `fromFile`) as a path under `projectDirectory`. */
export function toProjectRelative(
  fromFile: string,
  relative: string,
  projectDirectory: string,
): string {
  const absolute = resolveRelativePath(fromFile, relative);
  const project = normalizePosixPath(toPosix(projectDirectory));
  if (absolute === project) return ".";
  const prefix = project === "/" ? "/" : `${project}/`;
  if (absolute.startsWith(prefix)) {
    const rest = absolute.slice(prefix.length);
    return rest === "" ? "." : rest;
  }
  return absolute;
}

export interface NormalizeModuleIdOptions {
  projectRootAbsolute: string;
}

function normalizeSegments(segments: string[]): string[] {
  const normalized: string[] = [];

  for (const segment of segments) {
    if (segment === ".") continue;
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

function segmentsEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((segment, index) => segment === right[index]);
}

/**
 * Converts an absolute or project-relative path into a normalized module id.
 */
export function normalizeModuleId(
  absoluteOrRelativePath: string,
  options: NormalizeModuleIdOptions,
): string {
  const rootSegments = normalizeSegments(splitSegments(options.projectRootAbsolute));
  const inputPosix = toPosix(absoluteOrRelativePath);

  const fileSegments = isAbsolutePath(inputPosix)
    ? normalizeSegments(splitSegments(inputPosix))
    : normalizeSegments([...rootSegments, ...splitSegments(inputPosix)]);

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
