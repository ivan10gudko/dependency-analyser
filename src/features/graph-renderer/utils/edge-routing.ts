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

export function buildEdgeRoutingProfiles(
  edges: readonly LogicalEdge[],
  nodeById: ReadonlyMap<string, LayoutRenderNode>,
): Map<string, EdgeRoutingProfile> {
  const outgoing = new Map<string, LogicalEdge[]>();
  const incoming = new Map<string, LogicalEdge[]>();

  for (const edge of edges) {
    const out = outgoing.get(edge.from);
    if (out) out.push(edge);
    else outgoing.set(edge.from, [edge]);

    const inn = incoming.get(edge.to);
    if (inn) inn.push(edge);
    else incoming.set(edge.to, [edge]);
  }

  for (const group of outgoing.values()) {
    group.sort((left, right) => compareEdgesByTargetX(left, right, nodeById));
  }
  for (const group of incoming.values()) {
    group.sort((left, right) => compareEdgesBySourceX(left, right, nodeById));
  }

  const outgoingIndex = new Map<string, number>();
  for (const group of outgoing.values()) {
    group.forEach((edge, index) => outgoingIndex.set(edgeKey(edge), index));
  }
  const incomingIndex = new Map<string, number>();
  for (const group of incoming.values()) {
    group.forEach((edge, index) => incomingIndex.set(edgeKey(edge), index));
  }

  const profiles = new Map<string, EdgeRoutingProfile>();

  for (const edge of edges) {
    const key = edgeKey(edge);
    const fromNode = nodeById.get(edge.from);
    const toNode = nodeById.get(edge.to);
    if (!fromNode || !toNode) continue;

    const outs = outgoing.get(edge.from) ?? [];
    const ins = incoming.get(edge.to) ?? [];
    const outIndex = outgoingIndex.get(key) ?? 0;
    const inIndex = incomingIndex.get(key) ?? 0;

    const lateralBias =
      (outIndex - (outs.length - 1) / 2) * LATERAL_BIAS_STEP +
      (inIndex - (ins.length - 1) / 2) * LATERAL_BIAS_STEP;

    const fromIsAbove = centerY(fromNode) <= centerY(toNode);

    profiles.set(key, {
      source: portTowardNeighbor(
        fromNode,
        centerX(toNode),
        fromIsAbove ? "bottom" : "top",
        outIndex,
        outs.length,
      ),
      target: portTowardNeighbor(
        toNode,
        centerX(fromNode),
        fromIsAbove ? "top" : "bottom",
        inIndex,
        ins.length,
      ),
      lateralBias,
    });
  }

  return profiles;
}

function edgeKey(edge: LogicalEdge): string {
  return `${edge.from}\u2192${edge.to}`;
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function centerX(node: Pick<LayoutRenderNode, "x" | "width">): number {
  return node.width > 0 ? node.x + node.width / 2 : node.x;
}

function centerY(node: Pick<LayoutRenderNode, "y" | "height">): number {
  return node.height > 0 ? node.y + node.height / 2 : node.y;
}
