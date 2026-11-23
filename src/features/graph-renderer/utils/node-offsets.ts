import type { LayoutRenderNode } from "../../hierarchical-graph-layout";

import { getViewportMapping, type ViewBoxRect } from "./view-box";

export interface NodeOffset {
  dx: number;
  dy: number;
}

export function applyNodeOffsets(
  nodes: readonly LayoutRenderNode[],
  offsets: ReadonlyMap<string, NodeOffset>,
): readonly LayoutRenderNode[] {
  if (offsets.size === 0) return nodes;

  let changed = false;
  const next = nodes.map((node) => {
    const offset = offsets.get(node.id);
    if (!offset || node.isDummy || (offset.dx === 0 && offset.dy === 0)) return node;
    changed = true;
    return { ...node, x: node.x + offset.dx, y: node.y + offset.dy };
  });

  return changed ? next : nodes;
}

// Screen-pixel delta mapped into viewBox units, in the direction the pointer moved.
export function screenDeltaToViewDelta(
  deltaX: number,
  deltaY: number,
  rect: ViewBoxRect,
  viewportWidth: number,
  viewportHeight: number,
): NodeOffset {
  const mapping = getViewportMapping(rect, viewportWidth, viewportHeight);
  if (!mapping) return { dx: 0, dy: 0 };

  return {
    dx: deltaX / mapping.scale,
    dy: deltaY / mapping.scale,
  };
}
