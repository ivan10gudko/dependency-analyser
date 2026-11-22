import type { ModuleDependencyGraph } from "../../graph-data/types";
import type { ModuleId } from "../../project/types";

export interface ArchitecturePlacement {
  layer: string;
  rank: number;
  slice: string | null;
}

export interface ArchitectureModel {
  placements: ReadonlyMap<ModuleId, ArchitecturePlacement>;
  layers: readonly string[];
}

export type ArchitectureViolation =
  | {
      kind: "layer";
      from: ModuleId;
      to: ModuleId;
      importer: ArchitecturePlacement;
      target: ArchitecturePlacement;
    }
  | {
      kind: "cross-slice";
      from: ModuleId;
      to: ModuleId;
      importer: ArchitecturePlacement;
      target: ArchitecturePlacement;
    };

export function findArchitectureViolations(
  graph: ModuleDependencyGraph,
  model: ArchitectureModel,
): ArchitectureViolation[] {
  const violations: ArchitectureViolation[] = [];

  const sources = [...graph.adjacencyList.keys()].sort((left, right) =>
    left.localeCompare(right),
  );
  for (const from of sources) {
    const importer = model.placements.get(from);
    if (!importer) continue;
    const targets = [...(graph.adjacencyList.get(from) ?? [])].sort((left, right) =>
      left.localeCompare(right),
    );
    for (const to of targets) {
      if (from === to) continue;
      const target = model.placements.get(to);
      if (!target) continue;
      if (importer.layer === target.layer) {
        if (importer.slice && target.slice && importer.slice !== target.slice) {
          violations.push({ kind: "cross-slice", from, to, importer, target });
        }
        continue;
      }
      if (importer.rank < target.rank) {
        violations.push({ kind: "layer", from, to, importer, target });
      }
    }
  }

  return violations;
}
