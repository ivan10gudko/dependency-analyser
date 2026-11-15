import { predecessorsFromAdjacencyList } from "../../lib/graph";

import { maxLayerIndex, type LayerOrder } from "./layer-order";
import type { LayerIndex, LayoutGraph, LayoutNodeId } from "./types";
import { DEFAULT_HORIZONTAL_NODE_OFFSET } from "./types";

export interface DagSweepOptions {
  horizontalNodeOffset?: number;
  initializeLayer1?: boolean;
}

export interface AssignDagXOptions {
  horizontalNodeOffset?: number;
  iterations?: number;
}

function median(values: number[]): number {
  if (values.length === 0) {
    throw new Error("median of an empty list");
  }

  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[mid]!;
  }

  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function predecessorsOnLayer(
  graph: LayoutGraph,
  predecessors: ReadonlyMap<LayoutNodeId, ReadonlySet<LayoutNodeId>>,
  node: LayoutNodeId,
  layer: LayerIndex,
): LayoutNodeId[] {
  const expected = layer - 1;
  const matched: LayoutNodeId[] = [];

  for (const pred of predecessors.get(node) ?? []) {
    if (graph.nodes.get(pred)?.layer === expected) matched.push(pred);
  }

  return matched;
}

function predecessorCount(
  graph: LayoutGraph,
  predecessors: ReadonlyMap<LayoutNodeId, ReadonlySet<LayoutNodeId>>,
  node: LayoutNodeId,
  layer: LayerIndex,
): number {
  return predecessorsOnLayer(graph, predecessors, node, layer).length;
}

function successorsOnNextLayer(
  graph: LayoutGraph,
  node: LayoutNodeId,
  layer: LayerIndex,
): LayoutNodeId[] {
  const nextLayer = layer + 1;
  const matched: LayoutNodeId[] = [];

  for (const succ of graph.adjacencyList.get(node) ?? []) {
    if (graph.nodes.get(succ)?.layer === nextLayer) matched.push(succ);
  }

  return matched;
}

function successorCount(
  graph: LayoutGraph,
  node: LayoutNodeId,
  layer: LayerIndex,
): number {
  return successorsOnNextLayer(graph, node, layer).length;
}

function successorXPositions(graph: LayoutGraph, succs: LayoutNodeId[]): number[] {
  return succs.map((succ) => {
    const x = graph.nodes.get(succ)?.x;
    if (x === undefined) {
      throw new Error(`successor ${succ} has no x coordinate`);
    }
    return x;
  });
}

function predecessorXPositions(
  graph: LayoutGraph,
  preds: LayoutNodeId[],
): number[] {
  return preds.map((pred) => {
    const x = graph.nodes.get(pred)?.x;
    if (x === undefined) {
      throw new Error(`predecessor ${pred} has no x coordinate`);
    }
    return x;
  });
}

function nearestPositionedNeighbors(
  graph: LayoutGraph,
  layerOrder: LayerOrder,
  layer: LayerIndex,
  nodeId: LayoutNodeId,
): { left?: LayoutNodeId; right?: LayoutNodeId; nodeIndex: number } {
  const layerNodes = layerOrder.get(layer);
  if (!layerNodes) {
    throw new Error(`missing layer ${layer}`);
  }

  const nodeIndex = layerNodes.indexOf(nodeId);
  if (nodeIndex < 0) {
    throw new Error(`node ${nodeId} is missing from layer order`);
  }

  let left: LayoutNodeId | undefined;
  for (let index = nodeIndex - 1; index >= 0; index -= 1) {
    const candidate = layerNodes[index]!;
    if (graph.nodes.get(candidate)?.x !== undefined) {
      left = candidate;
      break;
    }
  }

  let right: LayoutNodeId | undefined;
  for (let index = nodeIndex + 1; index < layerNodes.length; index += 1) {
    const candidate = layerNodes[index]!;
    if (graph.nodes.get(candidate)?.x !== undefined) {
      right = candidate;
      break;
    }
  }

  return { left, right, nodeIndex };
}

export function addNode(
  graph: LayoutGraph,
  layerOrder: LayerOrder,
  layer: LayerIndex,
  nodeId: LayoutNodeId,
  optimalX: number,
  horizontalGap: number,
): void {
  const node = graph.nodes.get(nodeId);
  if (!node) throw new Error(`unknown node ${nodeId}`);

  const layerNodes = layerOrder.get(layer)!;
  const { left, right, nodeIndex } = nearestPositionedNeighbors(
    graph,
    layerOrder,
    layer,
    nodeId,
  );

  let minX = 0;
  if (left !== undefined) {
    const leftNode = graph.nodes.get(left)!;
    const leftIndex = layerNodes.indexOf(left);
    minX =
      (leftNode.x ?? 0) + leftNode.width + horizontalGap;
    for (let index = leftIndex + 1; index < nodeIndex; index += 1) {
      const between = graph.nodes.get(layerNodes[index]!)!;
      minX += between.width + horizontalGap;
    }
  } else {
    for (let index = 0; index < nodeIndex; index += 1) {
      const between = graph.nodes.get(layerNodes[index]!)!;
      minX += between.width + horizontalGap;
    }
  }

  let maxX = Number.POSITIVE_INFINITY;
  if (right !== undefined) {
    const rightNode = graph.nodes.get(right)!;
    const rightIndex = layerNodes.indexOf(right);
    maxX = (rightNode.x ?? 0) - horizontalGap - node.width;

    for (let index = nodeIndex + 1; index < rightIndex; index += 1) {
      const between = graph.nodes.get(layerNodes[index]!)!;
      maxX -= between.width + horizontalGap;
    }
  }

  let x = optimalX;
  if (x < minX) x = minX;
  else if (x > maxX) x = maxX;

  node.x = x;
}

