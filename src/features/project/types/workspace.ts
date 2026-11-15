import type { CycleBreak } from "../../architecture-problems";
import type { ModuleDependencyGraph } from "../../graph-data/types";
import type {
  LayoutRenderModel,
  LayoutScopeSummary,
} from "../../hierarchical-graph-layout";
import type { ProjectAnalysis } from "../types";

export type InvokeError = {
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

export type LoadingState = "idle" | "picking" | "scanning" | "reading" | "analyzing";

export interface ProjectWorkspace {
  projectRootAbsolute: string | null;
  fileModuleIds: string[];
  analysis: ProjectAnalysis | null;
  dependencyGraph: ModuleDependencyGraph | null;
  layoutModel: LayoutRenderModel | null;
  layoutScope: LayoutScopeSummary | null;
  cycleBreaks: CycleBreak[];
  layoutError: string | null;
  error: InvokeError | null;
  loading: LoadingState;
  isBusy: boolean;
  openProject: () => Promise<void>;
  closeProject: () => void;
}