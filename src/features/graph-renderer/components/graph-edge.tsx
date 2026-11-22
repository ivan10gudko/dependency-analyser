import type { Severity } from "../../analysis";
import type { EdgeVisualState } from "../../graph-interaction";
import type { LocationColorId } from "../../location-colors";

import type { EdgeRoutingProfile } from "../utils/edge-routing";
import { logicalEdgePath } from "../utils/edge-path";
import type { LogicalEdge } from "../utils/logical-edges";

export interface GraphEdgeProps {
  edge: LogicalEdge;
  routing: EdgeRoutingProfile;
  visualState?: EdgeVisualState;
  issueSeverity?: Severity | null;
  zoneColorId?: LocationColorId;
}

const ARROW_MARKER_ID = "graph-edge-arrow";

export function graphEdgeArrowMarkerId(): string {
  return ARROW_MARKER_ID;
}

export function GraphEdge({
  edge,
  routing,
  visualState = "default",
  issueSeverity = null,
  zoneColorId,
}: GraphEdgeProps) {
  const path = logicalEdgePath(routing);
  const className = [
    "graph-edge",
    visualState === "default" ? undefined : `graph-edge--${visualState}`,
    issueSeverity ? "graph-edge--issue" : undefined,
    issueSeverity ? `graph-edge--issue-${issueSeverity}` : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <path
      className={className}
      d={path}
      fill="none"
      markerEnd={`url(#${ARROW_MARKER_ID})`}
      data-from={edge.from}
      data-to={edge.to}
      {...(zoneColorId ? { "data-zone": zoneColorId } : {})}
    >
      <title>{`${edge.from} → ${edge.to}`}</title>
    </path>
  );
}