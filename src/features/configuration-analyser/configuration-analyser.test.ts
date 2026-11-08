import { describe, expect, it } from "vitest";

import {
  classifyImportSpecifier,
  ConfigurationAnalyser,
  ImportSpecifierResolution,
  JsConfigParser,
  PackageJsonParser,
  TsConfigParser,
  ViteConfigParser,
  WebpackConfigParser,
} from "./index.ts";
import type { ConfigParser, ParseContext, ParsedConfig } from "./types.ts";

function reader(files: Record<string, string>): ParseContext {
  const contents = new Map(
    Object.entries(files).map(([filePath, text]) => [filePath.replace(/\\/g, "/"), text]),
  );
  return {
    async readText(filePath: string) {
      const text = contents.get(filePath.replace(/\\/g, "/"));
      if (text === undefined) throw new Error(`missing ${filePath}`);
      return text;
    },
  };
}

describe("TsConfigParser", () => {
  const parser = new TsConfigParser();

  it("reads paths, an exact alias, baseUrl, and JSONC", async () => {
    const parsed = await parser.parse(
      "/proj/tsconfig.json",
      reader({
        "/proj/tsconfig.json": `{
          // path aliases
          "compilerOptions": {
            "baseUrl": "./src",
            "paths": {
              "@components/*": ["components/*"],
              "@app": ["app/index.ts"],
            },
          },
        }`,
      }),
    );

    expect(parsed.baseUrl).toBe("src");
    expect(parsed.aliases).toEqual([
      { pattern: "@components/*", targets: ["components/*"] },
      { pattern: "@app", targets: ["app/index.ts"] },
    ]);
  });

  it("lets a child config override a relative extends parent", async () => {
    const parsed = await parser.parse(
      "/proj/tsconfig.json",
      reader({
        "/proj/tsconfig.json": `{
          "extends": "./tsconfig.base",
          "compilerOptions": {
            "baseUrl": "src",
            "paths": {
              "@components/*": ["components/*"]
            }
          }
        }`,
        "/proj/tsconfig.base.json": `{
          "compilerOptions": {
            "baseUrl": ".",
            "paths": {
              "@components/*": ["src/components/*"],
              "@lib/*": ["src/lib/*"],
            },
          },
        }`,
      }),
    );

    expect(parsed.baseUrl).toBe("src");
    expect(parsed.aliases).toEqual([
      { pattern: "@components/*", targets: ["components/*"] },
      { pattern: "@lib/*", targets: ["src/lib/*"] },
    ]);
  });

  it("rebases baseUrl from a nested extends file onto the config directory", async () => {
    const parsed = await parser.parse(
      "/proj/tsconfig.json",
      reader({
        "/proj/tsconfig.json": `{ "extends": "./configs/base.json" }`,
        "/proj/configs/base.json": `{
          "compilerOptions": { "baseUrl": "../src" }
        }`,
      }),
    );

    expect(parsed.baseUrl).toBe("src");
  });

  it("ignores a package extends", async () => {
    const parsed = await parser.parse(
      "/proj/tsconfig.json",
      reader({
        "/proj/tsconfig.json": `{
          "extends": "@tsconfig/strictest",
          "compilerOptions": {
            "paths": { "@components/*": ["src/components/*"] }
          }
        }`,
      }),
    );

    expect(parsed.aliases).toEqual([
      { pattern: "@components/*", targets: ["src/components/*"] },
    ]);
  });
});

describe("JsConfigParser", () => {
  it("reads the same paths shape as tsconfig", async () => {
    const parsed = await new JsConfigParser().parse(
      "/proj/jsconfig.json",
      reader({
        "/proj/jsconfig.json": `{
          "compilerOptions": {
            "baseUrl": ".",
            "paths": { "@js/*": ["src/*"] }
          }
        }`,
      }),
    );

    expect(parsed.baseUrl).toBe(".");
    expect(parsed.aliases).toEqual([{ pattern: "@js/*", targets: ["src/*"] }]);
  });
});

