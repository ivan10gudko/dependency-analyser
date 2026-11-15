import type { LayoutGraph, LayoutNode, LayerIndex } from "./types";

import {
  type AdaptiveInterLayerGapOptions,
  computeGapForBoundary,
  countInterLayerEdges,
  defaultAdaptiveInterLayerGapOptions,
} from "./compute-inter-layer-gap";

export interface AssignYCoordinatesOptions extends AdaptiveInterLayerGapOptions {
  verticalNodeOffset?: number;
  adaptiveVerticalGap?: boolean;
}

export function assignYCoordinates(
  graph: LayoutGraph,
  options?: AssignYCoordinatesOptions,
): void {
  const adaptiveDefaults = {
    ...defaultAdaptiveInterLayerGapOptions,
    ...options,
  };
  const gapMin = options?.gapMin ?? adaptiveDefaults.gapMin;
  const useFixedGap = options?.verticalNodeOffset !== undefined;
  const useAdaptive = !useFixedGap && (options?.adaptiveVerticalGap ?? true);
  const fixedGap = options?.verticalNodeOffset ?? gapMin;
  const interLayerEdgeCounts = useAdaptive ? countInterLayerEdges(graph) : null;

  const nodesByLayer = groupNodesByLayer(graph);
  const layerIndices = [...nodesByLayer.keys()].sort((left, right) => left - right);
  let base = 0;

  for (const layer of layerIndices) {
    const nodes = nodesByLayer.get(layer)!;
    const maxHeight = Math.max(...nodes.map((node) => node.height));

    for (const node of nodes) {
      node.y = base + (maxHeight - node.height) / 2;
    }

    base += maxHeight + gapAfterLayer(layer, {
      useFixedGap,
      useAdaptive,
      fixedGap,
      gapMin,
      interLayerEdgeCounts,
      gapOptions: options,
    });
  }
}

interface GapAfterLayerContext {
  useFixedGap: boolean;
  useAdaptive: boolean;
  fixedGap: number;
  gapMin: number;
  interLayerEdgeCounts: Map<LayerIndex, number> | null;
  gapOptions?: AdaptiveInterLayerGapOptions;
}

function gapAfterLayer(layer: LayerIndex, context: GapAfterLayerContext): number {
  if (context.useFixedGap) return context.fixedGap;
  if (!context.useAdaptive) return context.gapMin;
  const n = context.interLayerEdgeCounts!.get(layer) ?? 0;
  return computeGapForBoundary(n, context.gapOptions);
}

function groupNodesByLayer(graph: LayoutGraph): Map<LayerIndex, LayoutNode[]> {
  const nodesByLayer = new Map<LayerIndex, LayoutNode[]>();

  for (const node of graph.nodes.values()) {
    const bucket = nodesByLayer.get(node.layer) ?? [];
    bucket.push(node);
    nodesByLayer.set(node.layer, bucket);
  }

  return nodesByLayer;
}