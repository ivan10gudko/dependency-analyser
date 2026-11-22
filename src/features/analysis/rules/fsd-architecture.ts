import type { ModuleId } from "../../project/types";

import { findArchitectureViolations } from "./architecture-model";
import { buildFsdModel } from "./fsd-preset";
import type { Analyzer } from "../types";

export const fsdLayerAnalyzer: Analyzer = {
  id: "fsd-layer",
  run({ graph }) {
    const model = buildFsdModel(graph);
    if (!model) return [];

    return findArchitectureViolations(graph, model)
      .filter((violation) => violation.kind === "layer")
      .map((violation) => ({
        id: `fsd-layer:${violation.from}->${violation.to}`,
        ruleId: "fsd-layer" as const,
        severity: "error" as const,
        category: "architecture" as const,
        message:
          `Layer violation: ${violation.from} (${violation.importer.layer}) ` +
          `imports ${violation.to} (${violation.target.layer})`,
        moduleIds: [violation.from, violation.to],
        edges: [{ from: violation.from, to: violation.to }],
        primaryModuleId: violation.from,
      }));
  },
};

export const fsdCrossSliceAnalyzer: Analyzer = {
  id: "fsd-cross-slice",
  run({ graph }) {
    const model = buildFsdModel(graph);
    if (!model) return [];

    return findArchitectureViolations(graph, model)
      .filter((violation) => violation.kind === "cross-slice")
      .map((violation) => ({
        id: `fsd-cross-slice:${violation.from}->${violation.to}`,
        ruleId: "fsd-cross-slice" as const,
        severity: "warning" as const,
        category: "architecture" as const,
        message:
          `Cross-slice: ${violation.from} (${violation.importer.layer}/${violation.importer.slice}) ` +
          `imports ${violation.to} (${violation.target.layer}/${violation.target.slice})`,
        moduleIds: modulePair(violation.from, violation.to),
        edges: [{ from: violation.from, to: violation.to }],
        primaryModuleId: violation.from,
      }));
  },
};

function modulePair(from: ModuleId, to: ModuleId): ModuleId[] {
  return from === to ? [from] : [from, to];
}