/** Pushes nodes rightward along layer order so boxes never overlap horizontally. */
export function compactLayers(
  graph: LayoutGraph,
  layerOrder: LayerOrder,
  horizontalGap: number,
): void {
  const lastLayer = maxLayerIndex(graph);

  for (let layer = 1; layer <= lastLayer; layer += 1) {
    const ids = layerOrder.get(layer);
    if (!ids) continue;

    for (let index = 1; index < ids.length; index += 1) {
      const previous = graph.nodes.get(ids[index - 1]!)!;
      const current = graph.nodes.get(ids[index]!)!;
      if (previous.x === undefined || current.x === undefined) continue;

      const minX = previous.x + previous.width + horizontalGap;
      if (current.x < minX) current.x = minX;
    }
  }
}

// Left-most packing for layer 1 before the x down sweep.
export function initializeLeftmostLayer(
  graph: LayoutGraph,
  layerOrder: LayerOrder,
  layer: LayerIndex,
  horizontalGap: number,
): void {
  const ids = layerOrder.get(layer);
  if (!ids) return;

  let x = 0;
  for (const id of ids) {
    const node = graph.nodes.get(id)!;
    node.x = x;
    x += node.width + horizontalGap;
  }
}

export function dagDownSweep(
  graph: LayoutGraph,
  layerOrder: LayerOrder,
  options?: DagSweepOptions,
): void {
  const gap = options?.horizontalNodeOffset ?? DEFAULT_HORIZONTAL_NODE_OFFSET;
  const initLayer1 = options?.initializeLayer1 ?? true;
  const nodeIds = [...graph.nodes.keys()];
  const predecessors = predecessorsFromAdjacencyList(nodeIds, graph.adjacencyList);
  const lastLayer = maxLayerIndex(graph);

  if (initLayer1) {
    initializeLeftmostLayer(graph, layerOrder, 1, gap);
  }

  for (let layer = 2; layer <= lastLayer; layer += 1) {
    const layerNodes = [...(layerOrder.get(layer) ?? [])];
    layerNodes.sort((left, right) => {
      const leftCount = predecessorCount(graph, predecessors, left, layer);
      const rightCount = predecessorCount(graph, predecessors, right, layer);

      if (leftCount !== rightCount) return leftCount - rightCount;
      return left.localeCompare(right);
    });

    for (const nodeId of layerNodes) {
      const preds = predecessorsOnLayer(graph, predecessors, nodeId, layer);
      const optimal =
        preds.length === 0
          ? 0
          : median(predecessorXPositions(graph, preds));
      addNode(graph, layerOrder, layer, nodeId, optimal, gap);
    }
  }
}

export function dagUpSweep(
  graph: LayoutGraph,
  layerOrder: LayerOrder,
  options?: DagSweepOptions,
): void {
  const gap = options?.horizontalNodeOffset ?? DEFAULT_HORIZONTAL_NODE_OFFSET;
  const lastLayer = maxLayerIndex(graph);

  for (let layer = lastLayer - 1; layer >= 2; layer -= 1) {
    const layerNodes = [...(layerOrder.get(layer) ?? [])];
    layerNodes.sort((left, right) => {
      const leftCount = successorCount(graph, left, layer);
      const rightCount = successorCount(graph, right, layer);
      if (leftCount !== rightCount) return leftCount - rightCount;
      return left.localeCompare(right);
    });

    for (const nodeId of layerNodes) {
      const succs = successorsOnNextLayer(graph, nodeId, layer);
      const optimal =
        succs.length === 0
          ? (graph.nodes.get(nodeId)?.x ?? 0)
          : median(successorXPositions(graph, succs));
      addNode(graph, layerOrder, layer, nodeId, optimal, gap);
    }
  }
}

export function assignDagX(
  graph: LayoutGraph,
  layerOrder: LayerOrder,
  options?: AssignDagXOptions,
): void {
  const gap = options?.horizontalNodeOffset ?? DEFAULT_HORIZONTAL_NODE_OFFSET;
  const iterations = options?.iterations ?? 2;
  const sweepOptions: DagSweepOptions = { horizontalNodeOffset: gap };

  for (let index = 0; index < iterations; index += 1) {
    dagDownSweep(graph, layerOrder, {
      ...sweepOptions,
      initializeLayer1: index === 0,
    });
    dagUpSweep(graph, layerOrder, sweepOptions);
    compactLayers(graph, layerOrder, gap);
  }
}