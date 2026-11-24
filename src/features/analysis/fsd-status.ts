import type { ModuleDependencyGraph } from "../graph-data/types";

import { buildArchitectureModel } from "./rules/architecture-model";
import type { ArchitectureLayer, FsdStatus } from "./types";

export function detectFsdStatus(
  graph: ModuleDependencyGraph,
  layers: readonly ArchitectureLayer[],
): FsdStatus {
  return { matchedLayers: buildArchitectureModel(graph, layers).layers };
}
