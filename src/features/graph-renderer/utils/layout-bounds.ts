import type { LayoutRenderNode } from "../../hierarchical-graph-layout";

const DEFAULT_PADDING = 24;

export interface LayoutBounds {
  width: number;
  height: number;
  viewBox: string;
}

export function computeLayoutBounds(
  nodes: readonly LayoutRenderNode[],
  padding = DEFAULT_PADDING,
): LayoutBounds {
  if (nodes.length === 0) {
    const width = padding * 2;
    const height = padding * 2;
    return {
      width,
      height,
      viewBox: `${-padding} ${-padding} ${width} ${height}`,
    };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  }

  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;
  const viewMinX = minX - padding;
  const viewMinY = minY - padding;

  return {
    width,
    height,
    viewBox: `${viewMinX} ${viewMinY} ${width} ${height}`,
  };
}