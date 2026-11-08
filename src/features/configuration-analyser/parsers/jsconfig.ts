import type { ConfigParser, ParseContext, ParsedConfig } from "../types";
import { parseTypeScriptConfig } from "./typescript-config";

export class JsConfigParser implements ConfigParser {
  readonly fileNames = ["jsconfig.json"];

  canParse(fileName: string): boolean {
    return fileName === "jsconfig.json";
  }

  parse(filePath: string, context: ParseContext): Promise<ParsedConfig> {
    return parseTypeScriptConfig(filePath, context);
  }
}
