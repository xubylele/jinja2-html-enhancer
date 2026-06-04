import * as vscode from "vscode";
import { GOTO_COMMAND } from "../commands/gotoDefinitionCommand";
import type { BackendIndex, BackendVarLocation } from "../intelligence/backendIndex";
import { identifierAtOffset } from "@xubylele/jinja2-enhanced-shared";
import I18n from "../translations";

export class BackendVariableActions implements vscode.CodeActionProvider {
  static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

  constructor(private readonly index: BackendIndex) {}

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection
  ): vscode.CodeAction[] | undefined {
    const offset = document.offsetAt(range.start);
    const ident = identifierAtOffset(document.getText(), offset);
    if (!ident) {
      return undefined;
    }

    const root = rootIdentifier(document.getText(), ident.offset);
    if (!root) {
      return undefined;
    }

    const locations = this.index.getLocationsFor(document.uri, root);
    if (locations.length === 0) {
      return undefined;
    }

    return locations.map((loc, i) => {
      const title =
        locations.length === 1
          ? I18n.__("codeAction.backend.goto", { name: root })
          : I18n.__("codeAction.backend.gotoAt", { name: root, path: prettyPath(loc) });
      const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
      action.command = {
        title,
        command: GOTO_COMMAND,
        arguments: [serializeLocation(loc)],
      };
      // Show the most-recent / first hit at the top of the list.
      action.isPreferred = i === 0;
      return action;
    });
  }
}

function serializeLocation(loc: BackendVarLocation) {
  return {
    uri: loc.uri.toString(),
    startLine: loc.range.start.line,
    startChar: loc.range.start.character,
    endLine: loc.range.end.line,
    endChar: loc.range.end.character,
  };
}

function rootIdentifier(text: string, identOffset: number): string | undefined {
  let start = identOffset;
  while (start > 0 && /[A-Za-z0-9_.]/.test(text[start - 1])) {
    start--;
  }
  let i = start;
  while (i < text.length && /[A-Za-z0-9_]/.test(text[i])) {
    i++;
  }
  if (i === start || !/[A-Za-z_]/.test(text[start])) {
    return undefined;
  }
  return text.slice(start, i);
}

function prettyPath(loc: BackendVarLocation): string {
  const folder = vscode.workspace.getWorkspaceFolder(loc.uri);
  const file = folder ? loc.uri.fsPath.slice(folder.uri.fsPath.length + 1) : loc.uri.fsPath;
  return `${file}:${loc.range.start.line + 1}`;
}
