import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { toProjectFile } from "./features/project/path";
import type { ProjectAnalysis, ProjectFile } from "./features/project/types";
import { analyzeProject } from "./features/source-analyser/model";

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

type AnalysisRun = {
  analysis: ProjectAnalysis;
  readMs: number;
  analyzeMs: number;
};

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(1)} ms`;
  }
  return `${(ms / 1000).toFixed(2)} s (${Math.round(ms)} ms)`;
}

function yieldToPaint(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function App() {
  const [projectRootAbsolute, setProjectRootAbsolute] = useState<string | null>(
    null,
  );
  const [analysisRun, setAnalysisRun] = useState<AnalysisRun | null>(null);
  const [error, setError] = useState<InvokeError | null>(null);
  const [loading, setLoading] = useState<LoadingState>("idle");

  const isBusy = loading !== "idle";

  async function openProject() {
    setError(null);
    setAnalysisRun(null);
    setProjectRootAbsolute(null);
    setLoading("picking");

    try {
      const picked = await invoke<ProjectRoot>("pick_project_folder");
      setProjectRootAbsolute(picked.rootPath);

      setLoading("scanning");
      const listed = await invoke<FileInfo[]>("list_project_files");

      setLoading("reading");
      await yieldToPaint();
      const readStarted = performance.now();
      const projectFiles: ProjectFile[] = [];
      for (const entry of listed) {
        const content = await invoke<string>("read_file", { path: entry.path });
        projectFiles.push(toProjectFile(entry.path, content, picked.rootPath));
      }
      const readMs = performance.now() - readStarted;

      setLoading("analyzing");
      await yieldToPaint();
      const analyzeStarted = performance.now();
      const analysis = analyzeProject(projectFiles, {
        rootPathAbsolute: picked.rootPath,
      });
      const analyzeMs = performance.now() - analyzeStarted;

      setAnalysisRun({ analysis, readMs, analyzeMs });
    } catch (e) {
      setProjectRootAbsolute(null);
      setAnalysisRun(null);
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

      {analysisRun && (
        <section className="analysis">
          <p>Files: {analysisRun.analysis.stats.fileCount}</p>
          <p>Modules: {analysisRun.analysis.stats.moduleCount}</p>
          <p>Imports: {analysisRun.analysis.stats.totalImportSpecifiers}</p>
          <p>Read: {formatDuration(analysisRun.readMs)}</p>
          <p>Analyze: {formatDuration(analysisRun.analyzeMs)}</p>
          <p>
            Total: {formatDuration(analysisRun.readMs + analysisRun.analyzeMs)}
          </p>
        </section>
      )}
    </main>
  );
}

export default App;
