import { identifierAtOffset } from "@xubylele/jinja2-enhanced-shared";
import * as vscode from "vscode";
import type { BackendIndex, BackendVarLocation } from "../intelligence/backendIndex";
import { GOTO_COMMAND } from "../commands/gotoDefinitionCommand";
import I18n from "../translations";

export class BackendVariableHover implements vscode.HoverProvider {
  constructor(private readonly index: BackendIndex) {}

  provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
    const offset = document.offsetAt(position);
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

    const md = new vscode.MarkdownString(undefined, true);
    md.isTrusted = true;
    md.supportHtml = false;
    md.appendMarkdown(`**${I18n.__("hover.backend.title")}** \`${root}\`\n\n`);
    md.appendMarkdown(
      `${locations.length === 1 ? I18n.__("hover.backend.declaredOne") : I18n.__("hover.backend.declaredMany", { count: String(locations.length) })}\n\n`
    );
    for (const loc of locations) {
      const args = encodeURIComponent(JSON.stringify(serializeLocation(loc)));
      const path = prettyPath(loc);
      md.appendMarkdown(`- [${path}](command:${GOTO_COMMAND}?${args} "Go to definition")\n`);
    }
    return new vscode.Hover(md);
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
