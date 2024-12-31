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


  public checkVariables() {
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

    if (!variable) {
      vscode.window.showWarningMessage(I18n.__('error.variableNotFound'));
      return;
    }

    const config = vscode.workspace.getConfiguration("jinja2-html-enhancer");

    const target = vscode.workspace.workspaceFolders
      ? vscode.ConfigurationTarget.WorkspaceFolder
      : vscode.ConfigurationTarget.Workspace;

    const targetTranslation = target === vscode.ConfigurationTarget.WorkspaceFolder
      ? I18n.__('quickFix.workspaceTarget')
      : I18n.__('quickFix.globalTarget');

    const currentVariables = config.get<{ [key: string]: string }>('customVariables') || {};
    currentVariables[variable] = variable;

    try {
      await config.update('customVariables', currentVariables, target);
      vscode.window.showInformationMessage(I18n.__('variable.variableSaved', { variable, targetTranslation }));
    } catch (error) {
      vscode.window.showErrorMessage(I18n.__('error.variableNotSaved', { variable, error: String(error) }));
    }
  }
}