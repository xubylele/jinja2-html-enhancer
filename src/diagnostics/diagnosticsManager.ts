import * as vscode from 'vscode';
import { getMessage } from '../ui/notifications/messageHandler';

export class DiagnosticsManager {
  private readonly diagnosticCollection: vscode.DiagnosticCollection;

  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('jinja2');
  }

  public updateDiagnostics(document: vscode.TextDocument, usedVariables: string[], setVariables: string[]) {
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
            getMessage('variableNotSet', variable),
            vscode.DiagnosticSeverity.Warning
          );
          diagnostics.push(diagnostic);
        }
      }
    });

    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  public clear() {
    this.diagnosticCollection.clear();
  }

  public dispose() {
    this.diagnosticCollection.dispose();
  }
}
