import * as vscode from 'vscode';
import { FileWatcher } from '../watchers/fileWatcher';
import I18n from '../translations';
import { VariablePanelManager } from '../ui/panels/variablePanel';
import { extractVariableName } from 'utils/variables';

export class CommandManager {
  private fileWatcher: FileWatcher;
  private variablePanelManager: VariablePanelManager;

  constructor(fileWatcher: FileWatcher, variablePanelManager: VariablePanelManager) {
    this.fileWatcher = fileWatcher;
    this.variablePanelManager = variablePanelManager;
  }

  private async getCustomVariables(): Promise<{ [key: string]: string[] }> {
    const config = vscode.workspace.getConfiguration("jinja2-html-enhancer");
    return config.get('customVariables', {});
  }

  public async checkVariables() {
    vscode.window.showInformationMessage(I18n.__('variable.checkingVariables'));
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const result = this.fileWatcher.analyzeDocument(editor.document);
      if (result) {
        vscode.window.showInformationMessage(I18n.__('variable.variablesChecked'));
      }
    } else {
      vscode.window.showWarningMessage(I18n.__('error.noActiveEditor'));
    }
  }

  public openVariablePanel() {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const result = this.fileWatcher.analyzeDocument(editor.document);
      if (result) {
        this.variablePanelManager.show(result.usedVariables, result.setVariables);
      }
    } else {
      vscode.window.showWarningMessage(I18n.__('error.noActiveEditor'));
    }
  }

  public async saveVariable(diagnosticMessage: string) {
    const variable = extractVariableName(diagnosticMessage);
    const activeEditor = vscode.window.activeTextEditor;

    if (!variable) {
      vscode.window.showWarningMessage(I18n.__('error.variableNotFound'));
      return;
    }

    if (!activeEditor) {
      vscode.window.showWarningMessage(I18n.__('error.noActiveEditor'));
      return;
    }
    const filePath = activeEditor.document.uri.fsPath;

    const target = vscode.workspace.workspaceFolders
      ? vscode.ConfigurationTarget.WorkspaceFolder
      : vscode.ConfigurationTarget.Workspace;

    const targetTranslation = target === vscode.ConfigurationTarget.WorkspaceFolder
      ? I18n.__('quickFix.workspaceTarget')
      : I18n.__('quickFix.globalTarget');

    const config = vscode.workspace.getConfiguration("jinja2-html-enhancer");

    const currentVariables: { [key: string]: string[] } = config.get('customVariables', {});

    if (currentVariables[filePath] && currentVariables[filePath].includes(variable)) {
      vscode.window.showWarningMessage(I18n.__('variable.variableExists', { variable }));
      return;
    }

    if (!currentVariables[filePath]) {
      currentVariables[filePath] = [];
    }
    currentVariables[filePath].push(variable);
    try {
      await config.update('customVariables', currentVariables, target);
      vscode.window.showInformationMessage(I18n.__('variable.variableSaved', { variable, targetTranslation }));
    } catch (error) {
      vscode.window.showErrorMessage(I18n.__('error.variableNotSaved', { variable, error: String(error) }));
    }
  }
}