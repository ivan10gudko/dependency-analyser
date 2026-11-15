import type { LayoutRenderNode } from "../../hierarchical-graph-layout";

import type { Point } from "./edge-path";
import type { LogicalEdge } from "./logical-edges";

export interface EdgeRoutingProfile {
  source: Point;
  target: Point;
  lateralBias: number;
}

const PORT_MARGIN_PX = 10;
const FAN_SPREAD_PX = 8;
const LATERAL_BIAS_STEP = 3;

function edgeKey(edge: LogicalEdge): string {
  return `${edge.from}\u2192${edge.to}`;
}

export function centerX(node: Pick<LayoutRenderNode, "x" | "width">): number {
  return node.width > 0 ? node.x + node.width / 2 : node.x;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}


export function portTowardNeighbor(
  node: LayoutRenderNode,
  neighborCenterX: number,
  border: "top" | "bottom",
  index: number,
  total: number,
): Point {
  const margin = Math.min(PORT_MARGIN_PX, Math.max(node.width * 0.1, 6));
  const left = node.x + margin;
  const right = node.x + node.width - margin;

  let x = neighborCenterX;
  if (total > 1) {
    const spread = Math.min(FAN_SPREAD_PX, Math.max(node.width / (total + 2), 2));
    x += (index - (total - 1) / 2) * spread;
  }

  return {
    x: clamp(x, left, right),
    y: border === "bottom" ? node.y + node.height : node.y,
  };
}

function compareEdgesByTargetX(
  left: LogicalEdge,
  right: LogicalEdge,
  nodeById: ReadonlyMap<string, LayoutRenderNode>,
): number {
  const leftX = centerX(nodeById.get(left.to)!);
  const rightX = centerX(nodeById.get(right.to)!);
  if (leftX !== rightX) return leftX - rightX;
  return left.to.localeCompare(right.to);
}

function compareEdgesBySourceX(
  left: LogicalEdge,
  right: LogicalEdge,
  nodeById: ReadonlyMap<string, LayoutRenderNode>,
): number {
  const leftX = centerX(nodeById.get(left.from)!);
  const rightX = centerX(nodeById.get(right.from)!);
  if (leftX !== rightX) return leftX - rightX;
  return left.from.localeCompare(right.from);
}

export function buildEdgeRoutingProfiles(
  edges: readonly LogicalEdge[],
  nodeById: ReadonlyMap<string, LayoutRenderNode>,
): Map<string, EdgeRoutingProfile> {
  const outgoing = new Map<string, LogicalEdge[]>();
  const incoming = new Map<string, LogicalEdge[]>();

  for (const edge of edges) {
    const out = outgoing.get(edge.from) ?? [];
    out.push(edge);
    outgoing.set(edge.from, out);

    const inn = incoming.get(edge.to) ?? [];
    inn.push(edge);
    incoming.set(edge.to, inn);
  }

  const profiles = new Map<string, EdgeRoutingProfile>();

  for (const edge of edges) {
    const key = edgeKey(edge);
    const fromNode = nodeById.get(edge.from);
    const toNode = nodeById.get(edge.to);
    if (!fromNode || !toNode) continue;

    const outs = [...(outgoing.get(edge.from) ?? [])].sort((a, b) =>
      compareEdgesByTargetX(a, b, nodeById),
    );
    const ins = [...(incoming.get(edge.to) ?? [])].sort((a, b) =>
      compareEdgesBySourceX(a, b, nodeById),
    );

    const outIndex = Math.max(outs.findIndex((item) => edgeKey(item) === key), 0);
    const inIndex = Math.max(ins.findIndex((item) => edgeKey(item) === key), 0);

    const lateralBias =
      (outIndex - (outs.length - 1) / 2) * LATERAL_BIAS_STEP +
      (inIndex - (ins.length - 1) / 2) * LATERAL_BIAS_STEP;

    profiles.set(key, {
      source: portTowardNeighbor(fromNode, centerX(toNode), "bottom", outIndex, outs.length),
      target: portTowardNeighbor(toNode, centerX(fromNode), "top", inIndex, ins.length),
      lateralBias,
    });
  }

  return profiles;
}