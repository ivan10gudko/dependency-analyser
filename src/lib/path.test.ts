import { describe, expect, it } from "vitest";

import { fileNameOf, normalizeModuleId } from "./path.ts";

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
    expect(normalizeModuleId("./src/a.ts", { projectRootAbsolute: root })).toBe("src/a.ts");
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

describe("fileNameOf", () => {
  it("returns the file name segment", () => {
    expect(fileNameOf("src/features/auth/model.ts")).toBe("model.ts");
  });
});
