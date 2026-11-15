import { describe, expect, it } from "vitest";

import type { ModuleDependencyGraph } from "../../graph-data/types";
import { collectCycleBreaks } from "../collect-cycle-breaks";

function graph(
  nodes: string[],
  edges: [string, string][],
): ModuleDependencyGraph {
  const nodeMap = new Map(
    nodes.map((id) => [id, { id, name: id, directory: "." }]),
  );
  const adjacencyList = new Map<string, Set<string>>();
  for (const id of nodes) adjacencyList.set(id, new Set());
  for (const [from, to] of edges) {
    adjacencyList.get(from)!.add(to);
  }
  return { nodes: nodeMap, adjacencyList };
}

describe("collectCycleBreaks", () => {
  it("returns at least one break for a simple cycle", () => {
    const g = graph(["A", "B", "C"], [
      ["A", "B"],
      ["B", "C"],
      ["C", "A"],
    ]);
    const breaks = collectCycleBreaks(g, "A");
    expect(breaks.length).toBeGreaterThan(0);
    expect(breaks[0]).toMatchObject({
      from: expect.any(String),
      to: expect.any(String),
      note: "reversed for layout",
    });
  });

  it("returns empty for acyclic graph", () => {
    const g = graph(["A", "B", "C"], [
      ["A", "B"],
      ["B", "C"],
    ]);
    expect(collectCycleBreaks(g, "A")).toEqual([]);
  });
});