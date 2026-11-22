import {
  buildNeighborhoodFocusVisual,
  computeDirectionalNeighborhood,
} from "../graph-interaction/model/focus-neighborhood";
import type {
  ConnectivityDepth,
  GraphFocusVisual,
  NeighborhoodDirection,
} from "../graph-interaction/types";
import type { ModuleDependencyGraph } from "../graph-data/types";
import type { ModuleId } from "../project/types";

import {
  buildProxyToBarrelMap,
  mapModuleIdToDisplay,
  resolveDisplayFocusModuleId,
} from "./build-barrel-display-graph";
import type { BarrelDisplayOptions } from "./types";

export function buildBarrelAwareFocusVisual(
  canonical: ModuleDependencyGraph | null,
  display: ModuleDependencyGraph | null,
  focusedModuleId: ModuleId | null,
  options: BarrelDisplayOptions,
  depth: ConnectivityDepth,
  direction: NeighborhoodDirection,
): GraphFocusVisual | null {
  if (!display || !canonical || focusedModuleId === null) return null;

  const neighborhood = computeDirectionalNeighborhood(
    canonical,
    focusedModuleId,
    depth,
    direction,
  );

  if (!options.barrelViewEnabled) {
    return buildNeighborhoodFocusVisual(
      display,
      focusedModuleId,
      neighborhood.descendants,
      neighborhood.ancestors,
    );
  }

  const displayFocusId = resolveDisplayFocusModuleId(
    focusedModuleId,
    canonical,
    options,
  );
  const proxyToBarrel = buildProxyToBarrelMap(canonical, options);
  const descendants = mapNeighborhoodToDisplay(
    neighborhood.descendants,
    canonical,
    options,
    proxyToBarrel,
    display,
  );
  const ancestors = mapNeighborhoodToDisplay(
    neighborhood.ancestors,
    canonical,
    options,
    proxyToBarrel,
    display,
  );
  descendants.add(displayFocusId);
  ancestors.add(displayFocusId);

  return buildNeighborhoodFocusVisual(display, displayFocusId, descendants, ancestors);
}

function mapNeighborhoodToDisplay(
  ids: ReadonlySet<ModuleId>,
  canonical: ModuleDependencyGraph,
  options: BarrelDisplayOptions,
  proxyToBarrel: ReturnType<typeof buildProxyToBarrelMap>,
  display: ModuleDependencyGraph,
): Set<ModuleId> {
  const mapped = new Set<ModuleId>();
  for (const id of ids) {
    const displayId = mapModuleIdToDisplay(id, canonical, options, proxyToBarrel);
    if (display.nodes.has(displayId)) mapped.add(displayId);
  }
  return mapped;
}