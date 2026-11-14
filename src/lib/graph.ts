export type NeighborsOf<T> = (node: T) => Iterable<T>;

export interface TraverseOptions<T> {
  start: T;
  neighbors: NeighborsOf<T>;
}

export function bfs<T>({ start, neighbors }: TraverseOptions<T>): T[] {
  const order: T[] = [];
  const visited = new Set<T>([start]);
  const queue: T[] = [start];

  while (queue.length > 0) {
    const node = queue.shift()!;
    order.push(node);

    for (const next of neighbors(node)) {
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push(next);
    }
  }

  return order;
}

export function dfs<T>({ start, neighbors }: TraverseOptions<T>): T[] {
  const order: T[] = [];
  const visited = new Set<T>();
  const stack: T[] = [start];

  while (stack.length > 0) {
    const node = stack.pop()!;
    if (visited.has(node)) continue;
    visited.add(node);
    order.push(node);

    const nextNodes = [...neighbors(node)];
    for (let index = nextNodes.length - 1; index >= 0; index -= 1) {
      stack.push(nextNodes[index]!);
    }
  }

  return order;
}

// Adapter for graphs stored as `Map<node, neighbors>`.
export function neighborsFromAdjacencyList<T>(
  adjacencyList: ReadonlyMap<T, Iterable<T>>,
): NeighborsOf<T> {
  return (node) => adjacencyList.get(node) ?? [];
}

export function cloneAdjacencyList<T>(
  adjacencyList: Map<T, Set<T>>,
): Map<T, Set<T>> {
  const copy = new Map<T, Set<T>>();
  for (const [node, neighbors] of adjacencyList) {
    copy.set(node, new Set(neighbors));
  }
  return copy;
}

// In-degree per node for a directed graph in adjacency-list form.
export function inDegrees<T>(
  nodes: Iterable<T>,
  adjacencyList: ReadonlyMap<T, Iterable<T>>,
): Map<T, number> {
  const degree = new Map<T, number>();
  for (const node of nodes) degree.set(node, 0);

  for (const targets of adjacencyList.values()) {
    for (const target of targets) {
      degree.set(target, (degree.get(target) ?? 0) + 1);
    }
  }

  return degree;
}

// Reverse adjacency list: target → set of predecessors.
export function predecessorsFromAdjacencyList<T>(
  nodes: Iterable<T>,
  adjacencyList: ReadonlyMap<T, Iterable<T>>,
): Map<T, Set<T>> {
  const predecessors = new Map<T, Set<T>>();
  for (const node of nodes) predecessors.set(node, new Set());

  for (const [from, targets] of adjacencyList) {
    for (const to of targets) {
      neighborSet(predecessors, to).add(from);
    }
  }

  return predecessors;
}

// Mutable outgoing-neighbor set for `node`, created when missing.
export function neighborSet<T>(
  adjacencyList: Map<T, Set<T>>,
  node: T,
): Set<T> {
  let neighbors = adjacencyList.get(node);
  if (!neighbors) {
    neighbors = new Set();
    adjacencyList.set(node, neighbors);
  }
  return neighbors;
}