import type { GraphFocusVisual } from "../../graph-interaction";
import type { LayoutRenderModel } from "../../hierarchical-graph-layout";

import { computeLayoutBounds } from "./layout-bounds";
import { parseViewBox, type ViewBoxRect } from "./view-box";

export function collectHighlightedModuleIds(
  focusVisual: GraphFocusVisual | null,
): Set<string> {
  if (!focusVisual?.active) return new Set();

  const ids = new Set<string>();
  for (const [id, state] of focusVisual.nodeStateById) {
    if (state === "focus" || state === "related") ids.add(id);
  }
  return ids;
}

// Padding around fit region; fewer neighbors → slightly more margin around the node.
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

// Picks a viewBox that fits `content` in the viewport
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
): ViewBoxRect | null {
  const highlightedIds = collectHighlightedModuleIds(focusVisual);
  const count = Math.max(1, highlightedIds.size);
  const padding = focusFitPaddingForCount(count);
  const content = contentBoundsForHighlight(layout, highlightedIds, padding);
  if (!content) return null;

  const paddingRatio = count <= 3 ? 0.12 : count <= 10 ? 0.16 : 0.2;
  return viewBoxToFitContent(content, viewportAspect, paddingRatio);
}