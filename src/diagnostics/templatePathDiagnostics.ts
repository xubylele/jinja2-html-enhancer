import * as vscode from "vscode";
import { scanTemplateRelations } from "@xubylele/jinja2-enhanced-shared";
import I18n from "../translations";
import { TemplateRootsProvider } from "../resolver/templateRoots";
import { resolveToFilePath } from "../resolver/templateResolution";
import { detectExtendsCycle, ExtendsCycleDeps } from "../resolver/extendsCycle";

export const DIAGNOSTIC_COLLECTION_NAME = "jinja2-templates";
export const JHE1101 = "JHE1101"; // unresolved template path
export const JHE1102 = "JHE1102"; // circular extends chain

/** Structural shape shared by extends / include / import path occurrences. */
interface PathOccurrence {
  path: string;
  pathOffset: number;
  pathLength: number;
}

/**
 * Owns the local template-path diagnostics: `JHE1101` (a referenced template
 * cannot be resolved) and `JHE1102` (the `{% extends %}` chain loops).
 *
 * Resolution is on-demand per document — no persistent template graph.
 */
export class TemplatePathDiagnostics implements vscode.Disposable {
  private readonly collection: vscode.DiagnosticCollection;

  constructor(private readonly roots: TemplateRootsProvider) {
    this.collection = vscode.languages.createDiagnosticCollection(DIAGNOSTIC_COLLECTION_NAME);
  }

  async analyzeDocument(document: vscode.TextDocument): Promise<void> {
    if (document.languageId !== "html" && document.languageId !== "jinja2") {
      return;
    }

    const roots = await this.roots.get();
    const relations = scanTemplateRelations(document.getText());
    const diagnostics: vscode.Diagnostic[] = [];
    const deps = this.cycleDeps(roots);

    if (relations.extends) {
      const ext = relations.extends;
      const target = await resolveToFilePath(ext.path, document.uri.fsPath, roots);
      if (!target) {
        diagnostics.push(this.unresolved(document, ext));
      } else if (await detectExtendsCycle(document.uri.fsPath, deps)) {
        diagnostics.push(this.circular(document, ext));
      }
    }

    for (const inc of relations.includes) {
      if (!(await resolveToFilePath(inc.path, document.uri.fsPath, roots))) {
        diagnostics.push(this.unresolved(document, inc));
      }
    }

    for (const imp of relations.imports) {
      if (!(await resolveToFilePath(imp.path, document.uri.fsPath, roots))) {
        diagnostics.push(this.unresolved(document, imp));
      }
    }

    this.collection.set(document.uri, diagnostics);
  }

  clear(uri: vscode.Uri): void {
    this.collection.delete(uri);
  }

  private cycleDeps(roots: string[]): ExtendsCycleDeps {
    return {
      readExtendsPath: async (fsPath) => {
        try {
          const bytes = await vscode.workspace.fs.readFile(vscode.Uri.file(fsPath));
          const text = Buffer.from(bytes).toString("utf8");
          return scanTemplateRelations(text).extends?.path ?? null;
        } catch {
          return null;
        }
      },
      resolvePath: async (rawPath, fromFsPath) =>
        (await resolveToFilePath(rawPath, fromFsPath, roots)) ?? null,
    };
  }

  private rangeOf(document: vscode.TextDocument, occ: PathOccurrence): vscode.Range {
    return new vscode.Range(
      document.positionAt(occ.pathOffset),
      document.positionAt(occ.pathOffset + occ.pathLength)
    );
  }

  private unresolved(document: vscode.TextDocument, occ: PathOccurrence): vscode.Diagnostic {
    const d = new vscode.Diagnostic(
      this.rangeOf(document, occ),
      I18n.__("templatePath.unresolved", { path: occ.path }),
      vscode.DiagnosticSeverity.Warning
    );
    d.code = JHE1101;
    d.source = "jinja2-html-enhancer";
    return d;
  }

  private circular(document: vscode.TextDocument, occ: PathOccurrence): vscode.Diagnostic {
    const d = new vscode.Diagnostic(
      this.rangeOf(document, occ),
      I18n.__("templatePath.circular"),
      vscode.DiagnosticSeverity.Error
    );
    d.code = JHE1102;
    d.source = "jinja2-html-enhancer";
    return d;
  }

  dispose(): void {
    this.collection.dispose();
  }
}
