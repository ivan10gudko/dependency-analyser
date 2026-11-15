import type { LayoutGraph, LayerIndex } from "./types";
import {
  DEFAULT_INTER_LAYER_EDGE_NORMALIZE,
  DEFAULT_INTER_LAYER_EDGE_THRESHOLD,
  DEFAULT_MAX_VERTICAL_LAYER_GAP,
  DEFAULT_VERTICAL_LAYER_GAP,
} from "./types";

export interface AdaptiveInterLayerGapOptions {
  gapMin?: number;
  gapMax?: number;
  edgeThreshold?: number;
  edgeNormalizeM?: number;
}

export const defaultAdaptiveInterLayerGapOptions: Required<AdaptiveInterLayerGapOptions> =
  {
    gapMin: DEFAULT_VERTICAL_LAYER_GAP,
    gapMax: DEFAULT_MAX_VERTICAL_LAYER_GAP,
    edgeThreshold: DEFAULT_INTER_LAYER_EDGE_THRESHOLD,
    edgeNormalizeM: DEFAULT_INTER_LAYER_EDGE_NORMALIZE,
  };

export function computeGapForBoundary(
  edgeCount: number,
  options?: AdaptiveInterLayerGapOptions,
): number {
  const {
    gapMin,
    gapMax,
    edgeThreshold,
    edgeNormalizeM,
  } = {
    ...defaultAdaptiveInterLayerGapOptions,
    ...options,
  };

  const excess = Math.max(0, edgeCount - edgeThreshold);
  const t = edgeNormalizeM > 0 ? Math.min(1, excess / edgeNormalizeM) : 0;
  return gapMin + t * (gapMax - gapMin);
}

export function countInterLayerEdges(graph: LayoutGraph): Map<LayerIndex, number> {
  const counts = new Map<LayerIndex, number>();

  for (const [fromId, targets] of graph.adjacencyList) {
    const from = graph.nodes.get(fromId);
    if (!from) continue;

    for (const toId of targets) {
      const to = graph.nodes.get(toId);
      if (!to) continue;
      if (to.layer !== from.layer + 1) continue;

      counts.set(from.layer, (counts.get(from.layer) ?? 0) + 1);
    }
  }

  return counts;
}