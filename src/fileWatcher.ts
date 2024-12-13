import * as vscode from 'vscode';
import { VariablePanelManager } from './variablePanel';

class DiagnosticsManager {

  updateDiagnostics(document: vscode.TextDocument, usedVariables: string[], setVariables: string[]) {
    // Implementation for updating diagnostics
  }
}

export class FileWatcher {
  private readonly diagnosticsManager: DiagnosticsManager;
  private readonly variablePanelManager: VariablePanelManager;
  private readonly watcher: vscode.FileSystemWatcher;

  constructor(diagnosticsManager: DiagnosticsManager, variablePanelManager: VariablePanelManager) {
    this.diagnosticsManager = diagnosticsManager;
    this.variablePanelManager = variablePanelManager;
    this.watcher = vscode.workspace.createFileSystemWatcher('**/*.html');
    this.watcher.onDidChange(this.analyzeDocument.bind(this));
    this.watcher.onDidCreate(this.analyzeDocument.bind(this));
  }

  public analyzeDocument(document: vscode.TextDocument | vscode.Uri) {
    if (document instanceof vscode.Uri) {
      vscode.workspace.openTextDocument(document).then(this.analyzeDocument.bind(this));
      return;
    }

    const text = document.getText();
    const { usedVariables, setVariables } = extractVariables(text);
    const nestedVariables = analyzeNestedStructures(text);

    const allSetVariables = [...new Set([...setVariables, ...nestedVariables])];

    this.diagnosticsManager.updateDiagnostics(document, usedVariables, allSetVariables);
    this.variablePanelManager.show(usedVariables, allSetVariables);

    return {
      usedVariables,
      setVariables,
    };
  }

  public dispose() {
    this.watcher.dispose();
  }
}

function extractVariables(text: string): { usedVariables: string[], setVariables: string[] } {
  return { usedVariables: [], setVariables: [] };
}

function analyzeNestedStructures(text: string): string[] {
  return [];
}
