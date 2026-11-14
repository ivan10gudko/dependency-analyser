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

export const DEFAULT_VERTICAL_LAYER_GAP = 40;

export const DEFAULT_HORIZONTAL_NODE_OFFSET = 24;