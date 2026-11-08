import { normalizeModuleId } from "../../lib/path";

import type { ProjectFile } from "./types";

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