describe("PackageJsonParser", () => {
  it("reads string and conditional imports plus dependency names", async () => {
    const parsed = await new PackageJsonParser().parse(
      "/proj/package.json",
      reader({
        "/proj/package.json": `{
          "imports": {
            "#services/*": "./src/services/*.js",
            "#internal": {
              "browser": "./src/browser.ts",
              "import": "./src/internal.ts",
              "default": "./src/internal.ts",
              "node": "./src/node.ts"
            }
          },
          "dependencies": {
            "react": "^19.0.0",
            "@tanstack/react-query": "^5.0.0"
          },
          "devDependencies": { "vite": "^8.0.0", "react": "^19.0.0" },
          "peerDependencies": { "react-dom": "^19.0.0" },
          "optionalDependencies": { "fsevents": "^2.0.0" }
        }`,
      }),
    );

    expect(parsed.packageImports).toEqual([
      { pattern: "#services/*", targets: ["./src/services/*.js"] },
      {
        pattern: "#internal",
        targets: [
          "./src/internal.ts",
          "./src/internal.ts",
          "./src/browser.ts",
          "./src/node.ts",
        ],
      },
    ]);
    expect(parsed.externalPackages).toEqual([
      "react",
      "@tanstack/react-query",
      "vite",
      "react-dom",
      "fsevents",
    ]);
  });
});

describe("ViteConfigParser", () => {
  const parser = new ViteConfigParser();

  it("keeps string aliases and skips path.resolve", async () => {
    const parsed = await parser.parse(
      "/proj/vite.config.ts",
      reader({
        "/proj/vite.config.ts": `
          import path from "node:path";
          import { defineConfig } from "vite";

          export default defineConfig(() => ({
            resolve: {
              alias: {
                "@components": "src/components",
                "@": path.resolve("/proj", "src"),
              },
            },
          }));
        `,
      }),
    );

    expect(parsed.aliases).toEqual([
      { pattern: "@components", targets: ["src/components"] },
      { pattern: "@components/*", targets: ["src/components/*"] },
    ]);
  });

  it("reads literal find/replacement entries and skips regexp and calls", async () => {
    const parsed = await parser.parse(
      "/proj/vite.config.ts",
      reader({
        "/proj/vite.config.ts": `
          import path from "node:path";
          import { defineConfig } from "vite";

          export default defineConfig({
            resolve: {
              alias: [
                { find: "@components", replacement: "src/components" },
                { find: "@", replacement: path.resolve("/proj", "src") },
                { find: /^@\\//, replacement: "src/" },
              ],
            },
          }) satisfies Record<string, unknown>;
        `,
      }),
    );

    expect(parsed.aliases).toEqual([
      { pattern: "@components", targets: ["src/components"] },
      { pattern: "@components/*", targets: ["src/components/*"] },
    ]);
  });
});

describe("WebpackConfigParser", () => {
  it("reads module.exports aliases and skips path.resolve", async () => {
    const parsed = await new WebpackConfigParser().parse(
      "/proj/webpack.config.js",
      reader({
        "/proj/webpack.config.js": `
          const path = require("path");
          module.exports = {
            resolve: {
              alias: {
                "@app": "src/app",
                "@lib": path.resolve(__dirname, "src/lib"),
              },
            },
          };
        `,
      }),
    );

    expect(parsed.aliases).toEqual([
      { pattern: "@app", targets: ["src/app"] },
      { pattern: "@app/*", targets: ["src/app/*"] },
    ]);
  });
});

