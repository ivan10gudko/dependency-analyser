export { classifyImportSpecifier, ImportSpecifierResolution } from "./classify";
export { ConfigurationAnalyser } from "./model";
export { JsConfigParser } from "./parsers/jsconfig";
export { PackageJsonParser } from "./parsers/package-json";
export { TsConfigParser } from "./parsers/tsconfig";
export { ViteConfigParser } from "./parsers/vite";
export { WebpackConfigParser } from "./parsers/webpack";
export type {
  AliasMapping,
  ConfigParser,
  PackageImportMapping,
  ParseContext,
  ParsedConfig,
  ProjectConfig,
} from "./types";
