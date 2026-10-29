import { describe, expect, it } from "vitest";

import { moduleBaseName, normalizeModuleId, toProjectFile } from "./path.ts";

const root = "/home/user/app";

describe("normalizeModuleId", () => {
  it("returns a path relative to the project root", () => {
    expect(
      normalizeModuleId("/home/user/app/src/a.ts", {
        projectRootAbsolute: root,
      }),
    ).toBe("src/a.ts");
  });

  it("converts backslashes to posix separators", () => {
    expect(
      normalizeModuleId("/home/user/app\\src\\a.ts", {
        projectRootAbsolute: root,
      }),
    ).toBe("src/a.ts");
  });

  it("accepts a path relative to the project root", () => {
    expect(
      normalizeModuleId("./src/a.ts", { projectRootAbsolute: root }),
    ).toBe("src/a.ts");
  });

  it("collapses parent segments", () => {
    expect(
      normalizeModuleId("/home/user/app/src/../src/a.ts", {
        projectRootAbsolute: root,
      }),
    ).toBe("src/a.ts");
  });

  it("rejects a path outside the project", () => {
    expect(() =>
      normalizeModuleId("/home/user/other/a.ts", {
        projectRootAbsolute: root,
      }),
    ).toThrow(/outside the selected project/);
  });
});

describe("toProjectFile", () => {
  it("builds a ProjectFile with a relative path", () => {
    expect(toProjectFile("/home/user/app/index.js", "console.log(1)", root)).toEqual(
      { path: "index.js", content: "console.log(1)" },
    );
  });
});

describe("moduleBaseName", () => {
  it("returns the file name segment", () => {
    expect(moduleBaseName("src/features/auth/model.ts")).toBe("model.ts");
  });
});
