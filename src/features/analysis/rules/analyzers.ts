import type { Analyzer } from "../types";

import { circularDependencyAnalyzer } from "./circular-dependency";
import { fsdCrossSliceAnalyzer, fsdLayerAnalyzer } from "./fsd-architecture";
import { highCouplingAnalyzer } from "./high-coupling";
import { publicApiAnalyzer } from "./public-api";
import { selfDependencyAnalyzer } from "./self-dependency";
import { unreachableModuleAnalyzer } from "./unreachable-modules";
import { unusedModuleAnalyzer } from "./unused-modules";

export const analysisAnalyzers: readonly Analyzer[] = [
  selfDependencyAnalyzer,
  circularDependencyAnalyzer,
  unusedModuleAnalyzer,
  unreachableModuleAnalyzer,
  highCouplingAnalyzer,
  fsdLayerAnalyzer,
  fsdCrossSliceAnalyzer,
  publicApiAnalyzer,
];