describe("ConfigurationAnalyser", () => {
  const analyser = new ConfigurationAnalyser();

  it("returns an empty config when the project has no configuration files", async () => {
    await expect(analyser.load("/proj", reader({}))).resolves.toEqual({
      rootPath: "/proj",
      aliases: [],
      packageImports: [],
      externalPackages: [],
    });
  });

  it("merges parsers, prefers tsconfig over jsconfig, and lets vite replace a shared alias", async () => {
    const config = await analyser.load(
      "/proj",
      reader({
        "/proj/tsconfig.json": `{
          "compilerOptions": {
            "baseUrl": ".",
            "paths": { "@components/*": ["src/components/*"] }
          }
        }`,
        "/proj/tsconfig.app.json": `{
          "compilerOptions": {
            "baseUrl": "src",
            "paths": { "@app/*": ["app/*"] }
          }
        }`,
        "/proj/jsconfig.json": `{
          "compilerOptions": {
            "paths": { "@js/*": ["src/*"] }
          }
        }`,
        "/proj/package.json": `{
          "imports": { "#services/*": "./src/services/*.js" },
          "dependencies": { "@tanstack/react-query": "^5.0.0" }
        }`,
        "/proj/vite.config.ts": `
          import { defineConfig } from "vite";
          export default defineConfig({
            resolve: { alias: { "@components/*": "client/components/*" } }
          });
        `,
        "/proj/broken.json": "{",
      }),
    );

    expect(config.baseUrl).toBe("src");
    expect(config.aliases).toEqual([
      { pattern: "@components/*", targets: ["client/components/*"] },
      { pattern: "@app/*", targets: ["app/*"] },
    ]);
    expect(config.packageImports).toEqual([
      { pattern: "#services/*", targets: ["./src/services/*.js"] },
    ]);
    expect(config.externalPackages).toEqual(["@tanstack/react-query"]);
    expect(classifyImportSpecifier("@components/Button", config)).toBe(
      ImportSpecifierResolution.Alias,
    );
    expect(classifyImportSpecifier("@tanstack/react-query", config)).toBe(
      ImportSpecifierResolution.External,
    );
    expect(classifyImportSpecifier("@js/util", config)).toBe(
      ImportSpecifierResolution.External,
    );
  });

  it("skips an invalid tsconfig and still reads package.json", async () => {
    const config = await analyser.load(
      "/proj",
      reader({
        "/proj/tsconfig.json": "{",
        "/proj/package.json": `{ "dependencies": { "react": "^19.0.0" } }`,
      }),
    );

    expect(config.aliases).toEqual([]);
    expect(config.externalPackages).toEqual(["react"]);
  });

  it("uses jsconfig aliases when the project has no tsconfig", async () => {
    const config = await analyser.load(
      "/proj",
      reader({
        "/proj/jsconfig.json": `{
          "compilerOptions": { "paths": { "@js/*": ["src/*"] } }
        }`,
      }),
    );

    expect(config.aliases).toEqual([{ pattern: "@js/*", targets: ["src/*"] }]);
  });

  it("accepts an extra parser", async () => {
    class ExtraParser implements ConfigParser {
      readonly fileNames = ["extra.json"];

      canParse(fileName: string): boolean {
        return fileName === "extra.json";
      }

      async parse(): Promise<ParsedConfig> {
        return {
          aliases: [{ pattern: "@extra/*", targets: ["extra/*"] }],
          packageImports: [],
          externalPackages: [],
        };
      }
    }

    const config = await new ConfigurationAnalyser([new ExtraParser()]).load(
      "/proj",
      reader({ "/proj/extra.json": "{}" }),
    );

    expect(config.aliases).toEqual([{ pattern: "@extra/*", targets: ["extra/*"] }]);
  });
});

describe("classifyImportSpecifier", () => {
  const emptyConfig = {
    rootPath: "/proj",
    aliases: [],
    packageImports: [],
    externalPackages: [],
  };
  const aliasConfig = {
    rootPath: "/proj",
    aliases: [
      { pattern: "@/*", targets: ["src/*"] },
      { pattern: "~/*", targets: ["src/*"] },
      { pattern: "@components", targets: ["src/components/index.ts"] },
      { pattern: "@components/*", targets: ["src/components/*"] },
    ],
    packageImports: [],
    externalPackages: [],
  };

  it.each([
    ["./utils", ImportSpecifierResolution.Relative],
    ["../services/api", ImportSpecifierResolution.Relative],
  ])('classifies "%s" as relative', (specifier, expected) => {
    expect(classifyImportSpecifier(specifier, emptyConfig)).toBe(expected);
  });

  it.each([
    ["@/components/Button", ImportSpecifierResolution.Alias],
    ["~/lib/helpers", ImportSpecifierResolution.Alias],
    ["@components/Button", ImportSpecifierResolution.Alias],
    ["@components", ImportSpecifierResolution.Alias],
  ])('classifies "%s" as alias when the project maps it', (specifier, expected) => {
    expect(classifyImportSpecifier(specifier, aliasConfig)).toBe(expected);
  });

  it('classifies "@/components/Button" as external when no alias matches', () => {
    expect(classifyImportSpecifier("@/components/Button", emptyConfig)).toBe(
      ImportSpecifierResolution.External,
    );
  });

  it('classifies "#services/user" as a package import', () => {
    expect(classifyImportSpecifier("#services/user", emptyConfig)).toBe(
      ImportSpecifierResolution.Package,
    );
  });

  it.each([
    "react",
    "axios",
    "lodash/debounce",
    "@nestjs/common",
    "@tanstack/react-query",
    "@components-extra",
    "node:fs",
  ])('classifies "%s" as external', (specifier) => {
    expect(classifyImportSpecifier(specifier, aliasConfig)).toBe(
      ImportSpecifierResolution.External,
    );
  });
});
