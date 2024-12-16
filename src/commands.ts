import * as vscode from 'vscode';
import { FileWatcher } from './watchers/fileWatcher';
import { getMessage } from './ui/notifications/messageHandler';
import { VariablePanelManager } from './ui/panels/variablePanel';

export function registerCommands(context: vscode.ExtensionContext, fileWatcher: FileWatcher, variablePanelManager: VariablePanelManager) {
  const checkVariablesDisposable = vscode.commands.registerCommand('extension.checkJinja2Variables', () => {
    vscode.window.showInformationMessage(getMessage('checkingVariables'));
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const result = fileWatcher.analyzeDocument(editor.document);
      if (result) {
        vscode.window.showInformationMessage(getMessage('variablesChecked'));
      }
    } else {
      vscode.window.showWarningMessage(getMessage('noActiveEditor'));
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
      vscode.window.showWarningMessage(getMessage('noActiveEditor'));
    }
  });

  context.subscriptions.push(checkVariablesDisposable);
  context.subscriptions.push(openPanelDisposable);
}
