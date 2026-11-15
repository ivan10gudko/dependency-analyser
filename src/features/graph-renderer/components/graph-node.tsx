import type { PointerEvent as ReactPointerEvent } from "react";

import type { LayoutRenderNode } from "../../hierarchical-graph-layout";
import type { NodeVisualState } from "../../graph-interaction";

export interface GraphNodeProps {
  node: LayoutRenderNode;
  visualState?: NodeVisualState;
  onPointerDown?: (event: ReactPointerEvent<SVGGElement>) => void;
}

export function GraphNode({ node, visualState = "default", onPointerDown }: GraphNodeProps) {
  if (node.isDummy) return null;

  const label = displayLabel(node);
  const className = classNames("graph-node", visualStateClass(visualState));

  return (
    <g
      className={className}
      transform={`translate(${node.x}, ${node.y})`}
      data-module-id={node.id}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        onPointerDown?.(event);
      }}
    >
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

function visualStateClass(state: NodeVisualState): string | undefined {
  if (state === "default") return undefined;
  return `graph-node--${state}`;
}

function classNames(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

function displayLabel(node: LayoutRenderNode): string {
  return node.label ?? node.id;
}