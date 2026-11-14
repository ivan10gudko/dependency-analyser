import { inDegrees, predecessorsFromAdjacencyList } from "../../lib/graph";
import type { ModuleDependencyGraph, NodeId } from "../graph-data/types";

export type LayerIndex = number;

export type NodeLayers = Map<NodeId, LayerIndex>;

function allPredecessorsLayered(
  node: NodeId,
  predecessors: ReadonlyMap<NodeId, ReadonlySet<NodeId>>,
  layers: NodeLayers,
): boolean {
  for (const pred of predecessors.get(node) ?? []) {
    if (!layers.has(pred)) return false;
  }
  return true;
}

//Assigns nodes to layers so every edge goes from a lower layer to a higher layer
export function assignLayers(graph: ModuleDependencyGraph): NodeLayers {
  const { adjacencyList } = graph;
  const nodes = new Set(graph.nodes.keys());
  const indegree = inDegrees(nodes, adjacencyList);
  const predecessors = predecessorsFromAdjacencyList(nodes, adjacencyList);
  const layers: NodeLayers = new Map();

  let frontier = new Set<NodeId>();
  for (const node of nodes) {
    if (indegree.get(node) !== 0) continue;
    layers.set(node, 1);
    frontier.add(node);
  }

  // Sources already have layer 1; loop assigns the next layer index
  let layer = 2;

  while (frontier.size > 0) {
    const nextFrontier = new Set<NodeId>();

    for (const node of frontier) {
      for (const successor of adjacencyList.get(node) ?? []) {
        if (layers.has(successor)) continue;
        if (!allPredecessorsLayered(successor, predecessors, layers)) continue;
        nextFrontier.add(successor);
      }
    }

    for (const node of nextFrontier) {
      layers.set(node, layer);
    }

    frontier = nextFrontier;
    layer += 1;
  }

  return layers;
}