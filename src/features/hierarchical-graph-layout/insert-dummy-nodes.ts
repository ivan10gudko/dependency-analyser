import { cloneAdjacencyList, neighborSet } from "../../lib/graph";
import type { GraphNode, ModuleDependencyGraph, NodeId } from "../graph-data/types";

import type { NodeLayers } from "./assign-layers";
import {
  DEFAULT_MODULE_NODE_SIZE,
  DUMMY_NODE_PREFIX,
  moduleNodeWidthForLabel,
  type LayoutGraph,
  type LayoutNode,
  type LayoutNodeId,
  type NodeDimensions,
} from "./types";

export interface CreateDummyNodesOptions {
  defaultModuleSize?: NodeDimensions;
}

// Inserts dummy vertices so every edge spans exactly one layer
export function createDummyNodes(
  graph: ModuleDependencyGraph,
  layers: NodeLayers,
  options?: CreateDummyNodesOptions,
): LayoutGraph {
  const moduleSize = options?.defaultModuleSize ?? DEFAULT_MODULE_NODE_SIZE;
  const layoutNodes = new Map<LayoutNodeId, LayoutNode>();
  const adjacencyList = cloneAdjacencyList(graph.adjacencyList);

  for (const moduleNode of graph.nodes.values()) {
    const layer = layers.get(moduleNode.id);
    if (layer === undefined) {
      throw new Error(`missing layer for module ${moduleNode.id}`);
    }
    layoutNodes.set(
      moduleNode.id,
      layoutNodeFromModule(moduleNode, layer, moduleSize),
    );
  }

  let dummyCounter = 0;

  const addDummy = (layer: number): LayoutNodeId => {
    const id = `${DUMMY_NODE_PREFIX}${dummyCounter++}/L${layer}`;
    layoutNodes.set(id, {
      id,
      isDummy: true,
      layer,
      width: 0,
      height: 0,
    });
    return id;
  };

  for (const [source, target] of collectOriginalEdges(graph)) {
    const sourceLayer = layers.get(source);
    const targetLayer = layers.get(target);
    if (sourceLayer === undefined || targetLayer === undefined) {
      throw new Error(`missing layer for edge ${source} → ${target}`);
    }

    let layer = sourceLayer + 1;
    let last: LayoutNodeId = source;

    while (layer !== targetLayer) {
      const dummy = addDummy(layer);
      neighborSet(adjacencyList, last).delete(target);
      neighborSet(adjacencyList, last).add(dummy);
      neighborSet(adjacencyList, dummy).add(target);
      last = dummy;
      layer += 1;
    }
  }

  return { nodes: layoutNodes, adjacencyList };
}

function layoutNodeFromModule(
  module: GraphNode,
  layer: number,
  size: NodeDimensions,
): LayoutNode {
  return {
    id: module.id,
    isDummy: false,
    module,
    layer,
    width: moduleNodeWidthForLabel(module.name, size.width),
    height: size.height,
  };
}

function collectOriginalEdges(
  graph: ModuleDependencyGraph,
): Array<[NodeId, NodeId]> {
  const edges: Array<[NodeId, NodeId]> = [];
  for (const [source, targets] of graph.adjacencyList) {
    for (const target of targets) {
      edges.push([source, target]);
    }
  }
  return edges;
}
