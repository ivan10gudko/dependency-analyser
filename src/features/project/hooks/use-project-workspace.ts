import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

import {
  collectCycleBreaks,
  type CycleBreak,
} from "../../architecture-problems";
import { ConfigurationAnalyser } from "../../configuration-analyser";
import { buildModuleDependencyGraphFromAnalysis } from "../../graph-data";
import {
  buildHierarchicalLayout,
  type LayoutRenderModel,
  type LayoutScopeSummary,
} from "../../hierarchical-graph-layout";
import { buildModuleFileStatsMap, type ModuleFileStats } from "../module-file-stats";
import { toProjectFile } from "../file";
import type { ModuleId } from "../types";
import type { ProjectAnalysis } from "../types";
import type { InvokeError, LoadingState, ProjectWorkspace } from "../types/workspace";
import type { ModuleDependencyGraph } from "../../graph-data/types";
import { analyzeProject } from "../../source-analyser/model";

const configurationAnalyser = new ConfigurationAnalyser();

type FileInfo = {
  name: string;
  path: string;
};

type ProjectRoot = {
  rootPath: string;
};

export function useProjectWorkspace(): ProjectWorkspace {
  const [projectRootAbsolute, setProjectRootAbsolute] = useState<string | null>(null);
  const [fileModuleIds, setFileModuleIds] = useState<string[]>([]);
  const [moduleFileStats, setModuleFileStats] = useState<ReadonlyMap<ModuleId, ModuleFileStats>>(
    new Map(),
  );
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null);
  const [dependencyGraph, setDependencyGraph] = useState<ModuleDependencyGraph | null>(null);
  const [layoutModel, setLayoutModel] = useState<LayoutRenderModel | null>(null);
  const [layoutScope, setLayoutScope] = useState<LayoutScopeSummary | null>(null);
  const [cycleBreaks, setCycleBreaks] = useState<CycleBreak[]>([]);
  const [layoutError, setLayoutError] = useState<string | null>(null);
  const [error, setError] = useState<InvokeError | null>(null);
  const [loading, setLoading] = useState<LoadingState>("idle");

  const resetWorkspace = useCallback(() => {
    setProjectRootAbsolute(null);
    setFileModuleIds([]);
    setModuleFileStats(new Map());
    setAnalysis(null);
    setDependencyGraph(null);
    setLayoutModel(null);
    setLayoutScope(null);
    setCycleBreaks([]);
    setLayoutError(null);
    setError(null);
  }, []);

  const closeProject = useCallback(() => {
    resetWorkspace();
    setLoading("idle");
  }, [resetWorkspace]);

  const openProject = useCallback(async () => {
    setError(null);
    setAnalysis(null);
    setDependencyGraph(null);
    setLayoutModel(null);
    setLayoutScope(null);
    setCycleBreaks([]);
    setLayoutError(null);
    setProjectRootAbsolute(null);
    setFileModuleIds([]);
    setModuleFileStats(new Map());
    setLoading("picking");

    try {
      const picked = await invoke<ProjectRoot>("pick_project_folder");
      setProjectRootAbsolute(picked.rootPath);

      const config = await configurationAnalyser.load(picked.rootPath, {
        readText: (filePath) => invoke<string>("read_file", { path: filePath }),
      });

      setLoading("scanning");
      const listed = await invoke<FileInfo[]>("list_project_files");

      setLoading("reading");
      const paths = listed.map((entry) => entry.path);
      const contents = await invoke<string[]>("read_file_concurrently", { paths });
      const projectFiles = listed.map((entry, index) =>
        toProjectFile(entry.path, contents[index], picked.rootPath),
      );
      const moduleIds = projectFiles.map((file) => file.path);
      setFileModuleIds(moduleIds);
      setModuleFileStats(buildModuleFileStatsMap(projectFiles));

      setLoading("analyzing");
      const projectAnalysis = await analyzeProject(projectFiles, {
        rootPathAbsolute: picked.rootPath,
        config,
      });
      setAnalysis(projectAnalysis);

      const graph = buildModuleDependencyGraphFromAnalysis(projectAnalysis);
      setDependencyGraph(graph);

      try {
        const layout = buildHierarchicalLayout(graph);
        setLayoutModel(layout.model);
        setLayoutScope(layout.scope);
        setCycleBreaks(collectCycleBreaks(graph, layout.scope.root));
      } catch (layoutErr) {
        setLayoutModel(null);
        setLayoutScope(null);
        setCycleBreaks(collectCycleBreaks(graph, graph.nodes.keys().next().value ?? ""));
        setLayoutError(
          layoutErr instanceof Error ? layoutErr.message : "Could not build layout",
        );
      }
    } catch (e) {
      resetWorkspace();
      setError(e as InvokeError);
    } finally {
      setLoading("idle");
    }
  }, [resetWorkspace]);

  return {
    projectRootAbsolute,
    fileModuleIds,
    moduleFileStats,
    analysis,
    dependencyGraph,
    layoutModel,
    layoutScope,
    cycleBreaks,
    layoutError,
    error,
    loading,
    isBusy: loading !== "idle",
    openProject,
    closeProject,
  };
}