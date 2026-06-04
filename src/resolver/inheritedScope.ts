import { resolveTemplatePath } from "@xubylele/jinja2-enhanced-shared";
import * as vscode from "vscode";
import { TemplateGraphIndex, TemplateNode } from "./templateGraphIndex";
import { TemplateRootsProvider } from "./templateRoots";

export type InheritedSymbolKind = "set" | "macro" | "imported-macro" | "imported-namespace";

export interface InheritedSymbol {
  name: string;
  kind: InheritedSymbolKind;
  /** File where the symbol is defined. */
  originUri: vscode.Uri;
  /** Range of the declaring identifier in the origin file. */
  originRange: vscode.Range;
  /** Path string as it appears in the {% extends %} / etc. tag of the closest descendant. */
  viaPath?: string;
}

interface ResolverDeps {
  index: TemplateGraphIndex;
  roots: TemplateRootsProvider;
}

/**
 * Returns every symbol in scope for `templateUri` that is NOT defined in the
 * file itself. Walks `{% extends %}` parents transitively, plus direct
 * `{% include %}` and `{% import %}` / `{% from … import … %}` neighbors.
 *
 * Cycle-guarded by URI string. The starting node's locally-defined symbols
 * are intentionally omitted — callers already know what's local.
 */
export async function getInheritedScope(
  templateUri: vscode.Uri,
  deps: ResolverDeps
): Promise<InheritedSymbol[]> {
  const start = deps.index.getNode(templateUri);
  if (!start) {
    return [];
  }

  const roots = await deps.roots.get();
  const visited = new Set<string>([templateUri.toString()]);
  const out: InheritedSymbol[] = [];

  await walkAncestors(start, deps.index, roots, visited, out);
  collectImports(start, deps.index, roots, visited, out);
  await collectIncludes(start, deps.index, roots, visited, out);

  return out;
}

async function walkAncestors(
  node: TemplateNode,
  index: TemplateGraphIndex,
  roots: string[],
  visited: Set<string>,
  out: InheritedSymbol[]
): Promise<void> {
  const ext = node.relations.extends;
  if (!ext) {
    return;
  }

  const parent = resolveToNode(ext.path, node, index, roots);
  if (!parent) {
    return;
  }
  if (visited.has(parent.uri.toString())) {
    return;
  }
  visited.add(parent.uri.toString());

  collectLocals(parent, ext.path, out);
  collectImports(parent, index, roots, visited, out);
  await walkAncestors(parent, index, roots, visited, out);
}

async function collectIncludes(
  node: TemplateNode,
  index: TemplateGraphIndex,
  roots: string[],
  visited: Set<string>,
  out: InheritedSymbol[]
): Promise<void> {
  for (const inc of node.relations.includes) {
    const target = resolveToNode(inc.path, node, index, roots);
    if (!target) {
      continue;
    }
    if (visited.has(target.uri.toString())) {
      continue;
    }
    visited.add(target.uri.toString());
    // Includes inject macros (commonly-used pattern); set/for vars in an
    // included partial are scoped to it and are intentionally NOT inherited.
    for (const [name, info] of target.macros) {
      out.push({
        name,
        kind: "macro",
        originUri: target.uri,
        originRange: info.range,
        viaPath: inc.path,
      });
    }
  }
}

function collectImports(
  node: TemplateNode,
  index: TemplateGraphIndex,
  roots: string[],
  visited: Set<string>,
  out: InheritedSymbol[]
): void {
  for (const imp of node.relations.imports) {
    const target = resolveToNode(imp.path, node, index, roots);
    if (!target) {
      continue;
    }
    if (imp.kind === "import" && imp.alias) {
      out.push({
        name: imp.alias,
        kind: "imported-namespace",
        originUri: target.uri,
        originRange: new vscode.Range(0, 0, 0, 0),
        viaPath: imp.path,
      });
    }
    if (imp.kind === "from" && imp.names) {
      for (const entry of imp.names) {
        const macroInfo = target.macros.get(entry.name);
        const localName = entry.alias ?? entry.name;
        out.push({
          name: localName,
          kind: "imported-macro",
          originUri: target.uri,
          originRange: macroInfo?.range ?? new vscode.Range(0, 0, 0, 0),
          viaPath: imp.path,
        });
      }
    }
  }
}

function collectLocals(parent: TemplateNode, viaPath: string, out: InheritedSymbol[]): void {
  for (const [name, locations] of parent.localVars) {
    // Only `{% set %}` declarations are inheritable — `{% for x in ... %}`
    // loop vars are scoped to the loop body in the parent and must not
    // appear in descendants.
    const setLoc = locations.find((l) => l.kind === "set");
    if (!setLoc) {
      continue;
    }
    out.push({
      name,
      kind: "set",
      originUri: parent.uri,
      originRange: setLoc.range,
      viaPath,
    });
  }
  for (const [name, info] of parent.macros) {
    out.push({
      name,
      kind: "macro",
      originUri: parent.uri,
      originRange: info.range,
      viaPath,
    });
  }
}

/**
 * Resolve a path string written in a `{% extends %}` / `{% include %}` /
 * `{% import %}` tag to a TemplateNode known to the index.
 */
export function resolveToNode(
  rawPath: string,
  fromNode: TemplateNode,
  index: TemplateGraphIndex,
  roots: string[]
): TemplateNode | undefined {
  const candidates = resolveTemplatePath(rawPath, fromNode.uri.fsPath, roots);
  for (const fsPath of candidates) {
    const candidate = index.getNode(vscode.Uri.file(fsPath));
    if (candidate) {
      return candidate;
    }
  }
  return undefined;
}

/**
 * Return the first existing absolute filesystem path for a tag's path string,
 * even when the target file isn't in the index. Probes the filesystem.
 */
export async function resolveToFilePath(
  rawPath: string,
  fromFsPath: string | null,
  roots: string[]
): Promise<string | undefined> {
  const candidates = resolveTemplatePath(rawPath, fromFsPath, roots);
  for (const candidate of candidates) {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(candidate));
      return candidate;
    } catch {
      // try next
    }
  }
  return undefined;
}
