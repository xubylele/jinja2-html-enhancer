import * as vscode from 'vscode';
import { extractVariableName } from '@xubylele/jinja2-enhanced-shared';
import I18n from '../translations';

export class QuickFixProvider implements vscode.CodeActionProvider {
  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
  ): vscode.CodeAction[] | undefined {
    return context.diagnostics
      .filter(diagnostic => diagnostic.code === 'JHE0001')
      .map(diagnostic => this.createQuickFix(diagnostic));
  }

  private createQuickFix(diagnostic: vscode.Diagnostic): vscode.CodeAction {
    const variable = extractVariableName(diagnostic.message);

    if (!variable) {
      return new vscode.CodeAction(
        I18n.__('quickFix.save', { variable: 'unknown' }),
        vscode.CodeActionKind.QuickFix
      );
    }

    const action = new vscode.CodeAction(
      I18n.__('quickFix.save', { variable }),
      vscode.CodeActionKind.QuickFix
    );

    action.command = {
      command: 'extension.saveVariable',
      title: I18n.__('quickFix.save', { variable }),
      arguments: [diagnostic.message]
    };

    return action;
  }
}
