import type { LayoutRenderModel } from "../../hierarchical-graph-layout";

import type { GraphFocusVisual } from "../types";

export function enrichFocusVisualForLayout(
  focusVisual: GraphFocusVisual | null,
  layout: LayoutRenderModel | null,
): GraphFocusVisual | null {
  if (!focusVisual?.active || !layout) return focusVisual;

  let changed = false;
  const nodeStateById = new Map(focusVisual.nodeStateById);
  for (const node of layout.nodes) {
    if (node.isDummy) continue;
    if (!nodeStateById.has(node.id)) {
      nodeStateById.set(node.id, "dimmed");
      changed = true;
    }
  }

  if (!changed) return focusVisual;
  return { ...focusVisual, nodeStateById };
}