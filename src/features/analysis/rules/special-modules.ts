import type { ModuleId } from "../../project/types";
import { isTestModule } from "../../graph-filters";

export function isSpecialModule(moduleId: ModuleId): boolean {
  return isTestModule(moduleId) || moduleId.endsWith(".d.ts");
}
