import { useMemo } from "react";

import type { LayoutRenderModel } from "../../hierarchical-graph-layout";

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
}

export function GraphRenderer({
  layout,
  padding,
  viewBox: viewBoxProp,
  fillContainer = false,
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
          const edgeKey = `${edge.from}\u2192${edge.to}`;
          const routing = routingProfiles.get(edgeKey);
          if (!routing) return null;

          return <GraphEdge key={edgeKey} edge={edge} routing={routing} />;
        })}
      </g>

      <g className="graph-nodes">
        {visibleNodes.map((node) => (
          <GraphNode key={node.id} node={node} />
        ))}
      </g>
    </svg>
  );
}