import { describe, expect, it } from "vitest";

import { buildFileTree } from "../build-file-tree";

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