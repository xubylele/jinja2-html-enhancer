import * as vscode from 'vscode';
import I18n from '../translations';
import { VariablePanelManager } from '../ui/panels/variablePanel';
import { extractVariableName, getVscodeConfigTarget } from '../utils/variables';
import { FileWatcher } from '../watchers/fileWatcher';

export class CommandManager {
  private fileWatcher: FileWatcher;
  private variablePanelManager: VariablePanelManager;

  constructor(fileWatcher: FileWatcher, variablePanelManager: VariablePanelManager) {
    this.fileWatcher = fileWatcher;
    this.variablePanelManager = variablePanelManager;
  }

  public async checkVariables() {
    vscode.window.showInformationMessage(I18n.__('variable.checkingVariables'));
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const result = await this.fileWatcher.analyzeDocument(editor.document);
      if (result) {
        vscode.window.showInformationMessage(I18n.__('variable.variablesChecked'));
      }
    } else {
      vscode.window.showWarningMessage(I18n.__('error.noActiveEditor'));
    }
  }

  public async openVariablePanel() {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const result = await this.fileWatcher.analyzeDocument(editor.document);
      if (result) {
        this.variablePanelManager.show(result.usedVariables, result.setVariables);
      }
    } else {
      vscode.window.showWarningMessage(I18n.__('error.noActiveEditor'));
    }
  }

  public async changeConfiguration(type: string) {
    const config = vscode.workspace.getConfiguration('jinja2-html-enhancer');
    const currentConfig = config.get(type);
    let newValue;

    if (!currentConfig) {
      newValue = true;
    } else {
      newValue = !currentConfig;
    }

    const typeTranslation = I18n.__(`configuration.${type}`);

    try {
      await config.update(type, newValue);
      vscode.window.showInformationMessage(I18n.__('configuration.configurationChanged', { type: typeTranslation }));
    } catch (error) {
      vscode.window.showErrorMessage(I18n.__('error.configurationChangeFailed', { error: String(error) }));
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
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(activeEditor.document.uri);

    if (!workspaceFolder) {
      vscode.window.showWarningMessage(I18n.__('warning.noWorkspaceFolder'));
    }

    const target = getVscodeConfigTarget(activeEditor);

    const targetTranslation = (target === vscode.ConfigurationTarget.WorkspaceFolder) && workspaceFolder
      ? I18n.__('quickFix.workspaceTarget')
      : I18n.__('quickFix.globalTarget');

    const config = (target === vscode.ConfigurationTarget.WorkspaceFolder) && workspaceFolder
      ? vscode.workspace.getConfiguration('jinja2-html-enhancer', workspaceFolder.uri)
      : vscode.workspace.getConfiguration('jinja2-html-enhancer');

    const currentVariables: { [key: string]: string[] } = config.get('customVariables', {});

    if (currentVariables[filePath] && currentVariables[filePath].includes(variable)) {
      vscode.window.showWarningMessage(I18n.__('warning.variableExists', { variable, target: targetTranslation }));
      return;
    }

    const variableArray = currentVariables[filePath] || [];
    variableArray.push(variable);

    try {
      await config.update('customVariables', { ...currentVariables, [filePath]: variableArray }, target);
      vscode.window.showInformationMessage(I18n.__('quickFix.save', { variable, target: targetTranslation }));
      await this.checkVariables();
    } catch (error) {
      vscode.window.showErrorMessage(I18n.__('error.variableNotSaved', { variable, error: String(error) }));
    }
  }
}