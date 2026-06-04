import * as vscode from "vscode";
import { scanTemplateRelations } from "@xubylele/jinja2-enhanced-shared";
import { TemplateRootsProvider } from "../resolver/templateRoots";
import { resolveToFilePath } from "../resolver/templateResolution";

/**
 * F12 / Ctrl-click on the path string inside `{% extends %}`,
 * `{% include %}`, `{% import %}`, or `{% from %}` jumps to the resolved
 * template file (line 0).
 */
export class TemplateDefinitionProvider implements vscode.DefinitionProvider {
  constructor(private readonly roots: TemplateRootsProvider) {}

  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Definition | undefined> {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const relations = scanTemplateRelations(text);

    const allPaths = [
      ...(relations.extends ? [relations.extends] : []),
      ...relations.includes,
      ...relations.imports,
    ];

    const hit = allPaths.find(
      (p) => offset >= p.pathOffset && offset <= p.pathOffset + p.pathLength
    );
    if (!hit) {
      return undefined;
    }

    const roots = await this.roots.get();
    const fsPath = await resolveToFilePath(hit.path, document.uri.fsPath, roots);
    if (!fsPath) {
      return undefined;
    }

    return new vscode.Location(vscode.Uri.file(fsPath), new vscode.Position(0, 0));
  }
}
