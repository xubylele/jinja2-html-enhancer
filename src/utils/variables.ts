import * as vscode from 'vscode';

export function extractVariableName(diagnosticMessage: string): string | null {
  const match = diagnosticMessage.match(/'([^']+)'/);
  return match ? match[1] : null;
}

export const getVscodeConfigTarget = (activeEditor?: vscode.TextEditor) => {
  let workspaceFolder;
  if (activeEditor) {
    workspaceFolder = activeEditor.document.uri.fsPath;
  }

  const vscodeConfigTarget = workspaceFolder
    ? vscode.ConfigurationTarget.WorkspaceFolder
    : vscode.ConfigurationTarget.Global;

  return vscodeConfigTarget;
};

export const getConfiguration = async (type: string) => {
  const config = vscode.workspace.getConfiguration('jinja2-html-enhancer');

  return config.get(type);
}