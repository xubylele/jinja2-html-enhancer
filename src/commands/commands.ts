import * as vscode from 'vscode';
import { FileWatcher } from '../watchers/fileWatcher';
import I18n from '../translations';
import { VariablePanelManager } from '../ui/panels/variablePanel';

export function checkVariables(fileWatcher: FileWatcher) {
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
}

export function openVariablePanel(fileWatcher: FileWatcher, variablePanelManager: VariablePanelManager) {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const result = fileWatcher.analyzeDocument(editor.document);
    if (result) {
      variablePanelManager.show(result.usedVariables, result.setVariables);
    }
  } else {
    vscode.window.showWarningMessage(I18n.__('error.noActiveEditor'));
  }
}
