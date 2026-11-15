import { inDegrees } from "../../lib/graph";
import type { ModuleDependencyGraph, NodeId } from "../graph-data/types";

import { assignLayers } from "./assign-layers";
import { collectReachableFromRoot } from "./subgraph";
import { assignDagX } from "./assign-x-coordinates";
import {
  assignYCoordinates,
  type AssignYCoordinatesOptions,
} from "./assign-y-coordinates";
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

export interface LayoutScopeSummary {
  root: NodeId;
  totalModules: number;
}

export interface HierarchicalLayoutResult {
  layoutGraph: LayoutGraph;
  layerOrder: LayerOrder;
  model: LayoutRenderModel;
  scope: LayoutScopeSummary;
}

export interface BuildHierarchicalLayoutOptions extends AssignYCoordinatesOptions {
  root?: NodeId;
  crossingPasses?: number;
  xIterations?: number;
}

const PREFERRED_ROOTS = [
  "src/main.tsx",
  "src/main.ts",
  "src/App.tsx",
  "App.tsx",
  "app/layout.tsx",
  "app/page.tsx",
  "src/app/layout.tsx",
  "src/app/page.tsx",
  "pages/_app.tsx",
  "pages/index.tsx",
  "src/pages/_app.tsx",
  "src/pages/index.tsx",
  "src/router.tsx",
  "router.tsx",
] as const;

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
    passes: options?.crossingPasses ?? 6,
  });
  assignDagX(layoutGraph, layerOrder, {
    iterations: options?.xIterations ?? 2,
  });
  assignYCoordinates(layoutGraph, options);

  return {
    layoutGraph,
    layerOrder,
    model: toLayoutRenderModel(layoutGraph, layerOrder),
    scope: {
      root,
      totalModules: acyclic.nodes.size,
    },
  };
}

export function pickLayoutRoot(graph: ModuleDependencyGraph): NodeId {
  for (const candidate of PREFERRED_ROOTS) {
    if (graph.nodes.has(candidate)) return candidate;
  }

  const nodes = new Set(graph.nodes.keys());
  const indegree = inDegrees(nodes, graph.adjacencyList);
  const sources = [...nodes].filter(
    (node) => indegree.get(node) === 0 && !isPoorRootCandidate(node),
  );

  const fromSources = pickLargestReachableRoot(graph, sources);
  if (fromSources !== undefined) return fromSources;

  const remaining = [...nodes].filter((node) => !isPoorRootCandidate(node));
  const fromRemaining = pickLargestReachableRoot(graph, remaining);
  if (fromRemaining !== undefined) return fromRemaining;

  return [...nodes].sort((left, right) => left.localeCompare(right))[0]!;
}

function isPoorRootCandidate(moduleId: NodeId): boolean {
  if (/\.d\.ts$/i.test(moduleId)) return true;
  if (/(^|\/)(next|vite)-env\.d\.ts$/i.test(moduleId)) return true;
  if (/(^|\/)eslint\.config\./i.test(moduleId)) return true;
  if (/(^|\/)(vite|vitest|webpack|rollup)\.config\./i.test(moduleId)) return true;
  return false;
}

function pickLargestReachableRoot(
  graph: ModuleDependencyGraph,
  candidates: readonly NodeId[],
): NodeId | undefined {
  let best: NodeId | undefined;
  let bestSize = 0;

  for (const candidate of candidates) {
    const size = reachableSize(graph, candidate);
    if (size > bestSize) {
      bestSize = size;
      best = candidate;
    }
  }

  return best;
}

function reachableSize(graph: ModuleDependencyGraph, root: NodeId): number {
  return collectReachableFromRoot(graph, root).size;
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
