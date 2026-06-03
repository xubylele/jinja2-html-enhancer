// Pure backend-call scanner. No vscode, no I/O — operates on strings only.

export type BackendLang = "py" | "js";

/** A single occurrence of a variable name passed to a render call. */
export interface BackendVarOccurrence {
  /** Variable name as it appears at the call site (e.g. `user`). */
  name: string;
  /** Offset of the variable's identifier within the source text. */
  offset: number;
  /** Length of the identifier in characters. */
  length: number;
}

interface FrameworkPattern {
  anchor: RegExp;
  argStyle: "pyKwargs" | "pyDict" | "jsObject";
  /** When true, walk past an outer arg list to reach a `.render(` call. */
  chainedRender?: boolean;
}

const PY_PATTERNS: FrameworkPattern[] = [
  {
    anchor: /\brender_template\s*\(\s*['"]([^'"]+)['"]/g,
    argStyle: "pyKwargs",
  },
  {
    anchor: /\brender\s*\(\s*[A-Za-z_][\w.]*\s*,\s*['"]([^'"]+)['"]/g,
    argStyle: "pyDict",
  },
  { anchor: /\bTemplateResponse\s*\(\s*['"]([^'"]+)['"]/g, argStyle: "pyDict" },
  {
    anchor: /\.get_template\s*\(\s*['"]([^'"]+)['"]\s*\)\s*\.render\s*\(/g,
    argStyle: "pyKwargs",
    chainedRender: true,
  },
];

const JS_PATTERNS: FrameworkPattern[] = [
  { anchor: /\.render\s*\(\s*['"]([^'"]+)['"]/g, argStyle: "jsObject" },
  {
    anchor: /\b(?:env|nunjucks)\.render\s*\(\s*['"]([^'"]+)['"]/g,
    argStyle: "jsObject",
  },
];

const JS_RESERVED = new Set([
  "true",
  "false",
  "null",
  "undefined",
  "if",
  "else",
  "for",
  "while",
  "do",
  "return",
  "function",
  "const",
  "let",
  "var",
  "new",
  "this",
  "class",
  "typeof",
  "instanceof",
  "in",
  "of",
  "await",
  "async",
  "yield",
  "try",
  "catch",
  "finally",
  "throw",
  "switch",
  "case",
  "break",
  "continue",
  "default",
  "delete",
  "void",
  "with",
  "extends",
  "super",
  "import",
  "export",
  "from",
  "as",
]);

/** Pure scan: returns occurrences keyed by normalized template path. */
export function scanBackendOccurrences(
  text: string,
  lang: BackendLang
): Map<string, BackendVarOccurrence[]> {
  const out = new Map<string, BackendVarOccurrence[]>();
  const patterns = lang === "py" ? PY_PATTERNS : JS_PATTERNS;

  for (const pattern of patterns) {
    pattern.anchor.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.anchor.exec(text)) !== null) {
      const tplKey = normalizeTemplateKey(match[1]);
      const argsOpen = pattern.chainedRender
        ? match.index + match[0].length - 1
        : text.indexOf("(", match.index);
      if (argsOpen < 0 || argsOpen >= match.index + match[0].length) {
        continue;
      }
      const argsEnd = walkBalanced(text, argsOpen, "(", ")");
      if (argsEnd < 0) {
        continue;
      }

      // Offset of the args body within the full document.
      const argsBodyOffset = argsOpen + 1;
      const argsBody = text.slice(argsBodyOffset, argsEnd);
      const occurrences = extractArgs(argsBody, argsBodyOffset, pattern.argStyle);
      if (occurrences.length === 0) {
        continue;
      }

      let bucket = out.get(tplKey);
      if (!bucket) {
        bucket = [];
        out.set(tplKey, bucket);
      }
      bucket.push(...occurrences);
    }
  }
  return out;
}

/** Walk balanced delimiters from index `start` (which must point at `open`). Returns index of matching close, or -1. */
function walkBalanced(text: string, start: number, open: string, close: string): number {
  if (text[start] !== open) {
    return -1;
  }
  let depth = 1;
  let i = start + 1;
  let inStr: string | null = null;
  while (i < text.length) {
    const ch = text[i];
    if (inStr) {
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === inStr) {
        inStr = null;
      }
    } else if (ch === '"' || ch === "'" || ch === "`") {
      inStr = ch;
    } else if (ch === open) {
      depth++;
    } else if (ch === close) {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
    i++;
  }
  return -1;
}

function extractArgs(
  args: string,
  baseOffset: number,
  style: FrameworkPattern["argStyle"]
): BackendVarOccurrence[] {
  switch (style) {
    case "pyKwargs":
      return mergeOccurrences(
        extractPyKwargs(args, baseOffset),
        extractPyDictKeys(args, baseOffset)
      );
    case "pyDict":
      return mergeOccurrences(
        extractPyKwargs(args, baseOffset),
        extractPyDictKeys(args, baseOffset)
      );
    case "jsObject":
      return extractJsObjectKeys(args, baseOffset);
  }
}

function mergeOccurrences(...lists: BackendVarOccurrence[][]): BackendVarOccurrence[] {
  const out: BackendVarOccurrence[] = [];
  for (const list of lists) {
    out.push(...list);
  }
  return out;
}

function extractPyKwargs(args: string, baseOffset: number): BackendVarOccurrence[] {
  const out: BackendVarOccurrence[] = [];
  const re = /(?:^|[\s,(])([A-Za-z_]\w*)\s*=(?!=)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(args)) !== null) {
    const name = m[1];
    const localOffset = m.index + m[0].lastIndexOf(name);
    out.push({ name, offset: baseOffset + localOffset, length: name.length });
  }
  return out;
}

function extractPyDictKeys(args: string, baseOffset: number): BackendVarOccurrence[] {
  const out: BackendVarOccurrence[] = [];
  const re = /['"]([A-Za-z_]\w*)['"]\s*:/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(args)) !== null) {
    const name = m[1];
    // m.index points at the opening quote; the identifier starts +1.
    out.push({ name, offset: baseOffset + m.index + 1, length: name.length });
  }
  return out;
}

function extractJsObjectKeys(args: string, baseOffset: number): BackendVarOccurrence[] {
  const braceStart = args.indexOf("{");
  if (braceStart < 0) {
    return [];
  }
  const braceEnd = walkBalanced(args, braceStart, "{", "}");
  if (braceEnd < 0) {
    return [];
  }
  const bodyStart = braceStart + 1;
  // Append a sentinel `,` so trailing shorthand keys ({ foo }) terminate.
  const body = args.slice(bodyStart, braceEnd) + ",";

  const out: BackendVarOccurrence[] = [];
  const seen = new Set<string>();
  const re = /(?:^|[\s,{])(?:['"]([A-Za-z_$][\w$]*)['"]|([A-Za-z_$][\w$]*))\s*([,:}])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const name = m[1] ?? m[2];
    const sep = m[3];
    if (sep !== ":" && sep !== "," && sep !== "}") {
      continue;
    }
    if (!m[1] && JS_RESERVED.has(name)) {
      continue;
    }
    if (seen.has(name)) {
      continue;
    }
    seen.add(name);
    // Locate the identifier within m[0]; works for both quoted and bare.
    const inMatch = m[0].lastIndexOf(name);
    const localOffset = m.index + inMatch;
    if (localOffset >= body.length - 1) {
      continue;
    } // skip sentinel
    out.push({
      name,
      offset: baseOffset + bodyStart + localOffset,
      length: name.length,
    });
  }
  return out;
}

export function normalizeTemplateKey(raw: string): string {
  let s = raw.replace(/\\/g, "/");
  while (s.startsWith("./")) {
    s = s.slice(2);
  }
  while (s.startsWith("/")) {
    s = s.slice(1);
  }
  return s;
}
