import * as vscode from "vscode";
import {
  scanBackendOccurrences,
  normalizeTemplateKey,
  type BackendLang,
  type BackendVarOccurrence,
} from "./backendScanner";

export interface BackendIndexUpdate {
  uri: vscode.Uri;
  templatesTouched: string[];
}

export interface BackendVarLocation {
  uri: vscode.Uri;
  range: vscode.Range;
}

export interface BackendVarSummary {
  name: string;
  locations: BackendVarLocation[];
}

type FileSlice = Map<string, Map<string, BackendVarLocation[]>>;
//                  ^ tplKey       ^ varName  ^ occurrences in that one file

export class BackendIndex implements vscode.Disposable {
  /** tplKey -> varName -> all locations across the workspace. */
  private readonly varsByTemplate = new Map<string, Map<string, BackendVarLocation[]>>();
  /** uri.toString() -> per-file contribution to varsByTemplate. */
  private readonly perFile = new Map<string, FileSlice>();

  private readonly emitter = new vscode.EventEmitter<BackendIndexUpdate>();
  readonly onDidUpdate = this.emitter.event;

  private readonly disposables: vscode.Disposable[] = [];

  constructor() {
    this.registerWatcher();
  }

  async build(): Promise<void> {
    const uris = await vscode.workspace.findFiles("**/*.{py,js,ts}", "**/node_modules/**");
    await Promise.all(uris.map((uri) => this.update(uri, /*silent*/ true)));
    this.emitter.fire({
      uri: vscode.Uri.parse("backend-index:build"),
      templatesTouched: [...this.varsByTemplate.keys()],
    });
  }

  async update(uri: vscode.Uri, silent = false): Promise<void> {
    const lang = detectLang(uri);
    if (!lang) {
      return;
    }
    let text: string;
    try {
      const bytes = await vscode.workspace.fs.readFile(uri);
      text = Buffer.from(bytes).toString("utf8");
    } catch {
      this.forget(uri, silent);
      return;
    }
    const slice = buildSlice(uri, text, lang);
    const touched = this.applyFileSlice(uri, slice);
    if (!silent) {
      this.emitter.fire({ uri, templatesTouched: touched });
    }
  }

  forget(uri: vscode.Uri, silent = false): void {
    const touched = this.applyFileSlice(uri, new Map());
    this.perFile.delete(uri.toString());
    if (!silent && touched.length > 0) {
      this.emitter.fire({ uri, templatesTouched: touched });
    }
  }

  /** Variable names declared on the backend for the given template. */
  getVarsFor(templateUri: vscode.Uri): Set<string> | undefined {
    const map = this.collectFor(templateUri);
    if (!map) {
      return undefined;
    }
    return new Set(map.keys());
  }

  /** Full backend summary (names + every location) for a template. */
  getSummaryFor(templateUri: vscode.Uri): BackendVarSummary[] {
    const map = this.collectFor(templateUri);
    if (!map) {
      return [];
    }
    return [...map.entries()]
      .map(([name, locations]) => ({ name, locations }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /** All locations where `varName` is passed to a render of `templateUri`. */
  getLocationsFor(templateUri: vscode.Uri, varName: string): BackendVarLocation[] {
    const map = this.collectFor(templateUri);
    return map?.get(varName) ?? [];
  }

  private collectFor(templateUri: vscode.Uri): Map<string, BackendVarLocation[]> | undefined {
    const target = normalizeTemplateKey(templateUri.fsPath);
    let merged: Map<string, BackendVarLocation[]> | undefined;
    for (const [key, vars] of this.varsByTemplate) {
      if (target === key || target.endsWith("/" + key)) {
        if (!merged) {
          merged = new Map();
        }
        for (const [name, locs] of vars) {
          const bucket = merged.get(name) ?? [];
          bucket.push(...locs);
          merged.set(name, bucket);
        }
      }
    }
    return merged;
  }

  private applyFileSlice(uri: vscode.Uri, next: FileSlice): string[] {
    const key = uri.toString();
    const prev = this.perFile.get(key) ?? new Map();
    const touched = new Set<string>();

    for (const tplKey of prev.keys()) {
      touched.add(tplKey);
    }

    if (next.size === 0) {
      this.perFile.delete(key);
    } else {
      this.perFile.set(key, next);
      for (const tplKey of next.keys()) {
        touched.add(tplKey);
      }
    }

    // Recompute touched templates from all per-file slices.
    for (const tplKey of touched) {
      const merged = new Map<string, BackendVarLocation[]>();
      for (const slice of this.perFile.values()) {
        const fromFile = slice.get(tplKey);
        if (!fromFile) {
          continue;
        }
        for (const [name, locs] of fromFile) {
          const bucket = merged.get(name) ?? [];
          bucket.push(...locs);
          merged.set(name, bucket);
        }
      }
      if (merged.size === 0) {
        this.varsByTemplate.delete(tplKey);
      } else {
        this.varsByTemplate.set(tplKey, merged);
      }
    }

    return [...touched];
  }

  private registerWatcher(): void {
    const watcher = vscode.workspace.createFileSystemWatcher("**/*.{py,js,ts}");
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
    this.varsByTemplate.clear();
    this.perFile.clear();
  }
}

function detectLang(uri: vscode.Uri): BackendLang | undefined {
  const path = uri.path.toLowerCase();
  if (path.endsWith(".py")) {
    return "py";
  }
  if (path.endsWith(".js") || path.endsWith(".ts")) {
    return "js";
  }
  return undefined;
}

function buildSlice(uri: vscode.Uri, text: string, lang: BackendLang): FileSlice {
  const occurrencesByTpl = scanBackendOccurrences(text, lang);
  const slice: FileSlice = new Map();
  for (const [tplKey, occurrences] of occurrencesByTpl) {
    const byName = new Map<string, BackendVarLocation[]>();
    for (const occ of occurrences) {
      const range = occurrenceToRange(text, occ);
      const bucket = byName.get(occ.name) ?? [];
      bucket.push({ uri, range });
      byName.set(occ.name, bucket);
    }
    if (byName.size > 0) {
      slice.set(tplKey, byName);
    }
  }
  return slice;
}

function occurrenceToRange(text: string, occ: BackendVarOccurrence): vscode.Range {
  const start = offsetToPosition(text, occ.offset);
  const end = offsetToPosition(text, occ.offset + occ.length);
  return new vscode.Range(start, end);
}

function offsetToPosition(text: string, offset: number): vscode.Position {
  let line = 0;
  let lineStart = 0;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text.charCodeAt(i) === 10 /* \n */) {
      line++;
      lineStart = i + 1;
    }
  }
  return new vscode.Position(line, offset - lineStart);
}

// Re-export for callers/tests that previously imported from this module.
export { normalizeTemplateKey };

/** @deprecated Kept for the existing test file; new code should use `scanBackendOccurrences`. */
export function scanBackendFile(text: string, lang: BackendLang): Map<string, Set<string>> {
  const occurrencesByTpl = scanBackendOccurrences(text, lang);
  const out = new Map<string, Set<string>>();
  for (const [tpl, occurrences] of occurrencesByTpl) {
    out.set(tpl, new Set(occurrences.map((o) => o.name)));
  }
  return out;
}
