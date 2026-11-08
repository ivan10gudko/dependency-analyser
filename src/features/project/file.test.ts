import { describe, expect, it } from "vitest";

import { toProjectFile } from "./file.ts";

const root = "/home/user/app";

describe("toProjectFile", () => {
  it("builds a ProjectFile with a relative path", () => {
    expect(toProjectFile("/home/user/app/index.js", "console.log(1)", root)).toEqual({
      path: "index.js",
      content: "console.log(1)",
    });
  });
});
