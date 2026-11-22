import { detectBarrelFolders } from "../../barrel-view";

import type { AnalysisIssue, Analyzer } from "../types";

export const publicApiAnalyzer: Analyzer = {
  id: "public-api",
  run({ graph }) {
    const folders = detectBarrelFolders(graph);
    const issues: AnalysisIssue[] = [];

    for (const folder of folders.values()) {
      for (const deepImport of folder.deepImports) {
        const place = folder.directory === "" ? "the project root" : folder.directory;
        issues.push({
          id: `public-api:${deepImport.importer}->${deepImport.target}`,
          ruleId: "public-api",
          severity: "warning",
          category: "public-api",
          message:
            `Public API bypass: ${deepImport.importer} imports ${deepImport.target} ` +
            `inside ${place}`,
          moduleIds: [deepImport.importer, deepImport.target],
          edges: [{ from: deepImport.importer, to: deepImport.target }],
          primaryModuleId: deepImport.importer,
        });
      }
    }

    return issues;
  },
};
