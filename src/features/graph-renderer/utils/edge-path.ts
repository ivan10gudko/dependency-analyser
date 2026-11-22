import type { LayoutRenderNode } from "../../hierarchical-graph-layout";

import type { EdgeRoutingProfile } from "./edge-routing";

export interface Point {
  x: number;
  y: number;
}

export type EdgeBox = Pick<LayoutRenderNode, "x" | "y" | "width" | "height">;

const DEFAULT_BEND_OFFSET = 12;

/** Logical module dependencies use a single Bézier; dummy waypoints are layout-only. */
export function logicalEdgePath(routing: EdgeRoutingProfile): string {
  return cubicBezierEdgePath(routing);
}

/**
 * Smooth downward cubic Bézier between module ports (Sugiyama layout; no orthogonal corridors).
 */
export function cubicBezierEdgePath(routing: EdgeRoutingProfile): string {
  const start = routing.source;
  const end = routing.target;
  const downward = end.y >= start.y;
  const bend = verticalControlDistance(start, end);
  const bias = routing.lateralBias;
  const direction = downward ? 1 : -1;

  const c1 = { x: start.x + bias, y: start.y + bend * direction };
  const c2 = { x: end.x + bias, y: end.y - bend * direction };

  return `M ${start.x} ${start.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}`;
}

function verticalControlDistance(start: Point, end: Point): number {
  const span = Math.abs(end.y - start.y);
  return Math.max(24, Math.min(96, span * 0.42));
}

export function edgeSegmentPath(fromBox: EdgeBox, toBox: EdgeBox): string {
  return pointsToSvgPath(buildOrthogonalEdgePoints(fromBox, toBox));
}

export function pointsToSvgPath(points: readonly Point[]): string {
  if (points.length === 0) return "";

  const [first, ...rest] = points;
  const segments = rest.map((point) => `L ${point.x} ${point.y}`).join(" ");
  return `M ${first!.x} ${first!.y} ${segments}`.trim();
}

export function buildOrthogonalEdgePoints(
  fromBox: EdgeBox,
  toBox: EdgeBox,
  options?: { bendOffset?: number },
): Point[] {
  const from = edgeSourceAnchor(fromBox);
  const to = edgeTargetAnchor(toBox);

  if (from.y < to.y) {
    return orthogonalDownwardPath(from, to);
  }

  return orthogonalFallbackPath(from, to, options?.bendOffset);
}

export function edgeSourceAnchor(box: EdgeBox): Point {
  return { x: centerX(box), y: box.y + box.height };
}

export function edgeTargetAnchor(box: EdgeBox): Point {
  return { x: centerX(box), y: box.y };
}

function centerX(box: EdgeBox): number {
  return box.width > 0 ? box.x + box.width / 2 : box.x;
}

function orthogonalDownwardPath(from: Point, to: Point): Point[] {
  const midY = (from.y + to.y) / 2;
  return [
    from,
    { x: from.x, y: midY },
    { x: to.x, y: midY },
    to,
  ];
}

function orthogonalFallbackPath(
  from: Point,
  to: Point,
  bendOffset = DEFAULT_BEND_OFFSET,
): Point[] {
  const corridorY = Math.min(from.y, to.y) - bendOffset;
  return [from, { x: from.x, y: corridorY }, { x: to.x, y: corridorY }, to];
}
