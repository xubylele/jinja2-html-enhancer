import * as vscode from 'vscode';
import { FileWatcher } from '../watchers/fileWatcher';
import I18n from '../translations';
import { VariablePanelManager } from '../ui/panels/variablePanel';

export function registerCommands(context: vscode.ExtensionContext, fileWatcher: FileWatcher, variablePanelManager: VariablePanelManager) {
  const checkVariablesDisposable = vscode.commands.registerCommand('extension.checkJinja2Variables', () => {
    vscode.window.showInformationMessage(I18n.__('variable.checkingVariables'));
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const result = fileWatcher.analyzeDocument(editor.document);
      if (result) {
        vscode.window.showInformationMessage(I18n.__('variable.variablesChecked'));
      }
    } else {
      vscode.window.showWarningMessage(I18n.__('error.noActiveEditor'));
    }
  });

  const openPanelDisposable = vscode.commands.registerCommand('extension.openVariablePanel', () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const result = fileWatcher.analyzeDocument(editor.document);
      if (result) {
        variablePanelManager.show(result.usedVariables, result.setVariables);
      }
    } else {
      vscode.window.showWarningMessage(I18n.__('error.noActiveEditor'));
    }
  });

  context.subscriptions.push(checkVariablesDisposable);
  context.subscriptions.push(openPanelDisposable);
}
