import * as vscode from 'vscode';
import { DiagnosticsManager } from '../diagnostics/diagnosticsManager';
import { analyzeNestedStructures, extractVariables } from '../diagnostics/variableAnalyzer';

export class FileWatcher {
  private readonly diagnosticsManager: DiagnosticsManager;
  private readonly watcher: vscode.FileSystemWatcher;
  private _onDidAnalyzeDocument = new vscode.EventEmitter<{
    usedVariables: string[];
    setVariables: string[];
  }>();

  public readonly onDidAnalyzeDocument = this._onDidAnalyzeDocument.event;

  constructor(diagnosticsManager: DiagnosticsManager) {
    this.diagnosticsManager = diagnosticsManager;
    this.watcher = vscode.workspace.createFileSystemWatcher('**/*.html');
    this.watcher.onDidChange(this.analyzeDocument.bind(this));
    this.watcher.onDidCreate(this.analyzeDocument.bind(this));

    this.diagnosticsManager.onDidUpdateDiagnostics(({ usedVariables, setVariables }) => {
      this._onDidAnalyzeDocument.fire({ usedVariables, setVariables });
    });
  }

  public analyzeDocument(document: vscode.TextDocument | vscode.Uri) {
    const customVariables = vscode.workspace.getConfiguration('jinja2-html-enhancer').get('customVariables', {});
    if (document instanceof vscode.Uri) {
      vscode.workspace.openTextDocument(document).then(this.analyzeDocument.bind(this));
      return;
    }

    const text = document.getText();
    const { usedVariables, setVariables } = extractVariables(text);
    const nestedVariables = analyzeNestedStructures(text);

    const allSetVariables = [...new Set([...setVariables, ...nestedVariables, ...(customVariables ? Object.keys(customVariables) : [])])];

    this.diagnosticsManager.updateDiagnostics(document, usedVariables, allSetVariables);

    return {
      usedVariables,
      setVariables: allSetVariables,
    };
  }

  public dispose() {
    this.watcher.dispose();
    this._onDidAnalyzeDocument.dispose();
  }
}
