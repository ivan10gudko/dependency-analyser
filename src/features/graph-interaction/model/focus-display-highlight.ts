import {
  buildProxyToBarrelMap,
  mapModuleIdToDisplay,
  resolveDisplayFocusModuleId,
  type BarrelDisplayOptions,
} from "../../barrel-view";
import type { ModuleDependencyGraph } from "../../graph-data/types";
import type { ModuleId } from "../../project/types";

import { computeHighlightedNodeIds } from "./focus-neighborhood";
import type { ConnectivityDepth, NeighborhoodDirection } from "../types";

export function computeDisplayHighlightedNodeIds(
  canonical: ModuleDependencyGraph,
  display: ModuleDependencyGraph,
  focusId: ModuleId,
  depth: ConnectivityDepth,
  direction: NeighborhoodDirection,
  barrelOptions: BarrelDisplayOptions,
): Set<ModuleId> {
  const canonicalHighlighted = computeHighlightedNodeIds(
    canonical,
    focusId,
    depth,
    direction,
  );

  if (!barrelOptions.barrelViewEnabled) {
    const displayIds = new Set<ModuleId>();
    for (const id of canonicalHighlighted) {
      if (display.nodes.has(id)) displayIds.add(id);
    }
    return displayIds;
  }

  const proxyToBarrel = buildProxyToBarrelMap(canonical, barrelOptions);
  const displayFocusId = resolveDisplayFocusModuleId(focusId, canonical, barrelOptions);

  const displayHighlighted = new Set<ModuleId>();
  displayHighlighted.add(displayFocusId);

  for (const id of canonicalHighlighted) {
    const mapped = mapModuleIdToDisplay(id, canonical, barrelOptions, proxyToBarrel);
    if (display.nodes.has(mapped)) displayHighlighted.add(mapped);
  }

  return displayHighlighted;
}