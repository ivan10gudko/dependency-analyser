import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { ConfigurationAnalyser } from "./features/configuration-analyser";
import { buildModuleDependencyGraphFromAnalysis } from "./features/graph-data";
import { GraphViewport } from "./features/graph-renderer";
import {
  buildHierarchicalLayout,
  type LayoutRenderModel,
  type LayoutScopeSummary,
} from "./features/hierarchical-graph-layout";
import { toProjectFile } from "./features/project/file";
import type { ProjectAnalysis } from "./features/project/types";
import { analyzeProject } from "./features/source-analyser/model";

const configurationAnalyser = new ConfigurationAnalyser();

type FileInfo = {
  name: string;
  path: string;
};

type ProjectRoot = {
  rootPath: string;
};

type InvokeError = {
  kind:
    | "io"
    | "utf8"
    | "dialogCancelled"
    | "fs"
    | "projectRootNotSet"
    | "pathOutsideProject"
    | "notAFile";
  message: string;
};

type LoadingState = "idle" | "picking" | "scanning" | "reading" | "analyzing";

function App() {
  const [projectRootAbsolute, setProjectRootAbsolute] = useState<string | null>(
    null,
  );
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null);
  const [layoutModel, setLayoutModel] = useState<LayoutRenderModel | null>(null);
  const [layoutScope, setLayoutScope] = useState<LayoutScopeSummary | null>(null);
  const [error, setError] = useState<InvokeError | null>(null);
  const [loading, setLoading] = useState<LoadingState>("idle");
  const isBusy = loading !== "idle";

  async function openProject() {
    setError(null);
    setAnalysis(null);
    setLayoutModel(null);
    setLayoutScope(null);
    setProjectRootAbsolute(null);
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

      setLoading("analyzing");
      const projectAnalysis = await analyzeProject(projectFiles, {
        rootPathAbsolute: picked.rootPath,
        config,
      });
      setAnalysis(projectAnalysis);
      const dependencyGraph = buildModuleDependencyGraphFromAnalysis(projectAnalysis);
      const layout = buildHierarchicalLayout(dependencyGraph);
      setLayoutModel(layout.model);
      setLayoutScope(layout.scope);
    } catch (e) {
      setProjectRootAbsolute(null);
      setAnalysis(null);
      setLayoutModel(null);
      setLayoutScope(null);
      setError(e as InvokeError);
    } finally {
      setLoading("idle");
    }
  }

  return (
    <main className={layoutModel ? "app-shell app-shell--graph" : "container"}>
      <header className="app-toolbar">
        <h1>dependency analyser</h1>
        <button onClick={openProject} disabled={isBusy}>
          {loading === "picking"
            ? "Choosing folder…"
            : loading === "scanning"
              ? "Scanning files…"
              : loading === "reading"
                ? "Reading files…"
                : loading === "analyzing"
                  ? "Analyzing…"
                  : "Open project"}
        </button>

        {error && (
          <p className="app-error" role="alert">
            {error.kind}: {error.message}
          </p>
        )}

        {projectRootAbsolute && (
          <p className="project-root">Project: {projectRootAbsolute}</p>
        )}

        {loading === "reading" && <p>Reading files…</p>}
        {loading === "analyzing" && <p>Analyzing project…</p>}

        {analysis && (
          <div className="analysis-stats">
            <span>Files: {analysis.stats.fileCount}</span>
            <span>Modules: {analysis.stats.moduleCount}</span>
            <span>Imports: {analysis.stats.totalDependencies}</span>
            {layoutModel && layoutScope && (
              <>
                <span>
                  Graph: {layoutModel.edges.length} edges · {layoutScope.totalModules}{" "}
                  modules
                </span>
                <span className="layout-scope-root" title="Cycle-break root">
                  layout root: {layoutScope.root}
                </span>
              </>
            )}
            {layoutModel && (
              <details className="layout-details layout-details--inline">
                <summary>Layout JSON</summary>
                <pre className="layout-json">
                  {JSON.stringify(layoutModel, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </header>

      {layoutModel && <GraphViewport layout={layoutModel} />}
    </main>
  );
}

export default App;