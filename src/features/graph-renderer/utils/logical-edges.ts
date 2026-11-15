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