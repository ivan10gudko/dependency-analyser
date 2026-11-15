import type { LayoutRenderNode } from "../../hierarchical-graph-layout";

export interface GraphNodeProps {
  node: LayoutRenderNode;
}

export function GraphNode({ node }: GraphNodeProps) {
  if (node.isDummy) return null;

  const label = displayLabel(node);

  return (
    <g className="graph-node" transform={`translate(${node.x}, ${node.y})`}>
      <rect
        className="graph-node-box"
        width={node.width}
        height={node.height}
        rx={4}
        ry={4}
      />
      <text
        className="graph-node-label"
        x={node.width / 2}
        y={node.height / 2}
        dominantBaseline="middle"
        textAnchor="middle"
      >
        {label}
      </text>
    </g>
  );
}

function displayLabel(node: LayoutRenderNode): string {
  return node.label ?? node.id;
}
