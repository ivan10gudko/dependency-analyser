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
import { excludeModules } from "../graph-filters";
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
    dispatch({ type: "RESET", projectKey });
  }, [projectKey]);

  const barrelDisplayOptions = useMemo(
    () => ({
      barrelViewEnabled: state.barrelViewEnabled,
      expandedDirectories: state.expandedBarrelDirectories,
    }),
    [state.barrelViewEnabled, state.expandedBarrelDirectories],
  );

  const filteredGraph = useMemo<ModuleDependencyGraph | null>(() => {
    if (!dependencyGraph) return null;
    return excludeModules(dependencyGraph, {
      showTestFiles: state.showTestFiles,
      folderMasks: state.folderMasks,
      fileMasks: state.fileMasks,
    });
  }, [dependencyGraph, state.showTestFiles, state.folderMasks, state.fileMasks]);

  const displayGraph = useMemo<ModuleDependencyGraph | null>(() => {
    if (!filteredGraph) return null;
    return buildBarrelDisplayGraph(filteredGraph, barrelDisplayOptions);
  }, [filteredGraph, barrelDisplayOptions]);

  const focusedModuleIsVisible =
    filteredGraph != null &&
    state.focusedModuleId != null &&
    filteredGraph.nodes.has(state.focusedModuleId);

  const displayFocusModuleId = useMemo(() => {
    if (!filteredGraph || state.focusedModuleId === null || !focusedModuleIsVisible) return null;
    return resolveDisplayFocusModuleId(
      state.focusedModuleId,
      filteredGraph,
      barrelDisplayOptions,
    );
  }, [filteredGraph, state.focusedModuleId, focusedModuleIsVisible, barrelDisplayOptions]);

  const focusVisual = useMemo(() => {
    if (!filteredGraph || !displayGraph || state.focusedModuleId === null || !focusedModuleIsVisible) {
      return null;
    }
    return buildBarrelAwareFocusVisual(
      filteredGraph,
      displayGraph,
      state.focusedModuleId,
      barrelDisplayOptions,
      state.connectivityDepth,
      state.neighborhoodDirection,
    );
  }, [
    filteredGraph,
    displayGraph,
    state.focusedModuleId,
    focusedModuleIsVisible,
    barrelDisplayOptions,
    state.connectivityDepth,
    state.neighborhoodDirection,
  ]);

  const { dependencies, dependents } = useMemo(() => {
    if (!dependencyGraph || state.focusedModuleId === null) {
      return { dependencies: [], dependents: [] };
    }
    return linkListsForModule(dependencyGraph, state.focusedModuleId);
  }, [dependencyGraph, state.focusedModuleId]);

  const moduleIds = useMemo(
    () =>
      dependencyGraph
        ? [...dependencyGraph.nodes.keys()].sort((left, right) => left.localeCompare(right))
        : [],
    [dependencyGraph],
  );

  const focusModule = useCallback(
    (id: ModuleId) => {
      if (filteredGraph && state.barrelViewEnabled) {
        const dir = directoryOf(id);
        const folder = detectBarrelFolders(filteredGraph).get(dir);
        if (folder?.indexModuleId === id) {
          dispatch({ type: "EXPAND_BARREL", directory: folder.directory });
        } else if (isModuleHiddenInBarrelView(id, filteredGraph, barrelDisplayOptions)) {
          dispatch({ type: "EXPAND_BARREL", directory: dir });
        }
      }
      dispatch({ type: "FOCUS", id });
    },
    [filteredGraph, state.barrelViewEnabled, barrelDisplayOptions],
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

  const setShowTestFiles = useCallback(
    (enabled: boolean) => dispatch({ type: "SET_SHOW_TEST_FILES", enabled }),
    [],
  );

  const addFolderMasks = useCallback(
    (masks: readonly string[]) => dispatch({ type: "ADD_FOLDER_MASKS", masks }),
    [],
  );

  const removeFolderMask = useCallback(
    (mask: string) => dispatch({ type: "REMOVE_FOLDER_MASK", mask }),
    [],
  );

  const addFileMasks = useCallback(
    (masks: readonly string[]) => dispatch({ type: "ADD_FILE_MASKS", masks }),
    [],
  );

  const removeFileMask = useCallback(
    (mask: string) => dispatch({ type: "REMOVE_FILE_MASK", mask }),
    [],
  );

  const value = useMemo<GraphInteractionValue>(
    () => ({
      focusedModuleId: state.focusedModuleId,
      displayFocusModuleId: displayFocusModuleId,
      connectivityDepth: state.connectivityDepth,
      neighborhoodDirection: state.neighborhoodDirection,
      barrelViewEnabled: state.barrelViewEnabled,
      expandedBarrelDirectories: state.expandedBarrelDirectories,
      showTestFiles: state.showTestFiles,
      folderMasks: state.folderMasks,
      fileMasks: state.fileMasks,
      moduleIds,
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
      setShowTestFiles,
      addFolderMasks,
      removeFolderMask,
      addFileMasks,
      removeFileMask,
    }),
    [
      state.focusedModuleId,
      displayFocusModuleId,
      state.connectivityDepth,
      state.neighborhoodDirection,
      state.barrelViewEnabled,
      state.expandedBarrelDirectories,
      state.showTestFiles,
      state.folderMasks,
      state.fileMasks,
      moduleIds,
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
      setShowTestFiles,
      addFolderMasks,
      removeFolderMask,
      addFileMasks,
      removeFileMask,
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