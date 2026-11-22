import { forwardRef, memo, useMemo, type PointerEvent as ReactPointerEvent } from "react";

import { barrelFolderFromNodeId } from "../../barrel-view";
import type { IssueHighlight } from "../../analysis";
import type {
  EdgeVisualState,
  GraphFocusVisual,
  NodeVisualState,
} from "../../graph-interaction";
import type { LocationColorId } from "../../location-colors";
import type { LayoutRenderModel } from "../../hierarchical-graph-layout";
import { edgeKey } from "../../graph-interaction/model/focus-neighborhood";

import "../graph-renderer.css";

import { GraphEdge, graphEdgeArrowMarkerId } from "./graph-edge";
import { GraphNode } from "./graph-node";
import { computeLayoutBounds } from "../utils/layout-bounds";
import { buildEdgeRoutingProfiles } from "../utils/edge-routing";
import { buildLogicalEdges, restoreReversedLogicalEdges } from "../utils/logical-edges";

export interface GraphRendererProps {
  layout: LayoutRenderModel;
  padding?: number;
  viewBox?: string;
  fillContainer?: boolean;
  focusVisual?: GraphFocusVisual | null;
  issueHighlight?: IssueHighlight | null;
  /** Paint only the selected issue. Neighborhood focus colors stay off. */
  issueOnly?: boolean;
  locationColorByModuleId?: ReadonlyMap<string, LocationColorId> | null;
  expandedBarrelDirectories?: ReadonlySet<string>;
  onNodePointerDown?: (event: ReactPointerEvent<SVGGElement>) => void;
}

export const GraphRenderer = memo(forwardRef<SVGSVGElement, GraphRendererProps>(
  function GraphRenderer(
    {
      layout,
      padding,
      viewBox: viewBoxProp,
      fillContainer = false,
      focusVisual = null,
      issueHighlight = null,
      issueOnly = false,
      locationColorByModuleId = null,
      expandedBarrelDirectories,
      onNodePointerDown,
    },
    ref,
  ) {
  const bounds = useMemo(
    () => computeLayoutBounds(layout.nodes, padding),
    [layout.nodes, padding],
  );
  const viewBox = viewBoxProp ?? bounds.viewBox;
  const width = fillContainer ? "100%" : bounds.width;
  const height = fillContainer ? "100%" : bounds.height;

  const nodeById = useMemo(() => {
    const map = new Map<string, (typeof layout.nodes)[number]>();
    for (const node of layout.nodes) {
      map.set(node.id, node);
    }
    return map;
  }, [layout.nodes]);

  const visibleNodes = useMemo(
    () => layout.nodes.filter((node) => !node.isDummy),
    [layout.nodes],
  );

  const logicalEdges = useMemo(
    () =>
      restoreReversedLogicalEdges(
        buildLogicalEdges(layout.edges, nodeById),
        layout.reversedEdges,
      ),
    [layout.edges, layout.reversedEdges, nodeById],
  );

  const routingProfiles = useMemo(
    () => buildEdgeRoutingProfiles(logicalEdges, nodeById),
    [logicalEdges, nodeById],
  );

  return (
    <svg
      ref={ref}
      className="dependency-graph"
      width={width}
      height={height}
      viewBox={viewBox}
      role="img"
      aria-label="Dependency graph"
    >
      <defs>
        <EdgeArrowMarker id={graphEdgeArrowMarkerId()} />
        <EdgeArrowMarker id={graphEdgeArrowMarkerId("descendant")} />
        <EdgeArrowMarker id={graphEdgeArrowMarkerId("ancestor")} />
        <EdgeArrowMarker id={graphEdgeArrowMarkerId("highlighted")} />
      </defs>

      <g className="graph-edges">
        {logicalEdges.map((edge) => {
          const edgeKeyId = edgeKey(edge.from, edge.to);
          const routing = routingProfiles.get(edgeKeyId);
          if (!routing) return null;

          const visualState = resolveEdgeVisualState(
            focusVisual,
            edgeKeyId,
            issueOnly,
            issueHighlight,
          );
          const edgeZoneColorId = locationColorByModuleId?.get(edge.to);
          const issueSeverity = issueHighlight?.edgeKeys.has(edgeKeyId)
            ? issueHighlight.severity
            : null;

          return (
            <GraphEdge
              key={edgeKeyId}
              edge={edge}
              routing={routing}
              visualState={visualState}
              issueSeverity={issueSeverity}
              zoneColorId={edgeZoneColorId}
            />
          );
        })}
      </g>

      <g className="graph-nodes">
        {visibleNodes.map((node) => (
          <GraphNode
            key={node.id}
            node={node}
            visualState={resolveNodeVisualState(
              focusVisual,
              node.id,
              issueOnly,
              issueHighlight,
            )}
            issueSeverity={
              issueHighlight?.nodeIds.has(node.id) ? issueHighlight.severity : null
            }
            zoneColorId={locationColorByModuleId?.get(node.id)}
            barrelContentsVisible={
              expandedBarrelDirectories !== undefined &&
              node.kind === "barrel" &&
              (() => {
                const dir = barrelFolderFromNodeId(node.id);
                return dir !== null && expandedBarrelDirectories.has(dir);
              })()
            }
            onPointerDown={onNodePointerDown}
          />
        ))}
      </g>
    </svg>
  );
}));

function EdgeArrowMarker({ id }: { id: string }) {
  const tone = id.startsWith("graph-edge-arrow-")
    ? id.slice("graph-edge-arrow-".length)
    : "default";

  return (
    <marker
      id={id}
      className={`graph-edge-marker graph-edge-marker--${tone}`}
      viewBox="0 0 10 10"
      refX="9"
      refY="5"
      markerWidth="6"
      markerHeight="6"
      orient="auto-start-reverse"
    >
      <path d="M 0 0 L 10 5 L 0 10 z" />
    </marker>
  );
}

function resolveNodeVisualState(
  focusVisual: GraphFocusVisual | null | undefined,
  nodeId: string,
  issueOnly: boolean,
  issueHighlight: IssueHighlight | null,
): NodeVisualState {
  if (issueOnly && issueHighlight) {
    return issueHighlight.nodeIds.has(nodeId) ? "default" : "dimmed";
  }
  if (!focusVisual?.active) {
    return focusVisual?.nodeStateById.get(nodeId) ?? "default";
  }
  return focusVisual.nodeStateById.get(nodeId) ?? "dimmed";
}

function resolveEdgeVisualState(
  focusVisual: GraphFocusVisual | null | undefined,
  edgeKeyId: string,
  issueOnly: boolean,
  issueHighlight: IssueHighlight | null,
): EdgeVisualState {
  if (issueOnly && issueHighlight) {
    return issueHighlight.edgeKeys.has(edgeKeyId) ? "default" : "dimmed";
  }
  if (!focusVisual?.active) {
    return focusVisual?.edgeStateByKey.get(edgeKeyId) ?? "default";
  }
  return focusVisual.edgeStateByKey.get(edgeKeyId) ?? "dimmed";
}