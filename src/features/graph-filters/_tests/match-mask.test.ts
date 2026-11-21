import { describe, expect, it } from "vitest";

import { pathMatchesMask, searchPaths } from "../match-mask";

describe("pathMatchesMask", () => {
  it("treats a path without wildcards as an exact mask", () => {
    expect(pathMatchesMask("src/main.ts", "src/main.ts")).toBe(true);
    expect(pathMatchesMask("src/main.ts", "src/main.tsx")).toBe(false);
    expect(pathMatchesMask("src/foo.bar.ts", "src/fooXbar.ts")).toBe(false);
  });

  it("keeps * inside one path segment and ** across segments", () => {
    expect(pathMatchesMask("*.test.ts", "foo.test.ts")).toBe(true);
    expect(pathMatchesMask("*.test.ts", "src/foo.test.ts")).toBe(false);
    expect(pathMatchesMask("**/*.test.ts", "foo.test.ts")).toBe(true);
    expect(pathMatchesMask("**/*.test.ts", "src/a/foo.test.ts")).toBe(true);
    expect(pathMatchesMask("src/features/*", "src/features/workbench")).toBe(true);
    expect(pathMatchesMask("src/features/*", "src/features")).toBe(false);
    expect(pathMatchesMask("src/features/*", "src/features/workbench/nested")).toBe(false);
    expect(pathMatchesMask("**/__tests__", "__tests__")).toBe(true);
    expect(pathMatchesMask("**/__tests__", "src/foo/__tests__")).toBe(true);
    expect(pathMatchesMask("**/__tests__", "src/foo/__tests__/nested")).toBe(false);
  });

  it("treats ? as a single non-slash character", () => {
    expect(pathMatchesMask("a?c", "abc")).toBe(true);
    expect(pathMatchesMask("a?c", "ac")).toBe(false);
    expect(pathMatchesMask("a?c", "a/c")).toBe(false);
  });
});

describe("searchPaths", () => {
  const paths = ["src/app.ts", "src/features/workbench/panel.tsx", "lib/path.ts"];

  it("matches a plain query as a case-insensitive substring", () => {
    expect(searchPaths(paths, "WORK")).toEqual(["src/features/workbench/panel.tsx"]);
  });

  it("matches a glob query and caps the result", () => {
    expect(searchPaths(paths, "src/**", 1)).toEqual(["src/app.ts"]);
  });

  it("returns nothing for a blank query", () => {
    expect(searchPaths(paths, "   ")).toEqual([]);
  });
});
