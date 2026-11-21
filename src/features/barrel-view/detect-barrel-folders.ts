import { directoryOf, fileNameOf } from "../../lib/path";
import { predecessorsFromAdjacencyList } from "../../lib/graph";
import type { ModuleId } from "../project/types";
import type { ModuleDependencyGraph, NodeId } from "../graph-data/types";

import { BARREL_INDEX_NAMES } from "./types";
import type { BarrelDeepImport, BarrelFolderInfo } from "./types";

export function detectBarrelFolders(
  graph: ModuleDependencyGraph,
): ReadonlyMap<string, BarrelFolderInfo> {
  const byDirectory = new Map<string, NodeId[]>();

  for (const id of graph.nodes.keys()) {
    const dir = directoryOf(id);
    const list = byDirectory.get(dir) ?? [];
    list.push(id);
    byDirectory.set(dir, list);
  }

  const nodeIds = [...graph.nodes.keys()];
  const predecessors = predecessorsFromAdjacencyList(nodeIds, graph.adjacencyList);
  const folders = new Map<string, BarrelFolderInfo>();

  for (const [directory, modules] of byDirectory) {
    const indexModuleId = findBarrelIndex(modules);
    if (indexModuleId === undefined) continue;

    const hiddenModules = new Set<ModuleId>();
    const exposedModules = new Set<ModuleId>();
    const deepImports: BarrelDeepImport[] = [];

    hiddenModules.add(indexModuleId);

    for (const moduleId of modules) {
      if (moduleId === indexModuleId) continue;

      const externalImporters = externalImportersOf(moduleId, directory, predecessors);
      if (externalImporters.length === 0) {
        hiddenModules.add(moduleId);
      } else {
        exposedModules.add(moduleId);
        for (const importer of externalImporters) {
          deepImports.push({ importer, target: moduleId });
        }
      }
    }

    deepImports.sort((left, right) => {
      const byImporter = left.importer.localeCompare(right.importer);
      if (byImporter !== 0) return byImporter;
      return left.target.localeCompare(right.target);
    });

    folders.set(directory, {
      directory,
      indexModuleId,
      hiddenModules,
      exposedModules,
      deepImports,
    });
  }

  return folders;
}

function findBarrelIndex(modules: readonly NodeId[]): NodeId | undefined {
  for (const name of BARREL_INDEX_NAMES) {
    const match = modules.find((id) => fileNameOf(id) === name);
    if (match !== undefined) return match;
  }
  return undefined;
}

function externalImportersOf(
  moduleId: NodeId,
  folderDirectory: string,
  predecessors: ReadonlyMap<NodeId, ReadonlySet<NodeId>>,
): NodeId[] {
  const preds = predecessors.get(moduleId);
  if (!preds) return [];

  const external: NodeId[] = [];
  for (const importer of preds) {
    if (directoryOf(importer) !== folderDirectory) {
      external.push(importer);
    }
  }
  external.sort((left, right) => left.localeCompare(right));
  return external;
}