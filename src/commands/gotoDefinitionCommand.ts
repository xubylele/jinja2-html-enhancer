import * as vscode from "vscode";

export const GOTO_COMMAND = "jinja2-html-enhancer.gotoDefinition";

interface LocationPayload {
  uri: string;
  startLine: number;
  startChar: number;
  endLine: number;
  endChar: number;
}

export function gotoDefinitionCommand(): vscode.Disposable {
  return vscode.commands.registerCommand(GOTO_COMMAND, async (payload: LocationPayload) => {
    if (!payload) {
      return;
    }
    try {
      const uri = vscode.Uri.parse(payload.uri);
      const range = new vscode.Range(
        payload.startLine,
        payload.startChar,
        payload.endLine,
        payload.endChar
      );
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc, {
        selection: range,
        preserveFocus: false,
      });
    } catch {
      // ignore navigation errors
    }
  });
}
