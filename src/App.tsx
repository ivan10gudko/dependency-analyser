import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { ConfigurationAnalyser } from "./features/configuration-analyser";
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
  const [error, setError] = useState<InvokeError | null>(null);
  const [loading, setLoading] = useState<LoadingState>("idle");
  const isBusy = loading !== "idle";

  async function openProject() {
    setError(null);
    setAnalysis(null);
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
      setAnalysis(
        await analyzeProject(projectFiles, {
          rootPathAbsolute: picked.rootPath,
          config,
        }),
      );
    } catch (e) {
      setProjectRootAbsolute(null);
      setAnalysis(null);
      setError(e as InvokeError);
    } finally {
      setLoading("idle");
    }
  }

  return (
    <main className="container">
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
        <p role="alert">
          {error.kind}: {error.message}
        </p>
      )}

      {projectRootAbsolute && (
        <p className="project-root">Project: {projectRootAbsolute}</p>
      )}

      {loading === "reading" && <p>Reading files…</p>}
      {loading === "analyzing" && <p>Analyzing project…</p>}

      {analysis && (
        <section className="analysis">
          <p>Files: {analysis.stats.fileCount}</p>
          <p>Modules: {analysis.stats.moduleCount}</p>
          <p>Imports: {analysis.stats.totalDependencies}</p>

        <ul>
          {analysis.modules.map((module) => (
            <li key={module.path}>
              <h3>{module.path} - {module.dependencies.length}</h3>
            <ul>
              {module.dependencies.map((dependency) => (
                <li key={dependency}>{dependency}</li>
              ))}
            </ul>
            </li>
          ))}
        </ul>
        </section>
      )}
    </main>
  );
}

export default App;
