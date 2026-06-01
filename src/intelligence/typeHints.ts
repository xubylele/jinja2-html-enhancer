import { type BackendLang } from "./backendScanner";

export type JinjaType =
  | { kind: "unknown" }
  | { kind: "string" }
  | { kind: "number" }
  | { kind: "boolean" }
  | { kind: "list"; itemType?: JinjaType }
  | { kind: "dict"; valueType?: JinjaType }
  | { kind: "object"; fields: Map<string, JinjaType> }
  | { kind: "macro" }
  | { kind: "none" };

export interface TypeHint {
  type: JinjaType;
  source: "backend" | "inferred" | "usage";
  confidence: "high" | "medium" | "low";
}

export function typeToString(type: JinjaType): string {
  switch (type.kind) {
    case "unknown":
      return "any";
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "none":
      return "none";
    case "macro":
      return "macro";
    case "list":
      return type.itemType ? `list[${typeToString(type.itemType)}]` : "list";
    case "dict":
      return type.valueType ? `dict[str, ${typeToString(type.valueType)}]` : "dict";
    case "object": {
      const fields = [...type.fields.entries()]
        .map(([k, v]) => `${k}: ${typeToString(v)}`)
        .join(", ");
      return `object { ${fields} }`;
    }
  }
}

export function formatTypeForHover(typeHint: TypeHint): string {
  const typeStr = typeToString(typeHint.type);
  const sourceLabel =
    typeHint.source === "backend"
      ? "Backend type"
      : typeHint.source === "inferred"
        ? "Inferred type"
        : "Usage-based type";
  return `**${sourceLabel}** \`${typeStr}\` (${typeHint.confidence} confidence)`;
}

export class TypeHintExtractor {
  extractFromBackendCode(text: string, varName: string, lang: BackendLang): TypeHint | undefined {
    if (lang === "py") {
      return this.extractPythonType(text, varName);
    }
    if (lang === "js") {
      return this.extractJsType(text, varName);
    }
    return undefined;
  }

  private extractPythonType(text: string, varName: string): TypeHint | undefined {
    const patterns = [
      new RegExp(`${varName}\\s*:\\s*([\\w\\[\\]., {}]+)`),
      new RegExp(`"${varName}"\\s*:\\s*([\\w\\[\\]., {}]+)`),
      new RegExp(`'${varName}'\\s*:\\s*([\\w\\[\\]., {}]+)`),
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        return { type: parsePythonType(match[1].trim()), source: "backend", confidence: "high" };
      }
    }

    const valuePatterns = [
      new RegExp(`["']${varName}["']\\s*:\\s*(\\{[^}]+\\})`),
      new RegExp(`["']${varName}["']\\s*:\s*(\\[[^\\]]+\\])`),
      new RegExp(`["']${varName}["']\\s*:\s*["'][^"']*["']`),
      new RegExp(`["']${varName}["']\\s*:\s*(\\d+)`),
      new RegExp(`["']${varName}["']\\s*:\s*(True|False)`),
    ];

    for (const pattern of valuePatterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        return inferTypeFromValue(match[1]);
      }
    }

    return undefined;
  }

  private extractJsType(text: string, varName: string): TypeHint | undefined {
    const tsPattern = new RegExp(`${varName}\\s*:\\s*([\\w\\[\\]<>|,& {}]+)`);
    const tsMatch = text.match(tsPattern);
    if (tsMatch?.[1]) {
      return { type: parseJsType(tsMatch[1].trim()), source: "backend", confidence: "high" };
    }

    const valuePatterns = [
      new RegExp(`${varName}\\s*:\\s*(\\{[^}]+\\})`),
      new RegExp(`${varName}\\s*:\\s*(\\[[^\\]]+\\])`),
      new RegExp(`${varName}\\s*:\\s*["'][^"']*["']`),
      new RegExp(`${varName}\\s*:\\s*(\\d+)`),
      new RegExp(`${varName}\\s*:\\s*(true|false)`),
    ];

    for (const pattern of valuePatterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        return inferTypeFromValue(match[1]);
      }
    }

    return undefined;
  }
}

