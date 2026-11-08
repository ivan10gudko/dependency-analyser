import ts from "typescript";

import { emptyParsedConfig, upsertByPattern } from "../merge";
import type { AliasMapping, ParsedConfig } from "../types";

function unwrapSyntax(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isParenthesizedExpression(current) ||
    ts.isTypeAssertionExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function propertyName(name: ts.PropertyName): string | undefined {
  if (
    ts.isIdentifier(name) ||
    ts.isStringLiteral(name) ||
    ts.isNoSubstitutionTemplateLiteral(name)
  ) {
    return name.text;
  }
  return undefined;
}

function propertyInitializer(
  object: ts.ObjectLiteralExpression,
  name: string,
): ts.Expression | undefined {
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    if (propertyName(property.name) !== name) continue;
    return unwrapSyntax(property.initializer);
  }
  return undefined;
}

function isStaticString(
  expression: ts.Expression,
): expression is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral {
  return ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression);
}

function isDefineConfig(expression: ts.Expression): boolean {
  const unwrapped = unwrapSyntax(expression);
  if (ts.isIdentifier(unwrapped)) return unwrapped.text === "defineConfig";
  if (ts.isPropertyAccessExpression(unwrapped)) return unwrapped.name.text === "defineConfig";
  return false;
}

function objectFromFunctionBody(body: ts.ConciseBody): ts.ObjectLiteralExpression | undefined {
  if (ts.isBlock(body)) {
    for (const statement of body.statements) {
      if (!ts.isReturnStatement(statement) || !statement.expression) continue;
      const returned = unwrapSyntax(statement.expression);
      if (ts.isObjectLiteralExpression(returned)) return returned;
    }
    return undefined;
  }

  const expression = unwrapSyntax(body);
  return ts.isObjectLiteralExpression(expression) ? expression : undefined;
}

function unwrapConfigObject(expression: ts.Expression): ts.ObjectLiteralExpression | undefined {
  const unwrapped = unwrapSyntax(expression);
  if (ts.isObjectLiteralExpression(unwrapped)) return unwrapped;
  if (!ts.isCallExpression(unwrapped) || !isDefineConfig(unwrapped.expression)) return undefined;

  const argument = unwrapped.arguments[0];
  if (!argument) return undefined;
  const unwrappedArgument = unwrapSyntax(argument);
  if (ts.isObjectLiteralExpression(unwrappedArgument)) return unwrappedArgument;
  if (ts.isArrowFunction(unwrappedArgument) || ts.isFunctionExpression(unwrappedArgument)) {
    return objectFromFunctionBody(unwrappedArgument.body);
  }
  return undefined;
}

function isModuleExports(expression: ts.Expression): boolean {
  return (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === "module" &&
    expression.name.text === "exports"
  );
}

function exportedExpression(statement: ts.Statement): ts.Expression | undefined {
  if (ts.isExportAssignment(statement)) return statement.expression;
  if (!ts.isExpressionStatement(statement)) return undefined;

  const expression = statement.expression;
  if (
    !ts.isBinaryExpression(expression) ||
    expression.operatorToken.kind !== ts.SyntaxKind.EqualsToken ||
    !isModuleExports(expression.left)
  ) {
    return undefined;
  }
  return expression.right;
}

function hasSourceExtension(target: string): boolean {
  return /\.(tsx?|jsx?|mjs|cjs|mts|cts)$/.test(target);
}

function mappingsFor(pattern: string, target: string): AliasMapping[] {
  const mappings: AliasMapping[] = [{ pattern, targets: [target] }];
  if (pattern.includes("*") || target.includes("*") || hasSourceExtension(target)) {
    return mappings;
  }
  const directory = target.replace(/\/+$/, "");
  mappings.push({ pattern: `${pattern}/*`, targets: [`${directory}/*`] });
  return mappings;
}

function aliasesFromAliasNode(expression: ts.Expression): AliasMapping[] {
  if (ts.isObjectLiteralExpression(expression)) {
    const aliases: AliasMapping[] = [];
    for (const property of expression.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const pattern = propertyName(property.name);
      const value = unwrapSyntax(property.initializer);
      if (!pattern || !isStaticString(value)) continue;
      aliases.push(...mappingsFor(pattern, value.text));
    }
    return aliases;
  }

  if (!ts.isArrayLiteralExpression(expression)) return [];

  const aliases: AliasMapping[] = [];
  for (const element of expression.elements) {
    const entry = unwrapSyntax(element);
    if (!ts.isObjectLiteralExpression(entry)) continue;
    const find = propertyInitializer(entry, "find");
    const replacement = propertyInitializer(entry, "replacement");
    if (!find || !replacement || !isStaticString(find) || !isStaticString(replacement)) continue;
    aliases.push(...mappingsFor(find.text, replacement.text));
  }
  return aliases;
}

function aliasesFromConfigObject(object: ts.ObjectLiteralExpression): AliasMapping[] {
  const resolve = propertyInitializer(object, "resolve");
  if (!resolve || !ts.isObjectLiteralExpression(resolve)) return [];
  const alias = propertyInitializer(resolve, "alias");
  if (!alias) return [];
  return aliasesFromAliasNode(alias);
}

export function aliasesFromModuleSource(fileName: string, text: string): AliasMapping[] {
  const sourceFile = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
  let aliases: AliasMapping[] = [];

  for (const statement of sourceFile.statements) {
    const expression = exportedExpression(statement);
    if (!expression) continue;
    const object = unwrapConfigObject(expression);
    if (!object) continue;
    aliases = upsertByPattern(aliases, aliasesFromConfigObject(object));
  }

  return aliases;
}

export function parsedAliases(fileName: string, text: string): ParsedConfig {
  const parsed = emptyParsedConfig();
  parsed.aliases = aliasesFromModuleSource(fileName, text);
  return parsed;
}
