import { joinPath } from "../../lib/path";

import { upsertByPattern, unionNames } from "./merge";
import { JsConfigParser } from "./parsers/jsconfig";
import { PackageJsonParser } from "./parsers/package-json";
import { TsConfigParser } from "./parsers/tsconfig";
import { ViteConfigParser } from "./parsers/vite";
import { WebpackConfigParser } from "./parsers/webpack";
import type { ConfigParser, ParseContext, ParsedConfig, ProjectConfig } from "./types";

type ConfigSource = "tsconfig" | "jsconfig" | "package" | "bundler";

interface CollectedConfig {
  source: ConfigSource;
  config: ParsedConfig;
}

const defaultParsers: readonly ConfigParser[] = [
  new TsConfigParser(),
  new JsConfigParser(),
  new PackageJsonParser(),
  new ViteConfigParser(),
  new WebpackConfigParser(),
];

function sourceOf(parser: ConfigParser): ConfigSource {
  if (parser instanceof TsConfigParser) return "tsconfig";
  if (parser instanceof JsConfigParser) return "jsconfig";
  if (parser instanceof PackageJsonParser) return "package";
  return "bundler";
}

function mergeCollected(rootPath: string, parts: readonly CollectedConfig[]): ProjectConfig {
  const hasTsConfig = parts.some((part) => part.source === "tsconfig");
  const config: ProjectConfig = {
    rootPath,
    aliases: [],
    packageImports: [],
    externalPackages: [],
  };

  for (const part of parts) {
    // typeScript project takes paths from tsconfig. jsconfig is only for projects without one.
    if (part.source === "jsconfig" && hasTsConfig) continue;

    if (part.config.baseUrl !== undefined) config.baseUrl = part.config.baseUrl;
    config.packageImports = upsertByPattern(config.packageImports, part.config.packageImports);
    config.externalPackages = unionNames(config.externalPackages, part.config.externalPackages);
    config.aliases = upsertByPattern(config.aliases, part.config.aliases);
  }

  return config;
}

export class ConfigurationAnalyser {
  constructor(private readonly parsers: readonly ConfigParser[] = defaultParsers) {}

  async load(rootPath: string, context: ParseContext): Promise<ProjectConfig> {
    const collected: CollectedConfig[] = [];

    for (const parser of this.parsers) {
      for (const fileName of parser.fileNames) {
        if (!parser.canParse(fileName)) continue;
        const filePath = joinPath(rootPath, fileName);
        try {
          await context.readText(filePath);
        } catch {
          continue;
        }

        try {
          const config = await parser.parse(filePath, context);
          collected.push({ source: sourceOf(parser), config });
        } catch {
          continue;
        }
      }
    }

    return mergeCollected(rootPath, collected);
  }
}