function parsePythonType(typeStr: string): JinjaType {
  if (typeStr === "str" || typeStr === "String") return { kind: "string" };
  if (typeStr === "int" || typeStr === "float" || typeStr === "number") return { kind: "number" };
  if (typeStr === "bool" || typeStr === "Boolean") return { kind: "boolean" };
  if (typeStr === "None" || typeStr === "NoneType") return { kind: "none" };
  if (typeStr === "list" || typeStr.startsWith("List")) return { kind: "list" };
  if (typeStr === "dict" || typeStr.startsWith("Dict")) return { kind: "dict" };
  if (typeStr.startsWith("list[")) {
    return { kind: "list", itemType: parsePythonType(typeStr.slice(5, -1)) };
  }
  if (typeStr.startsWith("dict[")) {
    const parts = typeStr
      .slice(5, -1)
      .split(",")
      .map((s) => s.trim());
    return parts.length > 1
      ? { kind: "dict", valueType: parsePythonType(parts[1]) }
      : { kind: "dict" };
  }
  return { kind: "object", fields: new Map() };
}

function parseJsType(typeStr: string): JinjaType {
  if (typeStr === "string") return { kind: "string" };
  if (typeStr === "number") return { kind: "number" };
  if (typeStr === "boolean") return { kind: "boolean" };
  if (typeStr === "void" || typeStr === "null" || typeStr === "undefined") return { kind: "none" };
  if (typeStr === "any") return { kind: "unknown" };
  if (typeStr.endsWith("[]") || typeStr.startsWith("Array")) return { kind: "list" };
  if (typeStr === "object" || typeStr.startsWith("Record") || typeStr.startsWith("Map")) {
    return { kind: "dict" };
  }
  return { kind: "object", fields: new Map() };
}

function inferTypeFromValue(value: string): TypeHint {
  if (value.startsWith('"') || value.startsWith("'")) {
    return { type: { kind: "string" }, source: "backend", confidence: "high" };
  }
  if (/^\d+(\.\d+)?$/.test(value)) {
    return { type: { kind: "number" }, source: "backend", confidence: "high" };
  }
  if (value === "true" || value === "false" || value === "True" || value === "False") {
    return { type: { kind: "boolean" }, source: "backend", confidence: "high" };
  }
  if (value.startsWith("{")) {
    return { type: { kind: "object", fields: new Map() }, source: "backend", confidence: "medium" };
  }
  if (value.startsWith("[")) {
    return { type: { kind: "list" }, source: "backend", confidence: "medium" };
  }
  return { type: { kind: "unknown" }, source: "backend", confidence: "low" };
}

export function inferTypeFromUsage(templateText: string, varName: string): TypeHint | undefined {
  const memberAccess = new RegExp(`\\{\\{[^}]*\\b${varName}\\.(\\w+)\\b[^}]*\\}\\}`, "g");
  const fields = new Map<string, JinjaType>();
  let match: RegExpExecArray | null;

  while ((match = memberAccess.exec(templateText)) !== null) {
    const fieldName = match[1];
    if (!fields.has(fieldName)) {
      fields.set(fieldName, { kind: "unknown" });
    }
  }

  if (fields.size > 0) {
    return {
      type: { kind: "object", fields },
      source: "usage",
      confidence: fields.size > 2 ? "medium" : "low",
    };
  }

  const listUsage = new RegExp(`\\{\\{[^}]*\\bfor\\s+\\w+\\s+in\\s+${varName}\\b[^}]*\\}\\}`, "i");
  if (listUsage.test(templateText)) {
    return { type: { kind: "list" }, source: "usage", confidence: "medium" };
  }

  return undefined;
}

export function mergeTypeHints(hints: TypeHint[]): TypeHint {
  if (hints.length === 0) {
    return { type: { kind: "unknown" }, source: "inferred", confidence: "low" };
  }

  const backendHint = hints.find((h) => h.source === "backend");
  if (backendHint && backendHint.confidence === "high") {
    return backendHint;
  }

  const usageHint = hints.find((h) => h.source === "usage");
  if (backendHint) {
    return backendHint;
  }
  if (usageHint) {
    return usageHint;
  }

  return hints[0];
}
