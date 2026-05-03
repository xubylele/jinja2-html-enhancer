import * as vscode from 'vscode';
import { getConfiguration, getVscodeConfigTarget } from '../config/configService';
import { DiagnosticsManager } from '../diagnostics/diagnosticsManager';
import { analyzeNestedStructures, extractVariables } from '@xubylele/jinja2-enhanced-shared';
import I18n from '../translations';

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

  public async analyzeDocument(document: vscode.TextDocument | vscode.Uri) {
    const canCheckVariables = await getConfiguration('toggleVariableCheck');

    if (!canCheckVariables) {
      vscode.window.showWarningMessage(I18n.__('warning.noToggleVariableCheck'));
      return;
    }

    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showWarningMessage(I18n.__('error.noActiveEditor'));
      return;
    }

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(activeEditor.document.uri);
    if (!workspaceFolder) {
      vscode.window.showWarningMessage(I18n.__('warning.noWorkspaceFolder'));
    }

    const target = getVscodeConfigTarget(activeEditor);
    const config = (target === vscode.ConfigurationTarget.WorkspaceFolder) && workspaceFolder
      ? vscode.workspace.getConfiguration('jinja2-html-enhancer', workspaceFolder.uri)
      : vscode.workspace.getConfiguration('jinja2-html-enhancer');

    const customVariables: { [key: string]: string[] } = config.get('customVariables', {});

    if (document instanceof vscode.Uri) {
      vscode.workspace.openTextDocument(document).then(this.analyzeDocument.bind(this));
      return;
    }

    const text = document.getText();
    const { usedVariables, setVariables } = extractVariables(text);
    const nestedVariables = analyzeNestedStructures(text);

    const allSetVariables = [...new Set([...setVariables, ...nestedVariables, ...(customVariables ? Object.values(customVariables).flat() : [])])];
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
