import { buildFsdModel } from "./rules/fsd-preset";
import type { ModuleDependencyGraph } from "../graph-data/types";

import type { FsdStatus } from "./types";

export function detectFsdStatus(graph: ModuleDependencyGraph): FsdStatus {
  const model = buildFsdModel(graph);
  if (!model) return { active: false, layers: [] };
  return { active: true, layers: model.layers };
}
