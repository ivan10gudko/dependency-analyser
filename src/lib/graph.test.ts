import { describe, expect, it } from "vitest";

import {
  bfs,
  cloneAdjacencyList,
  dfs,
  inDegrees,
  neighborSet,
  neighborsFromAdjacencyList,
  predecessorsFromAdjacencyList,
} from "./graph";

const adjacency = new Map<string, string[]>([
  ["A", ["B", "C"]],
  ["B", ["D"]],
  ["C", ["D"]],
  ["D", []],
]);

const neighbors = neighborsFromAdjacencyList(adjacency);

describe("bfs", () => {
  it("visits nodes in breadth-first order", () => {
    expect(bfs({ start: "A", neighbors })).toEqual(["A", "B", "C", "D"]);
  });

  it("returns only the start when it has no outgoing edges", () => {
    expect(bfs({ start: "D", neighbors })).toEqual(["D"]);
  });

  it("handles cycles without revisiting nodes", () => {
    const cyclic = new Map<string, string[]>([
      ["A", ["B"]],
      ["B", ["C"]],
      ["C", ["A"]],
    ]);
    expect(
      bfs({ start: "A", neighbors: neighborsFromAdjacencyList(cyclic) }),
    ).toEqual(["A", "B", "C"]);
  });
});

describe("dfs", () => {
  it("visits nodes in depth-first pre-order", () => {
    expect(dfs({ start: "A", neighbors })).toEqual(["A", "B", "D", "C"]);
  });

  it("returns only the start when it has no outgoing edges", () => {
    expect(dfs({ start: "D", neighbors })).toEqual(["D"]);
  });

  it("handles cycles without revisiting nodes", () => {
    const cyclic = new Map<string, string[]>([
      ["A", ["B"]],
      ["B", ["C"]],
      ["C", ["A"]],
    ]);
    expect(
      dfs({ start: "A", neighbors: neighborsFromAdjacencyList(cyclic) }),
    ).toEqual(["A", "B", "C"]);
  });
});

describe("neighborsFromAdjacencyList", () => {
  it("returns an empty iterable for unknown nodes", () => {
    expect([...neighbors("missing")]).toEqual([]);
  });
});

describe("cloneAdjacencyList", () => {
  it("deep-copies neighbor sets", () => {
    const original = new Map([["A", new Set(["B"])]]);
    const copy = cloneAdjacencyList(original);
    copy.get("A")!.add("C");
    expect([...original.get("A")!]).toEqual(["B"]);
  });
});

describe("inDegrees", () => {
  it("counts incoming edges", () => {
    const adjacency = new Map([
      ["A", new Set(["B", "C"])],
      ["B", new Set(["C"])],
      ["C", new Set<string>()],
    ]);
    expect(inDegrees(["A", "B", "C"], adjacency)).toEqual(
      new Map([
        ["A", 0],
        ["B", 1],
        ["C", 2],
      ]),
    );
  });
});

describe("neighborSet", () => {
  it("creates an empty set for unknown nodes", () => {
    const adjacency = new Map<string, Set<string>>();
    neighborSet(adjacency, "A").add("B");
    expect(adjacency.get("A")).toEqual(new Set(["B"]));
  });
});

describe("predecessorsFromAdjacencyList", () => {
  it("maps each node to its incoming neighbors", () => {
    const adjacency = new Map([
      ["A", new Set(["B", "C"])],
      ["B", new Set(["C"])],
    ]);
    expect(predecessorsFromAdjacencyList(["A", "B", "C"], adjacency)).toEqual(
      new Map([
        ["A", new Set()],
        ["B", new Set(["A"])],
        ["C", new Set(["A", "B"])],
      ]),
    );
  });
});