import * as vscode from 'vscode';
import { AllowedVariablesManager } from 'configuration/allowedVariablesManager';

export class QuickFixProvider implements vscode.CodeActionProvider {
  constructor(private readonly allowedVariablesManager: AllowedVariablesManager) { }

  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    context.diagnostics.forEach(diagnostic => {
      if (diagnostic.code === 'undefinedVariable') {
        const variableName = diagnostic.message.match(/Variable '(.+)' no está definida/)?.[1];
        if (variableName) {
          const action = new vscode.CodeAction(
            `Permitir variable '${variableName}' en este archivo`,
            vscode.CodeActionKind.QuickFix
          );

          action.command = {
            command: 'variableAnalyzer.allowVariableInFile',
            title: 'Permitir variable',
            arguments: [document.uri, variableName]
          };

          actions.push(action);
        }
      }
    });

    return actions;
  }
}