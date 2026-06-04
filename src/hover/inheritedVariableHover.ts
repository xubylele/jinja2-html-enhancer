import { identifierAtOffset } from "@xubylele/jinja2-enhanced-shared";
import * as vscode from "vscode";
import { GOTO_COMMAND } from "../commands/gotoDefinitionCommand";
import { getInheritedScope, type InheritedSymbol } from "../resolver/inheritedScope";
import { TemplateGraphIndex } from "../resolver/templateGraphIndex";
import { TemplateRootsProvider } from "../resolver/templateRoots";
import I18n from "../translations";

function getKindLabel(kind: InheritedSymbol["kind"]): string {
  switch (kind) {
    case "set":
      return I18n.__("hover.inherited.set");
    case "macro":
      return I18n.__("hover.inherited.macro");
    case "imported-macro":
      return I18n.__("hover.inherited.importedMacro");
    case "imported-namespace":
      return I18n.__("hover.inherited.importedNamespace");
  }
}

export class InheritedVariableHover implements vscode.HoverProvider {
  constructor(
    private readonly index: TemplateGraphIndex,
    private readonly roots: TemplateRootsProvider
  ) {}

  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Hover | undefined> {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const ident = identifierAtOffset(text, offset);
    if (!ident) {
      return undefined;
    }

    const node = this.index.getNode(document.uri);
    if (node?.localVars.has(ident.name) || node?.macros.has(ident.name)) {
      return undefined;
    }

    const inherited = await getInheritedScope(document.uri, {
      index: this.index,
      roots: this.roots,
    });
    const matches = inherited.filter((sym) => sym.name === ident.name);
    if (matches.length === 0) {
      return undefined;
    }

    const md = new vscode.MarkdownString(undefined, true);
    md.isTrusted = true;
    md.appendMarkdown(`**${getKindLabel(matches[0].kind)}** \`${ident.name}\`\n\n`);
    for (const sym of matches) {
      const via = sym.viaPath ? ` _(via \`${sym.viaPath}\`)_` : "";
      const args = encodeURIComponent(
        JSON.stringify(serializeLocation(sym.originUri, sym.originRange))
      );
      const display = prettyLocation(sym.originUri, sym.originRange);
      md.appendMarkdown(
        `- [${display}](command:${GOTO_COMMAND}?${args} "Go to definition")${via}\n`
      );
    }
    return new vscode.Hover(md);
  }
}

function serializeLocation(uri: vscode.Uri, range: vscode.Range) {
  return {
    uri: uri.toString(),
    startLine: range.start.line,
    startChar: range.start.character,
    endLine: range.end.line,
    endChar: range.end.character,
  };
}

function prettyLocation(uri: vscode.Uri, range: vscode.Range): string {
  const folder = vscode.workspace.getWorkspaceFolder(uri);
  const file = folder ? uri.fsPath.slice(folder.uri.fsPath.length + 1) : uri.fsPath;
  return `${file}:${range.start.line + 1}`;
}
