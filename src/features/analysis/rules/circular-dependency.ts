import type { ModuleDependencyGraph } from "../../graph-data/types";
import type { ModuleId } from "../../project/types";

import type { AnalysisEdge, AnalysisIssue, Analyzer } from "../types";

export const circularDependencyAnalyzer: Analyzer = {
  id: "circular-dependency",
  run({ graph }) {
    const issues: AnalysisIssue[] = [];
    for (const component of stronglyConnectedComponents(graph)) {
      if (component.length < 2) continue;
      issues.push(cycleIssue(graph, component));
    }
    return issues;
  },
};

export function stronglyConnectedComponents(graph: ModuleDependencyGraph): ModuleId[][] {
  const indexOf = new Map<ModuleId, number>();
  const lowLink = new Map<ModuleId, number>();
  const onStack = new Set<ModuleId>();
  const stack: ModuleId[] = [];
  const components: ModuleId[][] = [];
  let nextIndex = 0;

  const strongConnect = (node: ModuleId) => {
    indexOf.set(node, nextIndex);
    lowLink.set(node, nextIndex);
    nextIndex += 1;
    stack.push(node);
    onStack.add(node);

    for (const next of orderedNeighbors(graph, node)) {
      if (!indexOf.has(next)) {
        strongConnect(next);
        lowLink.set(node, Math.min(lowLink.get(node)!, lowLink.get(next)!));
      } else if (onStack.has(next)) {
        lowLink.set(node, Math.min(lowLink.get(node)!, indexOf.get(next)!));
      }
    }

    if (lowLink.get(node) !== indexOf.get(node)) return;

    const component: ModuleId[] = [];
    let member: ModuleId;
    do {
      member = stack.pop()!;
      onStack.delete(member);
      component.push(member);
    } while (member !== node);
    component.sort((left, right) => left.localeCompare(right));
    components.push(component);
  };

  const nodes = [...graph.nodes.keys()].sort((left, right) => left.localeCompare(right));
  for (const node of nodes) {
    if (!indexOf.has(node)) strongConnect(node);
  }
  components.sort((left, right) => left.join("|").localeCompare(right.join("|")));
  return components;
}

function cycleIssue(graph: ModuleDependencyGraph, component: readonly ModuleId[]): AnalysisIssue {
  const members = new Set(component);
  const path = cyclePath(graph, members);
  const listed = path.length > 1 ? path.join(" → ") : component.join(", ");
  return {
    id: `circular-dependency:${component.join("|")}`,
    ruleId: "circular-dependency",
    severity: "error",
    category: "circular-dependency",
    message: `Circular dependency: ${listed}`,
    moduleIds: [...component],
    edges: edgesInside(graph, members),
    primaryModuleId: component[0] ?? null,
  };
}

function cyclePath(graph: ModuleDependencyGraph, component: ReadonlySet<ModuleId>): ModuleId[] {
  const start = [...component].sort((left, right) => left.localeCompare(right))[0];
  if (!start) return [];

  const path: ModuleId[] = [];
  const onPath = new Set<ModuleId>();

  const walk = (node: ModuleId): ModuleId[] | null => {
    path.push(node);
    onPath.add(node);
    for (const next of orderedNeighbors(graph, node)) {
      if (!component.has(next)) continue;
      if (next === start && path.length > 1) return [...path, start];
      if (onPath.has(next)) continue;
      const found = walk(next);
      if (found) return found;
    }
    path.pop();
    onPath.delete(node);
    return null;
  };

  return walk(start) ?? [...component];
}

function edgesInside(
  graph: ModuleDependencyGraph,
  component: ReadonlySet<ModuleId>,
): AnalysisEdge[] {
  const edges: AnalysisEdge[] = [];
  const sources = [...component].sort((left, right) => left.localeCompare(right));
  for (const from of sources) {
    for (const to of orderedNeighbors(graph, from)) {
      if (!component.has(to)) continue;
      edges.push({ from, to });
    }
  }
  return edges;
}

function orderedNeighbors(graph: ModuleDependencyGraph, node: ModuleId): ModuleId[] {
  const neighbors = graph.adjacencyList.get(node);
  if (!neighbors) return [];
  const existing: ModuleId[] = [];
  for (const next of neighbors) {
    if (graph.nodes.has(next)) existing.push(next);
  }
  existing.sort((left, right) => left.localeCompare(right));
  return existing;
}
