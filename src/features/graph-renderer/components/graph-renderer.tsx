import { useMemo, type PointerEvent as ReactPointerEvent } from "react";

import { barrelFolderFromNodeId } from "../../barrel-view";
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
import { buildLogicalEdges } from "../utils/logical-edges";

export interface GraphRendererProps {
  layout: LayoutRenderModel;
  padding?: number;
  viewBox?: string;
  fillContainer?: boolean;
  focusVisual?: GraphFocusVisual | null;
  locationColorByModuleId?: ReadonlyMap<string, LocationColorId> | null;
  expandedBarrelDirectories?: ReadonlySet<string>;
  onNodePointerDown?: (event: ReactPointerEvent<SVGGElement>) => void;
}

export function GraphRenderer({
  layout,
  padding,
  viewBox: viewBoxProp,
  fillContainer = false,
  focusVisual = null,
  locationColorByModuleId = null,
  expandedBarrelDirectories,
  onNodePointerDown,
}: GraphRendererProps) {
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
    () => buildLogicalEdges(layout.edges, nodeById),
    [layout.edges, nodeById],
  );

  const routingProfiles = useMemo(
    () => buildEdgeRoutingProfiles(logicalEdges, nodeById),
    [logicalEdges, nodeById],
  );

  const arrowMarkerId = graphEdgeArrowMarkerId();

  return (
    <svg
      className="dependency-graph"
      width={width}
      height={height}
      viewBox={viewBox}
      role="img"
      aria-label="Dependency graph"
    >
      <defs>
        <marker
          id={arrowMarkerId}
          className="graph-edge-marker"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" />
        </marker>
      </defs>

      <g className="graph-edges">
        {logicalEdges.map((edge) => {
          const edgeKeyId = edgeKey(edge.from, edge.to);
          const routing = routingProfiles.get(edgeKeyId);
          if (!routing) return null;

          const visualState = resolveEdgeVisualState(focusVisual, edgeKeyId);
          const edgeZoneColorId = locationColorByModuleId?.get(edge.to);

          return (
            <GraphEdge
              key={edgeKeyId}
              edge={edge}
              routing={routing}
              visualState={visualState}
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
            visualState={resolveNodeVisualState(focusVisual, node.id)}
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
}

function resolveNodeVisualState(
  focusVisual: GraphFocusVisual | null | undefined,
  nodeId: string,
): NodeVisualState {
  if (!focusVisual?.active) {
    return focusVisual?.nodeStateById.get(nodeId) ?? "default";
  }
  return focusVisual.nodeStateById.get(nodeId) ?? "dimmed";
}

function resolveEdgeVisualState(
  focusVisual: GraphFocusVisual | null | undefined,
  edgeKeyId: string,
): EdgeVisualState {
  if (!focusVisual?.active) {
    return focusVisual?.edgeStateByKey.get(edgeKeyId) ?? "default";
  }
  return focusVisual.edgeStateByKey.get(edgeKeyId) ?? "dimmed";
}