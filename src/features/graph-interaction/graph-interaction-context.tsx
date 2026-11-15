import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";

import type { ModuleDependencyGraph } from "../graph-data/types";
import type { ModuleFileStats } from "../project/module-file-stats";
import type { ModuleId } from "../project/types";

import {
  createInitialGraphInteractionState,
  graphInteractionReducer,
  type GraphInteractionAction,
} from "./graph-interaction-reducer";
import { buildFocusVisual } from "./model/focus-neighborhood";
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

  const focusVisual = useMemo(
    () =>
      buildFocusVisual(
        dependencyGraph,
        state.focusedModuleId,
        state.connectivityDepth,
        state.neighborhoodDirection,
      ),
    [
      dependencyGraph,
      state.focusedModuleId,
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
    (id: ModuleId) => dispatch({ type: "FOCUS", id }),
    [],
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

  const value = useMemo<GraphInteractionValue>(
    () => ({
      focusedModuleId: state.focusedModuleId,
      connectivityDepth: state.connectivityDepth,
      neighborhoodDirection: state.neighborhoodDirection,
      focusVisual,
      dependencies,
      dependents,
      moduleFileStats,
      projectRootAbsolute,
      focusModule,
      clearFocus,
      setConnectivityDepth,
      setNeighborhoodDirection,
    }),
    [
      state.focusedModuleId,
      state.connectivityDepth,
      state.neighborhoodDirection,
      focusVisual,
      dependencies,
      dependents,
      moduleFileStats,
      projectRootAbsolute,
      focusModule,
      clearFocus,
      setConnectivityDepth,
      setNeighborhoodDirection,
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