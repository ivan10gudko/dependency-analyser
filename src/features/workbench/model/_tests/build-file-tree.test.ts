import { describe, expect, it } from "vitest";

import { buildFileTree, folderAncestorIdsForModule } from "../build-file-tree";

describe("buildFileTree", () => {
  it("nests paths and sorts folders before files", () => {
    const tree = buildFileTree(["src/lib/b.ts", "src/a.ts", "index.js"]);
    expect(tree.map((n) => n.name)).toEqual(["src", "index.js"]);
    const src = tree.find((n) => n.name === "src");
    expect(src?.children?.map((n) => n.name)).toEqual(["a.ts", "lib"]);
  });

  it("returns empty for no files", () => {
    expect(buildFileTree([])).toEqual([]);
  });
});

describe("folderAncestorIdsForModule", () => {
  it("lists parent folders for a nested file path", () => {
    expect(folderAncestorIdsForModule("features/graph-renderer/utils/view-box.ts")).toEqual([
      "features",
      "features/graph-renderer",
      "features/graph-renderer/utils",
    ]);
  });

  it("returns empty for a top-level file", () => {
    expect(folderAncestorIdsForModule("index.ts")).toEqual([]);
  });
});