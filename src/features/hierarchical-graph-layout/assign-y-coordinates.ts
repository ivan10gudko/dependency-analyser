import type { LayoutGraph, LayoutNode, LayerIndex } from "./types";
import { DEFAULT_VERTICAL_LAYER_GAP } from "./types";

export interface AssignYCoordinatesOptions {
  verticalNodeOffset?: number;
}

// Centers nodes within each layer and stacks layers vertically
export function assignYCoordinates(
  graph: LayoutGraph,
  options?: AssignYCoordinatesOptions,
): void {
  const gap = options?.verticalNodeOffset ?? DEFAULT_VERTICAL_LAYER_GAP;
  const nodesByLayer = new Map<LayerIndex, LayoutNode[]>();

  for (const node of graph.nodes.values()) {
    const bucket = nodesByLayer.get(node.layer) ?? [];
    bucket.push(node);
    nodesByLayer.set(node.layer, bucket);
  }

  const layerIndices = [...nodesByLayer.keys()].sort((left, right) => left - right);
  let base = 0;

  for (const layer of layerIndices) {
    const nodes = nodesByLayer.get(layer)!;
    const maxHeight = Math.max(...nodes.map((node) => node.height));

    for (const node of nodes) {
      node.y = base + (maxHeight - node.height) / 2;
    }

    base += maxHeight + gap;
  }
}