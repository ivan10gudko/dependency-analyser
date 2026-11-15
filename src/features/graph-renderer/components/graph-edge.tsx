import type { EdgeRoutingProfile } from "../utils/edge-routing";
import { logicalEdgePath } from "../utils/edge-path";
import type { LogicalEdge } from "../utils/logical-edges";

export interface GraphEdgeProps {
  edge: LogicalEdge;
  routing: EdgeRoutingProfile;
}

const ARROW_MARKER_ID = "graph-edge-arrow";

export function graphEdgeArrowMarkerId(): string {
  return ARROW_MARKER_ID;
}

export function GraphEdge({ edge, routing }: GraphEdgeProps) {
  const path = logicalEdgePath(routing);

  return (
    <path
      className="graph-edge"
      d={path}
      fill="none"
      markerEnd={`url(#${ARROW_MARKER_ID})`}
      data-from={edge.from}
      data-to={edge.to}
    >
      <title>{`${edge.from} → ${edge.to}`}</title>
    </path>
  );
}