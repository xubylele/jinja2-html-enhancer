import * as path from "path";
import * as vscode from "vscode";

const CONFIG_KEY = "jinja2-html-enhancer";
const SETTING = "templateRoots";

/**
 * Owns the list of absolute filesystem directories to try as roots when
 * resolving `{% extends %}` / `{% include %}` / `{% import %}` paths.
 *
 * Resolution order at lookup time:
 *   1. User-configured roots (`jinja2-html-enhancer.templateRoots`),
 *      resolved against each workspace folder when relative.
 *   2. Auto-discovered directories named `templates` anywhere under each
 *      workspace folder (excluding `node_modules`).
 *
 * The cache is invalidated when the config changes, when workspace folders
 * change, or when files matching the auto-discovery pattern are created
 * or deleted.
 */
export class TemplateRootsProvider implements vscode.Disposable {
  private cache: string[] | null = null;
  private readonly emitter = new vscode.EventEmitter<void>();
  readonly onDidChange = this.emitter.event;
  private readonly disposables: vscode.Disposable[] = [];

  constructor() {
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration(`${CONFIG_KEY}.${SETTING}`)) {
          this.invalidate();
        }
      }),
      vscode.workspace.onDidChangeWorkspaceFolders(() => this.invalidate())
    );

    // Auto-discovery only watches directory creation/deletion of `templates`.
    // Heuristic: any new file under a `templates/...` path should refresh
    // the cache in case a brand-new `templates` dir just appeared.
    const watcher = vscode.workspace.createFileSystemWatcher("**/templates/**");
    watcher.onDidCreate(() => this.invalidate());
    watcher.onDidDelete(() => this.invalidate());
    this.disposables.push(watcher);
  }

  async get(): Promise<string[]> {
    if (this.cache) {
      return this.cache;
    }
    this.cache = await this.compute();
    return this.cache;
  }

  invalidate(): void {
    this.cache = null;
    this.emitter.fire();
  }

  private async compute(): Promise<string[]> {
    const folders = vscode.workspace.workspaceFolders ?? [];
    const out: string[] = [];
    const seen = new Set<string>();
    const push = (p: string) => {
      const abs = toPosix(p);
      if (!seen.has(abs)) {
        seen.add(abs);
        out.push(abs);
      }
    };

    // 1. User-configured roots take priority.
    for (const folder of folders) {
      const cfg = vscode.workspace
        .getConfiguration(CONFIG_KEY, folder.uri)
        .get<string[]>(SETTING, []);
      for (const entry of cfg) {
        if (typeof entry !== "string" || entry.trim().length === 0) {
          continue;
        }
        if (path.isAbsolute(entry)) {
          push(entry);
        } else {
          push(path.join(folder.uri.fsPath, entry));
        }
      }
    }

    // 2. Auto-discovered `templates/` directories.
    if (folders.length > 0) {
      try {
        const discovered = await vscode.workspace.findFiles(
          "**/templates/**/*",
          "**/node_modules/**",
          1000
        );
        for (const uri of discovered) {
          const root = findTemplatesRoot(uri.fsPath);
          if (root) {
            push(root);
          }
        }
      } catch {
        // ignore — workspace may have no folders
      }
    }

    return out;
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
    this.cache = null;
  }
}

/** Walk up the path to find the closest enclosing directory named `templates`. */
function findTemplatesRoot(filePath: string): string | null {
  const posix = toPosix(filePath);
  const segments = posix.split("/");
  // Largest index lets us pick the deepest `templates` segment in case of nesting.
  for (let i = segments.length - 1; i >= 0; i--) {
    if (segments[i] === "templates") {
      return segments.slice(0, i + 1).join("/");
    }
  }
  return null;
}

function toPosix(p: string): string {
  return p.replace(/\\/g, "/");
}
