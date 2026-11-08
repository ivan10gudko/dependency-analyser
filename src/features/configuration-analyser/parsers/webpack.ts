import { fileNameOf } from "../../../lib/path";
import type { ConfigParser, ParseContext, ParsedConfig } from "../types";
import { parsedAliases } from "./bundler-alias";

const WEBPACK_CONFIG_FILES = [
  "webpack.config.js",
  "webpack.config.ts",
  "webpack.config.mjs",
  "webpack.config.cjs",
];

export class WebpackConfigParser implements ConfigParser {
  readonly fileNames = WEBPACK_CONFIG_FILES;

  canParse(fileName: string): boolean {
    return WEBPACK_CONFIG_FILES.includes(fileName);
  }

  async parse(filePath: string, context: ParseContext): Promise<ParsedConfig> {
    const text = await context.readText(filePath);
    return parsedAliases(fileNameOf(filePath), text);
  }
}
