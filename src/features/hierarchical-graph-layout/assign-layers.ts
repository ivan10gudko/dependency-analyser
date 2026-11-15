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

/**
 * Longest-path layering from a single root within the (already scoped) graph.
 */
export function assignLayersFromRoot(
  graph: ModuleDependencyGraph,
  root: NodeId,
): NodeLayers {
  if (!graph.nodes.has(root)) {
    throw new Error(`unknown layout root ${root}`);
  }

  const nodes = new Set(graph.nodes.keys());
  const predecessors = predecessorsFromAdjacencyList(nodes, graph.adjacencyList);
  const reachable = new Set<NodeId>([root]);
  const queue: NodeId[] = [root];

  while (queue.length > 0) {
    const node = queue.shift()!;
    for (const successor of graph.adjacencyList.get(node) ?? []) {
      if (!reachable.has(successor)) {
        reachable.add(successor);
        queue.push(successor);
      }
    }
  }

  const layers: NodeLayers = new Map();
  layers.set(root, 1);

  let changed = true;
  while (changed) {
    changed = false;

    for (const node of reachable) {
      if (node === root) continue;

      let maxPredLayer = 0;
      for (const pred of predecessors.get(node) ?? []) {
        if (!reachable.has(pred)) continue;
        const predLayer = layers.get(pred);
        if (predLayer === undefined) continue;
        maxPredLayer = Math.max(maxPredLayer, predLayer);
      }

      if (maxPredLayer === 0) continue;

      const nextLayer = maxPredLayer + 1;
      if ((layers.get(node) ?? 0) < nextLayer) {
        layers.set(node, nextLayer);
        changed = true;
      }
    }
  }

  for (const node of reachable) {
    if (!layers.has(node)) {
      layers.set(node, 2);
    }
  }

  return layers;
}