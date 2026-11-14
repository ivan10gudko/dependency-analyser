import { describe, expect, it } from "vitest";

import type { ModuleDependencyGraph, NodeId } from "../graph-data/types";

import { breakCycles } from "./remove-cycles";

function graphOf(edges: [NodeId, NodeId][]): ModuleDependencyGraph {
  const nodes = new Map<NodeId, { id: NodeId; name: string; directory: string }>();
  const adjacencyList = new Map<NodeId, Set<NodeId>>();

  const ensureNode = (id: NodeId) => {
    if (!nodes.has(id)) {
      const slash = id.lastIndexOf("/");
      nodes.set(id, {
        id,
        name: slash < 0 ? id : id.slice(slash + 1),
        directory: slash < 0 ? "" : id.slice(0, slash),
      });
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

function hasDirectedCycle(adjacencyList: Map<NodeId, Set<NodeId>>, nodes: Set<NodeId>): boolean {
  const visited = new Set<NodeId>();
  const active = new Set<NodeId>();

  function visit(node: NodeId): boolean {
    visited.add(node);
    active.add(node);

    for (const target of adjacencyList.get(node) ?? []) {
      if (active.has(target)) return true;
      if (!visited.has(target) && visit(target)) return true;
    }

    active.delete(node);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node) && visit(node)) return true;
  }

  return false;
}

describe("breakCycles", () => {
  it("reverses the backedge from the Figure 6.2 example", () => {
    const graph = graphOf([
      ["A", "B"],
      ["A", "C"],
      ["B", "D"],
      ["C", "E"],
      ["C", "D"],
      ["D", "F"],
      ["F", "B"],
    ]);

    const acyclic = breakCycles(graph, "A");
    const neighbors = (id: NodeId) => [...(acyclic.adjacencyList.get(id) ?? [])];

    expect(neighbors("F")).not.toContain("B");
    expect(neighbors("B")).toContain("F");

    const nodeIds = new Set(acyclic.nodes.keys());
    expect(hasDirectedCycle(acyclic.adjacencyList, nodeIds)).toBe(false);
  });

  it("starts from root when every node has an incoming edge", () => {
    const graph = graphOf([
      ["A", "B"],
      ["B", "C"],
      ["C", "A"],
    ]);

    const acyclic = breakCycles(graph, "B");
    const nodeIds = new Set(acyclic.nodes.keys());

    expect(hasDirectedCycle(acyclic.adjacencyList, nodeIds)).toBe(false);
    expect(
      [...acyclic.adjacencyList.values()].reduce((sum, edges) => sum + edges.size, 0),
    ).toBe(3);
  });

  it("leaves an already acyclic graph unchanged", () => {
    const graph = graphOf([
      ["A", "B"],
      ["A", "C"],
      ["B", "D"],
    ]);

    const acyclic = breakCycles(graph, "A");

    expect(acyclic.adjacencyList.get("A")).toEqual(new Set(["B", "C"]));
    expect(acyclic.adjacencyList.get("B")).toEqual(new Set(["D"]));
  });
});