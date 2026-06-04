import { extractVariableName } from "@xubylele/jinja2-enhanced-shared";
import * as vscode from "vscode";
import { GOTO_COMMAND } from "../commands/gotoDefinitionCommand";
import { getInheritedScope } from "../resolver/inheritedScope";
import { TemplateGraphIndex } from "../resolver/templateGraphIndex";
import { TemplateRootsProvider } from "../resolver/templateRoots";
import I18n from "../translations";

const FREE_DIAGNOSTIC_CODE = "JHE0001";
const FREE_SAVE_COMMAND = "extension.saveVariable";

/**
 * Quick fixes attached to `JHE0001 — undefined variable`. When the variable
 * is found in the inherited scope, surfaces "Go to inherited definition" and
 * "Suppress (add to customVariables)".
 */
export class InheritedVariableActions implements vscode.CodeActionProvider {
  static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

  constructor(
    private readonly index: TemplateGraphIndex,
    private readonly roots: TemplateRootsProvider
  ) {}

  async provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext
  ): Promise<vscode.CodeAction[]> {
    const filtered = context.diagnostics.filter((d) => d.code === FREE_DIAGNOSTIC_CODE);
    if (filtered.length === 0) {
      return [];
    }

    const inherited = await getInheritedScope(document.uri, {
      index: this.index,
      roots: this.roots,
    });
    if (inherited.length === 0) {
      return [];
    }

    const out: vscode.CodeAction[] = [];
    for (const diag of filtered) {
      const varName = extractVariableName(diag.message);
      if (!varName) {
        continue;
      }
      const matches = inherited.filter((s) => s.name === varName);
      if (matches.length === 0) {
        continue;
      }

      const via = matches[0].viaPath ? ` (via ${matches[0].viaPath})` : "";
      const goto = new vscode.CodeAction(
        I18n.__("codeAction.inherited.goto", { name: varName }) + via,
        vscode.CodeActionKind.QuickFix
      );
      goto.diagnostics = [diag];
      goto.isPreferred = true;
      goto.command = {
        title: I18n.__("codeAction.inherited.goto", { name: varName }),
        command: GOTO_COMMAND,
        arguments: [serializeLocation(matches[0].originUri, matches[0].originRange)],
      };
      out.push(goto);

      const suppress = new vscode.CodeAction(
        I18n.__("codeAction.inherited.suppress", { name: varName }),
        vscode.CodeActionKind.QuickFix
      );
      suppress.diagnostics = [diag];
      suppress.command = {
        title: I18n.__("codeAction.inherited.suppress", { name: varName }),
        command: FREE_SAVE_COMMAND,
        arguments: [diag.message],
      };
      out.push(suppress);
    }

    return out;
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
