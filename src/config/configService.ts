import * as vscode from 'vscode';

export const getVscodeConfigTarget = (activeEditor?: vscode.TextEditor | null, document?: vscode.TextDocument) => {
  let hasWorkspaceFolder = false;

  if (activeEditor) {
    hasWorkspaceFolder = !!vscode.workspace.getWorkspaceFolder(activeEditor.document.uri);
  } else if (document) {
    hasWorkspaceFolder = !!vscode.workspace.getWorkspaceFolder(document.uri);
  }

  return hasWorkspaceFolder
    ? vscode.ConfigurationTarget.WorkspaceFolder
    : vscode.ConfigurationTarget.Global;
};

export const getConfiguration = async (type: string) => {
  const config = vscode.workspace.getConfiguration('jinja2-html-enhancer');

  return config.get(type);
};
