export interface AliasMapping {
  pattern: string;
  targets: string[];
}

export interface PackageImportMapping {
  pattern: string;
  targets: string[];
}

export interface ParsedConfig {
  aliases: AliasMapping[];
  packageImports: PackageImportMapping[];
  baseUrl?: string;
  externalPackages: string[];
}

export interface ProjectConfig {
  rootPath: string;
  aliases: AliasMapping[];
  packageImports: PackageImportMapping[];
  baseUrl?: string;
  externalPackages: string[];
}

export interface ParseContext {
  readText(filePath: string): Promise<string>;
}

export interface ConfigParser {
  readonly fileNames: readonly string[];
  canParse(fileName: string): boolean;
  parse(filePath: string, context: ParseContext): Promise<ParsedConfig>;
}
