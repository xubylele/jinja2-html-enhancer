import * as vscode from 'vscode';
import { FileWatcher } from '../watchers/fileWatcher';
import I18n from '../translations';
import { VariablePanelManager } from '../ui/panels/variablePanel';

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

}