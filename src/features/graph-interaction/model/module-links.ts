import { fileNameOf } from "../../../lib/path";
import {
  neighborsFromAdjacencyList,
  predecessorsFromAdjacencyList,
} from "../../../lib/graph";
import type { ModuleDependencyGraph } from "../../graph-data/types";
import type { ModuleId } from "../../project/types";

import type { ModuleLinkItem } from "../types";

export interface ModuleLinkLists {
  dependencies: readonly ModuleLinkItem[];
  dependents: readonly ModuleLinkItem[];
}

// Dependency and dependent module ids for one node (same adjacency semantics as `lib/graph`)
export function linkListsForModule(
  graph: ModuleDependencyGraph,
  moduleId: ModuleId,
): ModuleLinkLists {
  const outgoing = neighborsFromAdjacencyList(graph.adjacencyList);
  const predecessors = predecessorsFromAdjacencyList(
    graph.nodes.keys(),
    graph.adjacencyList,
  );

  return {
    dependencies: toSortedLinkItems(graph, outgoing(moduleId)),
    dependents: toSortedLinkItems(graph, predecessors.get(moduleId) ?? []),
  };
}

export function getDependencies(
  graph: ModuleDependencyGraph,
  moduleId: ModuleId,
): readonly ModuleLinkItem[] {
  const outgoing = neighborsFromAdjacencyList(graph.adjacencyList);
  return toSortedLinkItems(graph, outgoing(moduleId));
}

export function getDependents(
  graph: ModuleDependencyGraph,
  moduleId: ModuleId,
): readonly ModuleLinkItem[] {
  const predecessors = predecessorsFromAdjacencyList(
    graph.nodes.keys(),
    graph.adjacencyList,
  );
  return toSortedLinkItems(graph, predecessors.get(moduleId) ?? []);
}

function toSortedLinkItems(
  graph: ModuleDependencyGraph,
  ids: Iterable<ModuleId>,
): readonly ModuleLinkItem[] {
  return [...ids]
    .sort((a, b) => a.localeCompare(b))
    .map((id) => linkItemOf(graph, id));
}

function linkItemOf(graph: ModuleDependencyGraph, id: ModuleId): ModuleLinkItem {
  const node = graph.nodes.get(id);
  return {
    id,
    name: node?.name ?? fileNameOf(id),
  };
}