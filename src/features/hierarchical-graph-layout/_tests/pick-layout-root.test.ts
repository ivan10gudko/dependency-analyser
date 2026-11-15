import { describe, expect, it } from "vitest";

import type { ModuleDependencyGraph, NodeId } from "../../graph-data/types";

import { pickLayoutRoot } from "../layout-render-model";

function graphOf(edges: [NodeId, NodeId][]): ModuleDependencyGraph {
  const nodes = new Map<NodeId, { id: NodeId; name: string; directory: string }>();
  const adjacencyList = new Map<NodeId, Set<NodeId>>();

  const ensureNode = (id: NodeId) => {
    if (!nodes.has(id)) {
      nodes.set(id, { id, name: id, directory: "" });
    }
    if (!adjacencyList.has(id)) adjacencyList.set(id, new Set());
  };

  for (const [from, to] of edges) {
    ensureNode(from);
    ensureNode(to);
    adjacencyList.get(from)!.add(to);
  }

  return { nodes, adjacencyList };
}

describe("pickLayoutRoot", () => {
  it("does not pick declaration stubs with no subtree", () => {
    const graph = graphOf([
      ["next-env.d.ts", "types.ts"],
      ["src/main.tsx", "app.tsx"],
      ["app.tsx", "types.ts"],
    ]);

    expect(pickLayoutRoot(graph)).toBe("src/main.tsx");
  });

  it("selects the source with the largest reachable subtree", () => {
    const graph = graphOf([
      ["island.ts", "lib.ts"],
      ["hub.ts", "a.ts"],
      ["hub.ts", "b.ts"],
      ["hub.ts", "c.ts"],
    ]);

    expect(pickLayoutRoot(graph)).toBe("hub.ts");
  });
});