import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";

import {
  buildBarrelAwareFocusVisual,
  buildBarrelDisplayGraph,
  detectBarrelFolders,
  isModuleHiddenInBarrelView,
  resolveDisplayFocusModuleId,
  barrelFolderFromNodeId,
} from "../barrel-view";
import type { ModuleDependencyGraph } from "../graph-data/types";
import type { ModuleFileStats } from "../project/module-file-stats";
import { directoryOf } from "../../lib/path";
import type { ModuleId } from "../project/types";

import {
  createInitialGraphInteractionState,
  graphInteractionReducer,
  type GraphInteractionAction,
} from "./graph-interaction-reducer";
import { linkListsForModule } from "./model/module-links";
import type { ConnectivityDepth, GraphInteractionValue, NeighborhoodDirection } from "./types";

const GraphInteractionContext = createContext<GraphInteractionValue | null>(null);
const GraphInteractionDispatchContext = createContext<
  ((action: GraphInteractionAction) => void) | null
>(null);

export interface GraphInteractionProviderProps {
  dependencyGraph: ModuleDependencyGraph | null;
  moduleFileStats: ReadonlyMap<ModuleId, ModuleFileStats>;
  projectRootAbsolute: string | null;
  projectKey: string | null;
  children: ReactNode;
}

export function GraphInteractionProvider({
  dependencyGraph,
  moduleFileStats,
  projectRootAbsolute,
  projectKey,
  children,
}: GraphInteractionProviderProps) {
  const [state, dispatch] = useReducer(
    graphInteractionReducer,
    undefined,
    createInitialGraphInteractionState,
  );

  useEffect(() => {
    dispatch({ type: "RESET" });
  }, [projectKey]);

  const barrelDisplayOptions = useMemo(
    () => ({
      barrelViewEnabled: state.barrelViewEnabled,
      expandedDirectories: state.expandedBarrelDirectories,
    }),
    [state.barrelViewEnabled, state.expandedBarrelDirectories],
  );

  const displayGraph = useMemo<ModuleDependencyGraph | null>(() => {
    if (!dependencyGraph) return null;
    return buildBarrelDisplayGraph(dependencyGraph, barrelDisplayOptions);
  }, [dependencyGraph, barrelDisplayOptions]);

  const displayFocusModuleId = useMemo(() => {
    if (!dependencyGraph || state.focusedModuleId === null) return null;
    return resolveDisplayFocusModuleId(
      state.focusedModuleId,
      dependencyGraph,
      barrelDisplayOptions,
    );
  }, [dependencyGraph, state.focusedModuleId, barrelDisplayOptions]);

  const focusVisual = useMemo(
    () =>
      buildBarrelAwareFocusVisual(
        dependencyGraph,
        displayGraph,
        state.focusedModuleId,
        barrelDisplayOptions,
        state.connectivityDepth,
        state.neighborhoodDirection,
      ),
    [
      dependencyGraph,
      displayGraph,
      state.focusedModuleId,
      barrelDisplayOptions,
      state.connectivityDepth,
      state.neighborhoodDirection,
    ],
  );

  const { dependencies, dependents } = useMemo(() => {
    if (!dependencyGraph || state.focusedModuleId === null) {
      return { dependencies: [], dependents: [] };
    }
    return linkListsForModule(dependencyGraph, state.focusedModuleId);
  }, [dependencyGraph, state.focusedModuleId]);

  const focusModule = useCallback(
    (id: ModuleId) => {
      if (dependencyGraph && state.barrelViewEnabled) {
        const dir = directoryOf(id);
        const folder = detectBarrelFolders(dependencyGraph).get(dir);
        if (folder?.indexModuleId === id) {
          dispatch({ type: "EXPAND_BARREL", directory: folder.directory });
        } else if (isModuleHiddenInBarrelView(id, dependencyGraph, barrelDisplayOptions)) {
          dispatch({ type: "EXPAND_BARREL", directory: dir });
        }
      }
      dispatch({ type: "FOCUS", id });
    },
    [dependencyGraph, state.barrelViewEnabled, barrelDisplayOptions],
  );

  const clearFocus = useCallback(() => dispatch({ type: "CLEAR" }), []);

  const setConnectivityDepth = useCallback(
    (depth: ConnectivityDepth) => dispatch({ type: "SET_DEPTH", depth }),
    [],
  );

  const setNeighborhoodDirection = useCallback(
    (direction: NeighborhoodDirection) => dispatch({ type: "SET_DIRECTION", direction }),
    [],
  );

  const setBarrelViewEnabled = useCallback(
    (enabled: boolean) => dispatch({ type: "SET_BARREL_VIEW", enabled }),
    [],
  );

  const toggleBarrelExpand = useCallback((barrelNodeId: string) => {
    const directory = barrelFolderFromNodeId(barrelNodeId);
    if (!directory) return;
    dispatch({ type: "TOGGLE_BARREL_EXPAND", directory });
  }, []);

  const value = useMemo<GraphInteractionValue>(
    () => ({
      focusedModuleId: state.focusedModuleId,
      displayFocusModuleId: displayFocusModuleId,
      connectivityDepth: state.connectivityDepth,
      neighborhoodDirection: state.neighborhoodDirection,
      barrelViewEnabled: state.barrelViewEnabled,
      expandedBarrelDirectories: state.expandedBarrelDirectories,
      focusVisual,
      displayGraph,
      dependencies,
      dependents,
      moduleFileStats,
      projectRootAbsolute,
      focusModule,
      clearFocus,
      setConnectivityDepth,
      setNeighborhoodDirection,
      setBarrelViewEnabled,
      toggleBarrelExpand,
    }),
    [
      state.focusedModuleId,
      displayFocusModuleId,
      state.connectivityDepth,
      state.neighborhoodDirection,
      state.barrelViewEnabled,
      state.expandedBarrelDirectories,
      focusVisual,
      displayGraph,
      dependencies,
      dependents,
      moduleFileStats,
      projectRootAbsolute,
      focusModule,
      clearFocus,
      setConnectivityDepth,
      setNeighborhoodDirection,
      setBarrelViewEnabled,
      toggleBarrelExpand,
    ],
  );

  return (
    <GraphInteractionDispatchContext.Provider value={dispatch}>
      <GraphInteractionContext.Provider value={value}>{children}</GraphInteractionContext.Provider>
    </GraphInteractionDispatchContext.Provider>
  );
}

export function useGraphInteraction(): GraphInteractionValue {
  const value = useContext(GraphInteractionContext);
  if (!value) {
    throw new Error("useGraphInteraction must be used within GraphInteractionProvider");
  }
  return value;
}