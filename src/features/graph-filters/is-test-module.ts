import { fileNameOf } from "../../lib/path";

export function isTestModule(moduleId: string): boolean {
  const name = fileNameOf(moduleId);
  return name.includes(".test.ts") || name.includes(".test.js");
}
