import { describe, expect, it } from "vitest";

import type { ProjectConfig } from "../../configuration-analyser/types";
import type { ProjectFile } from "../../project/types";
import { analyzeProject } from "../model";
import { resolveImportToModule } from "../resolve";

const files = [
  "src/app/[locale]/(marketing)/account/page.tsx",
  "src/i18n/routing.ts",
  "src/shared/routes/paths.ts",
  "src/shared/routes/index.ts",
  "src/components/Button.tsx",
];

const moduleIds = new Set(files);

const config: ProjectConfig = {
  rootPath: "/proj",
  aliases: [{ pattern: "@/*", targets: ["./src/*"] }],
  packageImports: [{ pattern: "#services/*", targets: ["./src/services/*.js"] }],
  baseUrl: ".",
  externalPackages: ["next"],
};

describe("resolveImportToModule", () => {
  const from = "src/app/[locale]/(marketing)/account/page.tsx";

  it("drops external packages", () => {
    expect(resolveImportToModule("next/navigation", from, config, moduleIds)).toBeUndefined();
    expect(resolveImportToModule("react", from, config, moduleIds)).toBeUndefined();
  });

  it("replaces an alias with the module id", () => {
    expect(resolveImportToModule("@/i18n/routing", from, config, moduleIds)).toBe(
      "src/i18n/routing.ts",
    );
    expect(resolveImportToModule("@/shared/routes/paths", from, config, moduleIds)).toBe(
      "src/shared/routes/paths.ts",
    );
  });

  it("replaces a relative import with the module id", () => {
    expect(
      resolveImportToModule("./paths", "src/shared/routes/index.ts", config, moduleIds),
    ).toBe("src/shared/routes/paths.ts");
    expect(
      resolveImportToModule("../../i18n/routing", "src/shared/routes/index.ts", config, moduleIds),
    ).toBe("src/i18n/routing.ts");
  });

  it("resolves a directory to its index file", () => {
    expect(
      resolveImportToModule("@/shared/routes", from, config, moduleIds),
    ).toBe("src/shared/routes/index.ts");
  });

  it("applies baseUrl when the alias target is relative to it", () => {
    const based: ProjectConfig = {
      ...config,
      baseUrl: "src",
      aliases: [{ pattern: "@/*", targets: ["*"] }],
    };
    expect(resolveImportToModule("@/i18n/routing", from, based, moduleIds)).toBe(
      "src/i18n/routing.ts",
    );
  });

  it("resolves a package import and a .js specifier to the TypeScript file", () => {
    const withService = new Set([...moduleIds, "src/services/user.ts"]);
    expect(resolveImportToModule("#services/user", from, config, withService)).toBe(
      "src/services/user.ts",
    );
    expect(
      resolveImportToModule("./routing.js", "src/i18n/index.ts", config, moduleIds),
    ).toBe("src/i18n/routing.ts");
  });
});

describe("analyzeProject", () => {
  it("keeps only internal dependencies whose ids match project modules", async () => {
    const page: ProjectFile = {
      path: "src/app/[locale]/(marketing)/account/page.tsx",
      content: `
        import { useRouter } from "next/navigation";
        import { routing } from "@/i18n/routing";
        import { paths } from "@/shared/routes/paths";
        export { Button } from "./Button";
      `,
    };
    const button: ProjectFile = {
      path: "src/app/[locale]/(marketing)/account/Button.tsx",
      content: `export function Button() { return null; }`,
    };
    const routing: ProjectFile = {
      path: "src/i18n/routing.ts",
      content: `export const routing = {};`,
    };
    const paths: ProjectFile = {
      path: "src/shared/routes/paths.ts",
      content: `export const paths = {};`,
    };

    const analysis = await analyzeProject([page, button, routing, paths], { config });
    const account = analysis.modules.find((module) => module.path === page.path);

    expect(account?.dependencies).toEqual([
      "src/i18n/routing.ts",
      "src/shared/routes/paths.ts",
      "src/app/[locale]/(marketing)/account/Button.tsx",
    ]);
    expect(analysis.stats.totalDependencies).toBe(3);
  });
});
