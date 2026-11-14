import { inDegrees } from "../../lib/graph";
import type { ModuleDependencyGraph, NodeId } from "../graph-data/types";

import { assignLayers } from "./assign-layers";
import { assignDagX } from "./assign-x-coordinates";
import { assignYCoordinates } from "./assign-y-coordinates";
import { reduceCrossings } from "./crossing-reduction";
import { createDummyNodes } from "./insert-dummy-nodes";
import { buildInitialLayerOrder, type LayerOrder } from "./layer-order";
import { breakCycles } from "./remove-cycles";
import type { LayoutGraph } from "./types";

export interface LayoutRenderNode {
  id: string;
  isDummy: boolean;
  label?: string;
  layer: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutRenderEdge {
  from: string;
  to: string;
}

export interface LayoutRenderModel {
  nodes: LayoutRenderNode[];
  edges: LayoutRenderEdge[];
  layerOrder: Record<string, string[]>;
}

export interface HierarchicalLayoutResult {
  layoutGraph: LayoutGraph;
  layerOrder: LayerOrder;
  model: LayoutRenderModel;
}

export interface BuildHierarchicalLayoutOptions {
  root?: NodeId;
  crossingPasses?: number;
  xIterations?: number;
}

const PREFERRED_ROOTS = ["src/App.tsx", "App.tsx"] as const;

export function pickLayoutRoot(graph: ModuleDependencyGraph): NodeId {
  for (const candidate of PREFERRED_ROOTS) {
    if (graph.nodes.has(candidate)) return candidate;
  }

  const nodes = new Set(graph.nodes.keys());
  const indegree = inDegrees(nodes, graph.adjacencyList);
  const sources = [...nodes]
    .filter((node) => indegree.get(node) === 0)
    .sort((left, right) => left.localeCompare(right));

  if (sources.length > 0) return sources[0]!;

  return [...nodes].sort((left, right) => left.localeCompare(right))[0]!;
}

export function toLayoutRenderModel(
  layout: LayoutGraph,
  layerOrder: LayerOrder,
): LayoutRenderModel {
  const nodes: LayoutRenderNode[] = [];

  for (const node of layout.nodes.values()) {
    if (node.x === undefined || node.y === undefined) {
      throw new Error(`layout node ${node.id} is missing x/y coordinates`);
    }

    nodes.push({
      id: node.id,
      isDummy: node.isDummy,
      label: node.module?.name ?? (node.isDummy ? undefined : node.id),
      layer: node.layer,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
    });
  }

  nodes.sort((left, right) => left.id.localeCompare(right.id));

  const edges: LayoutRenderEdge[] = [];
  for (const [from, targets] of layout.adjacencyList) {
    for (const to of targets) {
      edges.push({ from, to });
    }
  }
  edges.sort((left, right) => {
    const from = left.from.localeCompare(right.from);
    if (from !== 0) return from;
    return left.to.localeCompare(right.to);
  });

  const layerOrderRecord: Record<string, string[]> = {};
  for (const [layer, ids] of layerOrder) {
    layerOrderRecord[String(layer)] = [...ids];
  }

  return { nodes, edges, layerOrder: layerOrderRecord };
}

export function buildHierarchicalLayout(
  graph: ModuleDependencyGraph,
  options?: BuildHierarchicalLayoutOptions,
): HierarchicalLayoutResult {
  const root = options?.root ?? pickLayoutRoot(graph);
  const acyclic = breakCycles(graph, root);
  const layers = assignLayers(acyclic);
  const layoutGraph = createDummyNodes(acyclic, layers);
  const layerOrder = buildInitialLayerOrder(layoutGraph);

  reduceCrossings(layoutGraph, layerOrder, {
    passes: options?.crossingPasses ?? 2,
  });
  assignDagX(layoutGraph, layerOrder, {
    iterations: options?.xIterations ?? 2,
  });
  assignYCoordinates(layoutGraph);

  return {
    layoutGraph,
    layerOrder,
    model: toLayoutRenderModel(layoutGraph, layerOrder),
  };
}