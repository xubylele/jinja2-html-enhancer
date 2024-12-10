import * as vscode from 'vscode';
import { extractVariables, analyzeNestedStructures } from './variableAnalyzer';
import { DiagnosticsManager } from './diagnosticsManager';

export class FileWatcher {
  private readonly watcher: vscode.FileSystemWatcher;
  private readonly diagnosticsManager: DiagnosticsManager;

  constructor(diagnosticsManager: DiagnosticsManager) {
    this.diagnosticsManager = diagnosticsManager;
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

    // Combine setVariables and nestedVariables
    const allSetVariables = [...new Set([...setVariables, ...nestedVariables])];

    this.diagnosticsManager.updateDiagnostics(document, usedVariables, allSetVariables);
  }

  public dispose() {
    this.watcher.dispose();
  }
}
