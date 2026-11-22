import type {
  LayoutRenderEdge,
  LayoutRenderNode,
} from "../../hierarchical-graph-layout";

export interface LogicalEdge {
  from: string;
  to: string;
  waypoints: LayoutRenderNode[];
}

export function buildLogicalEdges(
  edges: readonly LayoutRenderEdge[],
  nodeById: ReadonlyMap<string, LayoutRenderNode>,
): LogicalEdge[] {
  const successors = new Map<string, string[]>();
  for (const edge of edges) {
    const next = successors.get(edge.from) ?? [];
    next.push(edge.to);
    successors.set(edge.from, next);
  }

  const logical: LogicalEdge[] = [];
  const seen = new Set<string>();

  for (const edge of edges) {
    const fromNode = nodeById.get(edge.from);
    if (!fromNode || fromNode.isDummy) continue;

    const waypoints: LayoutRenderNode[] = [];
    let cursor = edge.to;

    while (true) {
      const toNode = nodeById.get(cursor);
      if (!toNode) break;

      if (!toNode.isDummy) {
        const key = `${fromNode.id}\u2192${toNode.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          logical.push({ from: fromNode.id, to: toNode.id, waypoints });
        }
        break;
      }

      waypoints.push(toNode);
      const nextHops = successors.get(cursor);
      if (!nextHops || nextHops.length !== 1) break;
      cursor = nextHops[0]!;
    }
  }

  return logical;
}

const EDGE_KEY_SEP = "\u2192";

/** Layout walks reversed back-edges downward. Drawing uses the original direction. */
export function restoreReversedLogicalEdges(
  edges: readonly LogicalEdge[],
  reversedEdges: readonly { from: string; to: string; sharesLayoutEdge?: boolean }[] | undefined,
): LogicalEdge[] {
  if (!reversedEdges || reversedEdges.length === 0) return [...edges];

  const originalByLayoutKey = new Map<string, { sharesLayoutEdge?: boolean }>();
  for (const edge of reversedEdges) {
    originalByLayoutKey.set(`${edge.to}${EDGE_KEY_SEP}${edge.from}`, edge);
  }

  const restored: LogicalEdge[] = [];
  for (const edge of edges) {
    const reversal = originalByLayoutKey.get(`${edge.from}${EDGE_KEY_SEP}${edge.to}`);
    if (!reversal) {
      restored.push(edge);
      continue;
    }
    const flipped: LogicalEdge = {
      from: edge.to,
      to: edge.from,
      waypoints: [...edge.waypoints].reverse(),
    };
    if (reversal.sharesLayoutEdge) restored.push(edge);
    restored.push(flipped);
  }
  return restored;
}