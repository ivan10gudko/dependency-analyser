import { neighborSet } from "../../lib/graph";
import { directoryOf } from "../../lib/path";
import type { GraphNode, ModuleDependencyGraph, NodeId } from "../graph-data/types";

import {
  barrelFolderFromNodeId,
  folderLabel,
  isBarrelNodeId,
  parentDirectoryOfFolder,
  toBarrelNodeId,
} from "./barrel-node-id";
import { detectBarrelFolders } from "./detect-barrel-folders";
import type { BarrelDisplayOptions, BarrelFolderInfo } from "./types";

export function buildProxyToBarrelMap(
  graph: ModuleDependencyGraph,
  options: BarrelDisplayOptions,
): Map<NodeId, BarrelFolderInfo> | null {
  if (!options.barrelViewEnabled) return null;

  const barrels = detectBarrelFolders(graph);
  if (barrels.size === 0) return null;

  const proxyToBarrel = new Map<NodeId, BarrelFolderInfo>();

  for (const folder of barrels.values()) {
    const collapsed = !options.expandedDirectories.has(folder.directory);
    proxyToBarrel.set(folder.indexModuleId, folder);

    if (collapsed) {
      for (const moduleId of folder.hiddenModules) {
        if (moduleId === folder.indexModuleId) continue;
        proxyToBarrel.set(moduleId, folder);
      }
    }
  }

  return proxyToBarrel;
}

export function mapModuleIdToDisplay(
  moduleId: ModuleId,
  graph: ModuleDependencyGraph,
  options: BarrelDisplayOptions,
  proxyToBarrel?: Map<NodeId, BarrelFolderInfo> | null,
): ModuleId {
  const proxy = proxyToBarrel ?? buildProxyToBarrelMap(graph, options);
  if (!proxy) return moduleId;
  const folder = proxy.get(moduleId);
  if (folder) return toBarrelNodeId(folder.directory);
  return moduleId;
}

export function buildBarrelDisplayGraph(
  graph: ModuleDependencyGraph,
  options: BarrelDisplayOptions,
): ModuleDependencyGraph {
  if (!options.barrelViewEnabled) return graph;

  const barrels = detectBarrelFolders(graph);
  if (barrels.size === 0) return graph;

  const proxyToBarrel = buildProxyToBarrelMap(graph, options);
  if (!proxyToBarrel) return graph;

  const nodes = new Map<NodeId, GraphNode>();
  const adjacencyList = new Map<NodeId, Set<NodeId>>();

  for (const folder of barrels.values()) {
    nodes.set(toBarrelNodeId(folder.directory), barrelGraphNode(folder));
  }

  for (const [id, node] of graph.nodes) {
    if (proxyToBarrel.has(id)) continue;
    nodes.set(id, node);
  }

  const mapEndpoint = (id: NodeId): NodeId => {
    const folder = proxyToBarrel.get(id);
    if (folder) return toBarrelNodeId(folder.directory);
    return id;
  };

  for (const [from, targets] of graph.adjacencyList) {
    const mappedFrom = mapEndpoint(from);
    if (!nodes.has(mappedFrom)) continue;

    for (const to of targets) {
      const mappedTo = mapEndpoint(to);
      if (mappedFrom === mappedTo) continue;
      if (!nodes.has(mappedTo)) continue;
      if (isInternalProxiedEdge(from, to, proxyToBarrel)) continue;

      neighborSet(adjacencyList, mappedFrom).add(mappedTo);
    }
  }

  for (const id of nodes.keys()) {
    if (!adjacencyList.has(id)) {
      adjacencyList.set(id, new Set());
    }
  }

  return { nodes, adjacencyList };
}

function barrelGraphNode(folder: BarrelFolderInfo): GraphNode {
  const id = toBarrelNodeId(folder.directory);
  return {
    id,
    name: folderLabel(folder.directory),
    directory: parentDirectoryOfFolder(folder.directory),
  };
}

// Both endpoints are index/internal proxies in the same folder (duplicate barrel hops).
function isInternalProxiedEdge(
  from: NodeId,
  to: NodeId,
  proxyToBarrel: ReadonlyMap<NodeId, BarrelFolderInfo>,
): boolean {
  const fromFolder = proxyToBarrel.get(from);
  const toFolder = proxyToBarrel.get(to);
  if (fromFolder && toFolder && fromFolder.directory === toFolder.directory) {
    return true;
  }
  return false;
}

export function isInternalOnlyModule(
  moduleId: ModuleId,
  folder: BarrelFolderInfo,
): boolean {
  return (
    folder.hiddenModules.has(moduleId) && moduleId !== folder.indexModuleId
  );
}

type ModuleId = NodeId;

export function isModuleHiddenInBarrelView(
  moduleId: ModuleId,
  graph: ModuleDependencyGraph,
  options: BarrelDisplayOptions,
): boolean {
  if (!options.barrelViewEnabled) return false;
  const barrels = detectBarrelFolders(graph);
  const dir = directoryOf(moduleId);
  const folder = barrels.get(dir);
  if (!folder) return false;
  if (options.expandedDirectories.has(dir)) return false;
  return isInternalOnlyModule(moduleId, folder);
}

export function resolveDisplayFocusModuleId(
  focusedModuleId: ModuleId,
  graph: ModuleDependencyGraph,
  options: BarrelDisplayOptions,
): ModuleId {
  if (!options.barrelViewEnabled) return focusedModuleId;

  const barrels = detectBarrelFolders(graph);
  const dir = directoryOf(focusedModuleId);
  const folder = barrels.get(dir);
  if (!folder) return focusedModuleId;

  if (focusedModuleId === folder.indexModuleId) {
    return toBarrelNodeId(folder.directory);
  }

  if (
    !options.expandedDirectories.has(dir) &&
    isInternalOnlyModule(focusedModuleId, folder)
  ) {
    return toBarrelNodeId(folder.directory);
  }

  return focusedModuleId;
}

export function directoryForBarrelInteraction(nodeId: NodeId): string | null {
  if (isBarrelNodeId(nodeId)) return barrelFolderFromNodeId(nodeId);
  const dir = directoryOf(nodeId);
  return dir.length > 0 ? dir : null;
}

export function isBarrelFolderExpanded(
  directory: string,
  options: BarrelDisplayOptions,
): boolean {
  return options.expandedDirectories.has(directory);
}