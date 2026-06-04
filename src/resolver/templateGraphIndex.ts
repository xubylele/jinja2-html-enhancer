import {
  extractVariables,
  scanTemplateRelations,
  type MacroDefinition,
  type TemplateImportOccurrence,
  type TemplatePathOccurrence,
  type TemplateRelations,
} from "@xubylele/jinja2-enhanced-shared";
import * as vscode from "vscode";

export interface TemplateGraphUpdate {
  uri: vscode.Uri;
}

export type LocalVarKind = "set" | "for";

export interface LocalVarLocation {
  uri: vscode.Uri;
  range: vscode.Range;
  /**
   * `set` — declared via `{% set name = ... %}` at template scope; inherited
   *         by descendants.
   * `for` — declared via `{% for name in ... %}`; loop-scoped and NOT
   *         inherited by descendants. Tracked here only so we can detect
   *         "this name is defined locally — don't try to resolve via the
   *         parent" in the hover provider.
   */
  kind: LocalVarKind;
}

export interface TemplatePathRange {
  occurrence: TemplatePathOccurrence;
  /** Range of the path string (without quotes) inside the source. */
  pathRange: vscode.Range;
}

export interface TemplateImportRange {
  occurrence: TemplateImportOccurrence;
  pathRange: vscode.Range;
}

export interface TemplateNode {
  uri: vscode.Uri;
  /** Raw output of `scanTemplateRelations` — extends/includes/imports/macros + offsets. */
  relations: TemplateRelations;
  /** Pre-computed ranges so consumers don't need to keep the source text. */
  extendsRange: TemplatePathRange | null;
  includeRanges: TemplatePathRange[];
  importRanges: TemplateImportRange[];
  /** Variables locally defined via `{% set %}` / `{% for x in … %}`. */
  localVars: Map<string, LocalVarLocation[]>;
  /** Macros defined locally with their declaration range. */
  macros: Map<string, { definition: MacroDefinition; range: vscode.Range }>;
  /** Used variables found in `{{ … }}`. Useful for downstream consumers. */
  usedVariables: Set<string>;
}

const TEMPLATE_GLOB = "**/*.{html,jinja2,j2,jinja}";

export class TemplateGraphIndex implements vscode.Disposable {
  private readonly nodes = new Map<string, TemplateNode>();
  private readonly emitter = new vscode.EventEmitter<TemplateGraphUpdate>();
  readonly onDidUpdate = this.emitter.event;
  private readonly disposables: vscode.Disposable[] = [];

  constructor() {
    this.registerWatcher();
  }

  async build(): Promise<void> {
    const uris = await vscode.workspace.findFiles(TEMPLATE_GLOB, "**/node_modules/**");
    await Promise.all(uris.map((uri) => this.update(uri, /*silent*/ true)));
    this.emitter.fire({ uri: vscode.Uri.parse("template-graph:build") });
  }

  async update(uri: vscode.Uri, silent = false): Promise<void> {
    let text: string;
    try {
      const bytes = await vscode.workspace.fs.readFile(uri);
      text = Buffer.from(bytes).toString("utf8");
    } catch {
      this.forget(uri, silent);
      return;
    }
    this.nodes.set(uri.toString(), buildNode(uri, text));
    if (!silent) {
      this.emitter.fire({ uri });
    }
  }

  forget(uri: vscode.Uri, silent = false): void {
    const had = this.nodes.delete(uri.toString());
    if (had && !silent) {
      this.emitter.fire({ uri });
    }
  }

  /** Return the parsed node for a template URI, if known. */
  getNode(uri: vscode.Uri): TemplateNode | undefined {
    return this.nodes.get(uri.toString());
  }

  /** Iterate all template nodes. Useful for diagnostics passes. */
  allNodes(): IterableIterator<TemplateNode> {
    return this.nodes.values();
  }

  /** Number of template files indexed. */
  size(): number {
    return this.nodes.size;
  }

  private registerWatcher(): void {
    const watcher = vscode.workspace.createFileSystemWatcher(TEMPLATE_GLOB);
    watcher.onDidChange((uri) => void this.update(uri));
    watcher.onDidCreate((uri) => void this.update(uri));
    watcher.onDidDelete((uri) => this.forget(uri));
    this.disposables.push(watcher);
  }

  dispose(): void {
    for (const d of this.disposables) {
      try {
        d.dispose();
      } catch {
        /* ignore */
      }
    }
    this.disposables.length = 0;
    this.emitter.dispose();
    this.nodes.clear();
  }
}

function buildNode(uri: vscode.Uri, text: string): TemplateNode {
  const relations = scanTemplateRelations(text);
  const { usedVariables } = extractVariables(text);

  const localVars = new Map<string, LocalVarLocation[]>();
  collectDeclarationRanges(text, uri, localVars);

  const macros = new Map<string, { definition: MacroDefinition; range: vscode.Range }>();
  for (const macro of relations.macros) {
    macros.set(macro.name, {
      definition: macro,
      range: rangeFromOffset(text, macro.nameOffset, macro.nameLength),
    });
  }

  const extendsRange = relations.extends
    ? {
        occurrence: relations.extends,
        pathRange: rangeFromOffset(
          text,
          relations.extends.pathOffset,
          relations.extends.pathLength
        ),
      }
    : null;
  const includeRanges = relations.includes.map((occ) => ({
    occurrence: occ,
    pathRange: rangeFromOffset(text, occ.pathOffset, occ.pathLength),
  }));
  const importRanges = relations.imports.map((occ) => ({
    occurrence: occ,
    pathRange: rangeFromOffset(text, occ.pathOffset, occ.pathLength),
  }));

  return {
    uri,
    relations,
    extendsRange,
    includeRanges,
    importRanges,
    localVars,
    macros,
    usedVariables: new Set(usedVariables),
  };
}

function collectDeclarationRanges(
  text: string,
  uri: vscode.Uri,
  out: Map<string, LocalVarLocation[]>
): void {
  const re = /\{%-?\s*(set|for)\s+([A-Za-z_]\w*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const kind = m[1] as LocalVarKind;
    const name = m[2];
    const localOffset = m.index + m[0].lastIndexOf(name);
    const range = rangeFromOffset(text, localOffset, name.length);
    const bucket = out.get(name) ?? [];
    bucket.push({ uri, range, kind });
    out.set(name, bucket);
  }
}

function rangeFromOffset(text: string, offset: number, length: number): vscode.Range {
  return new vscode.Range(offsetToPosition(text, offset), offsetToPosition(text, offset + length));
}

function offsetToPosition(text: string, offset: number): vscode.Position {
  let line = 0;
  let lineStart = 0;
  const limit = Math.min(offset, text.length);
  for (let i = 0; i < limit; i++) {
    if (text.charCodeAt(i) === 10 /* \n */) {
      line++;
      lineStart = i + 1;
    }
  }
  return new vscode.Position(line, offset - lineStart);
}
