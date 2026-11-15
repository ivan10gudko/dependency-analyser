import type { EdgeVisualState } from "../../graph-interaction";

import type { EdgeRoutingProfile } from "../utils/edge-routing";
import { logicalEdgePath } from "../utils/edge-path";
import type { LogicalEdge } from "../utils/logical-edges";

export interface GraphEdgeProps {
  edge: LogicalEdge;
  routing: EdgeRoutingProfile;
  visualState?: EdgeVisualState;
}

const ARROW_MARKER_ID = "graph-edge-arrow";

export function graphEdgeArrowMarkerId(): string {
  return ARROW_MARKER_ID;
}

export function GraphEdge({ edge, routing, visualState = "default" }: GraphEdgeProps) {
  const path = logicalEdgePath(routing);
  const className =
    visualState === "default" ? "graph-edge" : `graph-edge graph-edge--${visualState}`;

  return (
    <path
      className={className}
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