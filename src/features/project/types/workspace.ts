import type { CycleBreak, SelfDependency } from "../../architecture-problems";
import type { ModuleDependencyGraph } from "../../graph-data/types";
import type {
  LayoutRenderModel,
  LayoutScopeSummary,
} from "../../hierarchical-graph-layout";
import type { ModuleFileStats } from "../module-file-stats";
import type { ModuleId, ProjectAnalysis } from "../types";

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
  moduleFileStats: ReadonlyMap<ModuleId, ModuleFileStats>;
  analysis: ProjectAnalysis | null;
  dependencyGraph: ModuleDependencyGraph | null;
  layoutModel: LayoutRenderModel | null;
  layoutScope: LayoutScopeSummary | null;
  cycleBreaks: CycleBreak[];
  selfDependencies: SelfDependency[];
  layoutError: string | null;
  error: InvokeError | null;
  loading: LoadingState;
  isBusy: boolean;
  openProject: () => Promise<void>;
  closeProject: () => void;
}