import { containsGlob, pathMatchesMask } from "../../graph-filters";
import type { ModuleId } from "../../project/types";

import type { ArchitectureLayer } from "../types";

const FSD_LAYERS: readonly ArchitectureLayer[] = [
  { name: "shared", mask: "**/shared/**", sliced: false },
  { name: "entities", mask: "**/entities/**", sliced: true },
  { name: "features", mask: "**/features/**", sliced: true },
  { name: "widgets", mask: "**/widgets/**", sliced: true },
  { name: "processes", mask: "**/processes/**", sliced: true },
  { name: "pages", mask: "**/pages/**", sliced: true },
  { name: "app", mask: "**/app/**", sliced: false },
];

export function fsdLayerPreset(): ArchitectureLayer[] {
  return FSD_LAYERS.map((layer) => ({ ...layer }));
}

export interface LayerPlacement {
  layer: string;
  rank: number;
  slice: string | null;
}

export function locateModuleLayer(
  moduleId: ModuleId,
  layers: readonly ArchitectureLayer[],
): LayerPlacement | null {
  const directories = moduleId.split("/").slice(0, -1);
  let best: ScoredPlacement | null = null;

  for (let rank = 0; rank < layers.length; rank += 1) {
    const layer = layers[rank]!;
    if (!pathMatchesMask(layer.mask, moduleId)) continue;
    const anchor = layerAnchor(layer.mask);
    const depth = anchorDepth(directories, anchor);
    const slice = layer.sliced && depth >= 0 ? (directories[depth + 1] ?? null) : null;
    const candidate: ScoredPlacement = {
      layer: layer.name,
      rank,
      slice,
      depth,
      anchorLength: anchor.length,
    };
    if (!best || outranks(candidate, best)) best = candidate;
  }

  if (!best) return null;
  return { layer: best.layer, rank: best.rank, slice: best.slice };
}

interface ScoredPlacement extends LayerPlacement {
  depth: number;
  anchorLength: number;
}

function outranks(candidate: ScoredPlacement, current: ScoredPlacement): boolean {
  if (candidate.depth !== current.depth) return candidate.depth > current.depth;
  return candidate.anchorLength > current.anchorLength;
}

/** Concrete path segments that identify the layer folder, ignoring leading and trailing globs. */
function layerAnchor(mask: string): string[] {
  const segments = mask
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .filter((segment) => segment.length > 0);
  let start = 0;
  let end = segments.length;
  if (segments[start] === "**") start += 1;
  if (end > start && (segments[end - 1] === "**" || segments[end - 1] === "*")) end -= 1;

  const concrete: string[] = [];
  for (let index = end - 1; index >= start; index -= 1) {
    const segment = segments[index]!;
    if (containsGlob(segment)) break;
    concrete.unshift(segment);
  }
  return concrete;
}

function anchorDepth(directories: readonly string[], anchor: readonly string[]): number {
  if (anchor.length === 0) return -1;
  const start = indexOfSequence(directories, anchor);
  if (start < 0) return -1;
  return start + anchor.length - 1;
}

function indexOfSequence(directories: readonly string[], anchor: readonly string[]): number {
  const lastStart = directories.length - anchor.length;
  for (let index = 0; index <= lastStart; index += 1) {
    let matches = true;
    for (let offset = 0; offset < anchor.length; offset += 1) {
      if (directories[index + offset] !== anchor[offset]) {
        matches = false;
        break;
      }
    }
    if (matches) return index;
  }
  return -1;
}
