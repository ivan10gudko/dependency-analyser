import type { LayerIndex, LayoutGraph, LayoutNodeId } from "./types";

// Left-to-right order of node ids within each layer.
export type LayerOrder = Map<LayerIndex, LayoutNodeId[]>;

export function buildInitialLayerOrder(graph: LayoutGraph): LayerOrder {
  const buckets = new Map<LayerIndex, LayoutNodeId[]>();

  for (const node of graph.nodes.values()) {
    const bucket = buckets.get(node.layer) ?? [];
    bucket.push(node.id);
    buckets.set(node.layer, bucket);
  }

  for (const [layer, ids] of buckets) {
    ids.sort((left, right) => left.localeCompare(right));
    buckets.set(layer, ids);
  }

  return buckets;
}

export function positionInLayer(
  layerOrder: LayerOrder,
  layer: LayerIndex,
  nodeId: LayoutNodeId,
): number {
  const index = layerOrder.get(layer)?.indexOf(nodeId);
  if (index === undefined || index < 0) {
    throw new Error(`node ${nodeId} is missing from layer ${layer}`);
  }
  return index;
}

export function maxLayerIndex(graph: LayoutGraph): LayerIndex {
  let max = 1;
  for (const node of graph.nodes.values()) {
    if (node.layer > max) max = node.layer;
  }
  return max;
}