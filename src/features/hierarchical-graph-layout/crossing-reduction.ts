import { predecessorsFromAdjacencyList } from "../../lib/graph";

import { buildInitialLayerOrder, maxLayerIndex, positionInLayer, type LayerOrder } from "./layer-order";
import type { LayerIndex, LayoutGraph, LayoutNodeId } from "./types";

export interface ReduceCrossingsOptions {
  passes?: number;
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

function downCrossingNumber(
  node: LayoutNodeId,
  layer: LayerIndex,
  graph: LayoutGraph,
  predecessors: ReadonlyMap<LayoutNodeId, ReadonlySet<LayoutNodeId>>,
  layerOrder: LayerOrder,
): number {
  const previousLayer = layer - 1;
  const predsInPreviousLayer: LayoutNodeId[] = [];

  for (const pred of predecessors.get(node) ?? []) {
    if (graph.nodes.get(pred)?.layer === previousLayer) {
      predsInPreviousLayer.push(pred);
    }
  }

  if (predsInPreviousLayer.length === 0) {
    return positionInLayer(layerOrder, layer, node);
  }

  let sum = 0;
  for (const pred of predsInPreviousLayer) {
    sum += positionInLayer(layerOrder, previousLayer, pred);
  }

  return sum / predsInPreviousLayer.length;
}

function upCrossingNumber(
  node: LayoutNodeId,
  layer: LayerIndex,
  graph: LayoutGraph,
  layerOrder: LayerOrder,
): number {
  const succs = successorsOnNextLayer(graph, node, layer);

  if (succs.length === 0) {
    return positionInLayer(layerOrder, layer, node);
  }

  let sum = 0;
  for (const succ of succs) {
    sum += positionInLayer(layerOrder, layer + 1, succ);
  }

  return sum / succs.length;
}

function resortLayerByScore(
  layer: LayerIndex,
  layerOrder: LayerOrder,
  scoreOf: (node: LayoutNodeId) => number,
): void {
  const nodes = layerOrder.get(layer);
  if (!nodes) return;

  const scored = nodes.map((node) => ({
    node,
    score: scoreOf(node),
  }));

  scored.sort((left, right) => {
    if (left.score !== right.score) return left.score - right.score;
    return left.node.localeCompare(right.node);
  });

  layerOrder.set(
    layer,
    scored.map((entry) => entry.node),
  );
}

function resortLayerDown(
  layer: LayerIndex,
  graph: LayoutGraph,
  predecessors: ReadonlyMap<LayoutNodeId, ReadonlySet<LayoutNodeId>>,
  layerOrder: LayerOrder,
): void {
  resortLayerByScore(layer, layerOrder, (node) =>
    downCrossingNumber(node, layer, graph, predecessors, layerOrder),
  );
}

function resortLayerUp(
  layer: LayerIndex,
  graph: LayoutGraph,
  layerOrder: LayerOrder,
): void {
  resortLayerByScore(layer, layerOrder, (node) =>
    upCrossingNumber(node, layer, graph, layerOrder),
  );
}

export function downSweep(
  graph: LayoutGraph,
  layerOrder: LayerOrder = buildInitialLayerOrder(graph),
): LayerOrder {
  const nodeIds = [...graph.nodes.keys()];
  const predecessors = predecessorsFromAdjacencyList(nodeIds, graph.adjacencyList);
  const lastLayer = maxLayerIndex(graph);

  for (let layer = 2; layer <= lastLayer; layer += 1) {
    resortLayerDown(layer, graph, predecessors, layerOrder);
  }

  return layerOrder;
}

export function upSweep(
  graph: LayoutGraph,
  layerOrder: LayerOrder,
): LayerOrder {
  const lastLayer = maxLayerIndex(graph);

  for (let layer = lastLayer - 1; layer >= 1; layer -= 1) {
    resortLayerUp(layer, graph, layerOrder);
  }

  return layerOrder;
}

export function reduceCrossings(
  graph: LayoutGraph,
  layerOrder: LayerOrder = buildInitialLayerOrder(graph),
  options?: ReduceCrossingsOptions,
): LayerOrder {
  const passes = options?.passes ?? 2;

  for (let pass = 0; pass < passes; pass += 1) {
    downSweep(graph, layerOrder);
    upSweep(graph, layerOrder);
  }

  return layerOrder;
}