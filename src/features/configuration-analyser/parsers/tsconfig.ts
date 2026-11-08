import type { ConfigParser, ParseContext, ParsedConfig } from "../types";
import { parseTypeScriptConfig } from "./typescript-config";

export class TsConfigParser implements ConfigParser {
  readonly fileNames = ["tsconfig.json", "tsconfig.app.json"];

  canParse(fileName: string): boolean {
    return fileName === "tsconfig.json" || /^tsconfig\..+\.json$/.test(fileName);
  }

  parse(filePath: string, context: ParseContext): Promise<ParsedConfig> {
    return parseTypeScriptConfig(filePath, context);
  }
}
