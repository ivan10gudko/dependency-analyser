import { fileNameOf } from "../../../lib/path";
import type { ConfigParser, ParseContext, ParsedConfig } from "../types";
import { parsedAliases } from "./bundler-alias";

const VITE_CONFIG_FILES = [
  "vite.config.ts",
  "vite.config.js",
  "vite.config.mjs",
  "vite.config.cjs",
  "vite.config.mts",
  "vite.config.cts",
];

export class ViteConfigParser implements ConfigParser {
  readonly fileNames = VITE_CONFIG_FILES;

  canParse(fileName: string): boolean {
    return VITE_CONFIG_FILES.includes(fileName);
  }

  async parse(filePath: string, context: ParseContext): Promise<ParsedConfig> {
    const text = await context.readText(filePath);
    return parsedAliases(fileNameOf(filePath), text);
  }
}
