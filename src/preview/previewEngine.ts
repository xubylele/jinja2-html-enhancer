import * as vscode from "vscode";
import { BackendIndex } from "../intelligence/backendIndex";
import { scanBackendOccurrences } from "../intelligence/backendScanner";
import { TemplateGraphIndex } from "../resolver/templateGraphIndex";
import { TemplateRootsProvider } from "../resolver/templateRoots";

/**
 * Builds a render context for a Jinja2 template by scanning backend files
 * (Python/JS/TS) for render calls that reference the template, and by reading
 * locally-set variables from the template graph.
 *
 * The resulting context is a flat key→value map where every value defaults to
 * the variable name itself (useful as a placeholder). Profile-defined values
 * in the preview panel always override these defaults.
 */
export class PreviewEngine {
  constructor(
    private readonly backendIndex: BackendIndex,
    private readonly templateGraph: TemplateGraphIndex,
    private readonly templateRoots: TemplateRootsProvider
  ) {}

  async getRoots(): Promise<string[]> {
    return this.templateRoots.get();
  }

  async buildContext(templateUri: vscode.Uri): Promise<Record<string, unknown>> {
    const context: Record<string, unknown> = {};

    // 1. Backend-declared variables from the BackendIndex.
    const summaries = this.backendIndex.getSummaryFor(templateUri);
    for (const { name } of summaries) {
      if (!(name in context)) {
        context[name] = name;
      }
    }

    // 2. Fallback: scan backend files directly (catches templates not yet in the
    //    index because they were opened before the watcher indexed those files).
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(templateUri);
    if (workspaceFolder) {
      const templateKey = await this.getTemplateKey(templateUri);
      const backendFiles = await vscode.workspace.findFiles(
        new vscode.RelativePattern(workspaceFolder, "**/*.{py,js,ts}"),
        "**/node_modules/**"
      );

      for (const file of backendFiles) {
        try {
          const content = await vscode.workspace.fs.readFile(file);
          const text = Buffer.from(content).toString("utf8");
          const lang = detectLang(file);
          if (!lang) continue;
          const occurrences = scanBackendOccurrences(text, lang);
          const vars = occurrences.get(templateKey);
          if (vars) {
            for (const occ of vars) {
              if (!(occ.name in context)) {
                context[occ.name] = occ.name;
              }
            }
          }
        } catch {
          // Skip unreadable files
        }
      }
    }

    // 3. Template-graph local variables ({% set %} declarations).
    const node = this.templateGraph.getNode(templateUri);
    if (node) {
      for (const [name, locations] of node.localVars.entries()) {
        if (!(name in context)) {
          context[name] = locations.length > 0 ? name : "";
        }
      }
    }

    return context;
  }

  private async getTemplateKey(uri: vscode.Uri): Promise<string> {
    const roots = await this.templateRoots.get();
    for (const root of roots) {
      if (uri.fsPath.startsWith(root)) {
        return uri.fsPath.replace(root + "/", "");
      }
    }
    return uri.fsPath;
  }
}

function detectLang(uri: vscode.Uri): "py" | "js" | undefined {
  const p = uri.path.toLowerCase();
  if (p.endsWith(".py")) return "py";
  if (p.endsWith(".js") || p.endsWith(".ts")) return "js";
  return undefined;
}
