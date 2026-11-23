import { barrelFolderFromNodeId } from "../../barrel-view";
import {
  isHighlightedNodeState,
  type GraphFocusVisual,
} from "../../graph-interaction/types";
import type { LayoutRenderModel } from "../../hierarchical-graph-layout";
import { directoryOf } from "../../../lib/path";

import { computeLayoutBounds } from "./layout-bounds";
import { parseViewBox, type ViewBoxRect } from "./view-box";

export function collectHighlightedModuleIds(
  focusVisual: GraphFocusVisual | null,
): Set<string> {
  if (!focusVisual?.active) return new Set();

  const ids = new Set<string>();
  for (const [id, state] of focusVisual.nodeStateById) {
    if (isHighlightedNodeState(state)) ids.add(id);
  }
  return ids;
}

export const FOCUS_REVEAL_MIN_PULLBACK_RATIO = 1.4;
export const FOCUS_HIGHLIGHT_GRAPH_WIDTH_RATIO = 0.28;

export function shouldPlayFocusRevealAnimation(
  overview: ViewBoxRect,
  priorViewBox: ViewBoxRect,
  baseViewBox: ViewBoxRect,
): boolean {
  const pullback = overview.width / Math.max(priorViewBox.width, 1);
  if (pullback >= FOCUS_REVEAL_MIN_PULLBACK_RATIO) return true;
  if (
    pullback > 1.08 &&
    overview.width >= baseViewBox.width * FOCUS_HIGHLIGHT_GRAPH_WIDTH_RATIO
  ) {
    return true;
  }
  return false;
}

export function focusNodeCenterInLayout(
  layout: LayoutRenderModel,
  nodeId: string,
): { x: number; y: number } | null {
  const node = layout.nodes.find((n) => !n.isDummy && n.id === nodeId);
  if (!node || node.x === undefined || node.y === undefined) return null;
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}

export function viewBoxWithSameScaleCenteredOn(
  prior: ViewBoxRect,
  center: { x: number; y: number },
): ViewBoxRect {
  return {
    x: center.x - prior.width / 2,
    y: center.y - prior.height / 2,
    width: prior.width,
    height: prior.height,
  };
}

export type FocusFramePlan =
  | { mode: "direct"; prior: ViewBoxRect; target: ViewBoxRect }
  | {
      mode: "reveal";
      prior: ViewBoxRect;
      overview: ViewBoxRect;
      settle: ViewBoxRect;
    };

function paddingRatioForHighlightCount(count: number): number {
  if (count <= 3) return 0.12;
  if (count <= 10) return 0.16;
  return 0.2;
}

export function focusFitPaddingForCount(highlightCount: number): number {
  if (highlightCount <= 1) return 56;
  if (highlightCount <= 3) return 44;
  if (highlightCount <= 8) return 32;
  if (highlightCount <= 16) return 24;
  return 16;
}

export function contentBoundsForHighlight(
  layout: LayoutRenderModel,
  highlightedIds: ReadonlySet<string>,
  padding: number,
): ViewBoxRect | null {
  const nodes = layout.nodes.filter((node) => !node.isDummy && highlightedIds.has(node.id));
  if (nodes.length === 0) return null;

  return parseViewBox(computeLayoutBounds(nodes, padding).viewBox);
}

export function viewBoxToFitContent(
  content: ViewBoxRect,
  viewportAspect: number,
  paddingRatio: number,
): ViewBoxRect {
  const safeAspect = viewportAspect > 0 ? viewportAspect : 1;
  const padX = content.width * paddingRatio;
  const padY = content.height * paddingRatio;
  let boxW = content.width + padX * 2;
  let boxH = content.height + padY * 2;

  const minDim = 96;
  boxW = Math.max(boxW, minDim);
  boxH = Math.max(boxH, minDim / safeAspect);

  const boxAspect = boxW / boxH;
  let viewW: number;
  let viewH: number;

  if (boxAspect >= safeAspect) {
    viewW = boxW;
    viewH = viewW / safeAspect;
  } else {
    viewH = boxH;
    viewW = viewH * safeAspect;
  }

  const cx = content.x + content.width / 2;
  const cy = content.y + content.height / 2;

  return {
    x: cx - viewW / 2,
    y: cy - viewH / 2,
    width: viewW,
    height: viewH,
  };
}

export function viewBoxForGraphFocus(
  layout: LayoutRenderModel,
  focusVisual: GraphFocusVisual | null,
  viewportAspect: number,
  focusNodeId?: string | null,
): ViewBoxRect | null {
  const highlightedIds = collectHighlightedModuleIds(focusVisual);
  const count = Math.max(1, highlightedIds.size || (focusNodeId ? 1 : 0));
  const padding = focusFitPaddingForCount(count);
  let content = contentBoundsForHighlight(layout, highlightedIds, padding);
  if (!content && focusNodeId) {
    content = contentBoundsForHighlight(layout, new Set([focusNodeId]), padding);
  }
  if (!content) return null;

  return viewBoxToFitContent(
    content,
    viewportAspect,
    paddingRatioForHighlightCount(count),
  );
}

export function resolveFocusFramePlan(
  layout: LayoutRenderModel,
  focusVisual: GraphFocusVisual | null,
  viewportAspect: number,
  focusNodeId: string,
  priorViewBox: ViewBoxRect,
  baseViewBox: ViewBoxRect,
  settleScaleViewBox: ViewBoxRect = priorViewBox,
): FocusFramePlan | null {
  const overview = viewBoxForGraphFocus(layout, focusVisual, viewportAspect, focusNodeId);
  if (!overview) return null;

  const highlightedIds = collectHighlightedModuleIds(focusVisual);
  const center = focusNodeCenterInLayout(layout, focusNodeId);
  const settle = center
    ? viewBoxWithSameScaleCenteredOn(settleScaleViewBox, center)
    : { ...settleScaleViewBox };

  if (
    highlightedIds.size > 1 &&
    shouldPlayFocusRevealAnimation(overview, settleScaleViewBox, baseViewBox)
  ) {
    return { mode: "reveal", prior: priorViewBox, overview, settle };
  }

  return { mode: "direct", prior: priorViewBox, target: overview };
}

export function collectBarrelFolderNodeIds(
  layout: LayoutRenderModel,
  barrelNodeId: string,
): Set<string> {
  const ids = new Set<string>();
  const barrelDir = barrelFolderFromNodeId(barrelNodeId);
  for (const node of layout.nodes) {
    if (node.isDummy) continue;
    if (node.id === barrelNodeId) {
      ids.add(node.id);
      continue;
    }
    if (barrelDir !== null && directoryOf(node.id) === barrelDir) {
      ids.add(node.id);
    }
  }
  return ids;
}

export function resolveBarrelToggleTargetViewBox(
  layout: LayoutRenderModel,
  barrelNodeId: string,
  expanded: boolean,
  viewportAspect: number,
  priorViewBox: ViewBoxRect,
): ViewBoxRect | null {
  if (expanded) {
    const folderIds = collectBarrelFolderNodeIds(layout, barrelNodeId);
    if (folderIds.size > 0) {
      const padding = focusFitPaddingForCount(folderIds.size);
      const content = contentBoundsForHighlight(layout, folderIds, padding);
      if (content) {
        return viewBoxToFitContent(
          content,
          viewportAspect,
          paddingRatioForHighlightCount(folderIds.size),
        );
      }
    }
  }

  const center = focusNodeCenterInLayout(layout, barrelNodeId);
  if (!center) return null;
  return viewBoxWithSameScaleCenteredOn(priorViewBox, center);
}