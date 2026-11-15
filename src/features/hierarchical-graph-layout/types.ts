import type { GraphNode } from "../graph-data/types";

import type { LayerIndex as LayerNumber } from "./assign-layers";

export type LayerIndex = LayerNumber;

export type LayoutNodeId = string;

export const DUMMY_NODE_PREFIX = "__dummy__/";

export interface LayoutNode {
  id: LayoutNodeId;
  isDummy: boolean;
  module?: GraphNode;
  layer: LayerIndex;
  width: number;
  height: number;
  x?: number;
  y?: number;
}

export interface LayoutGraph {
  nodes: Map<LayoutNodeId, LayoutNode>;
  adjacencyList: Map<LayoutNodeId, Set<LayoutNodeId>>;
}

export interface NodeDimensions {
  width: number;
  height: number;
}

export const DEFAULT_MODULE_NODE_SIZE: NodeDimensions = {
  width: 160,
  height: 28,
};

const LABEL_CHAR_PX = 7.2;
const NODE_HORIZONTAL_PADDING = 28;
const MAX_MODULE_NODE_WIDTH = 320;

/** Estimated SVG label width so layout leaves enough horizontal space per module. */
export function moduleNodeWidthForLabel(
  label: string,
  minWidth = DEFAULT_MODULE_NODE_SIZE.width,
): number {
  const fromLabel = Math.ceil(label.length * LABEL_CHAR_PX) + NODE_HORIZONTAL_PADDING;
  return Math.min(MAX_MODULE_NODE_WIDTH, Math.max(minWidth, fromLabel));
}

/** Space between layer baselines; larger gaps reduce edge overlap with Bézier routing. */
export const DEFAULT_VERTICAL_LAYER_GAP = 96;

export const DEFAULT_MAX_VERTICAL_LAYER_GAP = 192;
export const DEFAULT_INTER_LAYER_EDGE_THRESHOLD = 8;
export const DEFAULT_INTER_LAYER_EDGE_NORMALIZE = 24;

export const DEFAULT_HORIZONTAL_NODE_OFFSET = 24;