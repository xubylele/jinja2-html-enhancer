import * as vscode from 'vscode';
import I18n from '../translations';

export class DiagnosticsManager {
  private readonly diagnosticCollection: vscode.DiagnosticCollection;
  private _onDidUpdateDiagnostics = new vscode.EventEmitter<{
    usedVariables: string[];
    setVariables: string[];
  }>();

  public readonly onDidUpdateDiagnostics = this._onDidUpdateDiagnostics.event;

  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('jinja2');
  }

  public updateDiagnostics(
    document: vscode.TextDocument,
    usedVariables: string[],
    setVariables: string[],
  ) {
    const diagnostics: vscode.Diagnostic[] = [];

    usedVariables.forEach(variable => {
      if (!setVariables.includes(variable)) {
        const regex = new RegExp(`\\{\\{\\s*(${variable})\\s*\\}\\}`, 'g');
        let match;
        while ((match = regex.exec(document.getText())) !== null) {
          const startPos = document.positionAt(match.index);
          const endPos = document.positionAt(match.index + match[0].length);
          const range = new vscode.Range(startPos, endPos);

          const diagnostic = new vscode.Diagnostic(
            range,
            I18n.__('variable.variableNotSet', { variable }),
            vscode.DiagnosticSeverity.Warning
          );
          diagnostic.code = 'JHE0001';
          diagnostics.push(diagnostic);
        }
      }
    });

    this.diagnosticCollection.set(document.uri, diagnostics);
    this.diagnosticCollection.set(document.uri, diagnostics);
    this._onDidUpdateDiagnostics.fire({ usedVariables, setVariables });
  }

  public clear() {
    this.diagnosticCollection.clear();
  }

  public dispose() {
    this.diagnosticCollection.dispose();
    this._onDidUpdateDiagnostics.dispose();
  }
}
