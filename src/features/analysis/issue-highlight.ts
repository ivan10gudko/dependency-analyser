import {
  buildProxyToBarrelMap,
  mapModuleIdToDisplay,
  type BarrelDisplayOptions,
} from "../barrel-view";
import { edgeKey } from "../graph-interaction/model/focus-neighborhood";
import type { EdgeVisualState, GraphFocusVisual, NodeVisualState } from "../graph-interaction/types";
import type { ModuleDependencyGraph } from "../graph-data/types";

import type { AnalysisIssue, Severity } from "./types";

export interface IssueHighlight {
  severity: Severity;
  nodeIds: ReadonlySet<string>;
  edgeKeys: ReadonlySet<string>;
}

export function buildIssueHighlight(
  issue: AnalysisIssue,
  graph: ModuleDependencyGraph,
  barrelOptions: BarrelDisplayOptions,
): IssueHighlight {
  const proxyToBarrel = buildProxyToBarrelMap(graph, barrelOptions);
  const nodeIds = new Set<string>();
  for (const moduleId of issue.moduleIds) {
    nodeIds.add(mapModuleIdToDisplay(moduleId, graph, barrelOptions, proxyToBarrel));
  }

  const edgeKeys = new Set<string>();
  for (const edge of issue.edges) {
    const from = mapModuleIdToDisplay(edge.from, graph, barrelOptions, proxyToBarrel);
    const to = mapModuleIdToDisplay(edge.to, graph, barrelOptions, proxyToBarrel);
    if (from === to && edge.from !== edge.to) continue;
    edgeKeys.add(edgeKey(from, to));
  }

  return { severity: issue.severity, nodeIds, edgeKeys };
}

export function buildIssueFocusVisual(highlight: IssueHighlight): GraphFocusVisual {
  const nodeStateById = new Map<string, NodeVisualState>();
  for (const id of highlight.nodeIds) nodeStateById.set(id, "focus");

  const edgeStateByKey = new Map<string, EdgeVisualState>();
  for (const key of highlight.edgeKeys) edgeStateByKey.set(key, "highlighted");

  return {
    active: highlight.nodeIds.size > 0,
    nodeStateById,
    edgeStateByKey,
  };
}
