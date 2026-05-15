import * as vscode from "vscode";
import {
  computeActiveParameter,
  extractMacroDefinitions,
  formatMacroSignatureLabel,
  formatMacroSnippet,
  isInPrintContext,
  parseMacroCallContext,
  type MacroDefinition,
} from "@xubylele/jinja2-enhanced-shared";
import I18n from "../translations";

export class MacroCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | null {
    const line = document.lineAt(position).text;
    const textBefore = line.slice(0, position.character);

    if (!isInPrintContext(textBefore)) {
      return null;
    }

    const macros = extractMacroDefinitions(document.getText());
    return macros.map((m) => this.toCompletionItem(m));
  }

  private toCompletionItem(macro: MacroDefinition): vscode.CompletionItem {
    const item = new vscode.CompletionItem(macro.name, vscode.CompletionItemKind.Function);
    item.detail = formatMacroSignatureLabel(macro.name, macro.params);
    item.documentation = new vscode.MarkdownString(
      `**${I18n.__("completion.macro.local")}**\n\n` +
        `\`${formatMacroSignatureLabel(macro.name, macro.params)}\``
    );
    item.insertText = new vscode.SnippetString(formatMacroSnippet(macro.name, macro.params));
    return item;
  }
}

export class MacroSignatureHelpProvider implements vscode.SignatureHelpProvider {
  provideSignatureHelp(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.SignatureHelp | null {
    const line = document.lineAt(position).text;
    const textBefore = line.slice(0, position.character);

    const call = parseMacroCallContext(textBefore);
    if (!call || call.namespace) {
      return null;
    }

    const macros = extractMacroDefinitions(document.getText());
    const macro = macros.find((m) => m.name === call.macroName);
    if (!macro) {
      return null;
    }

    const label = formatMacroSignatureLabel(macro.name, macro.params);
    const signature = new vscode.SignatureInformation(
      label,
      new vscode.MarkdownString(I18n.__("signatureHelp.macro.local"))
    );

    signature.parameters = macro.params.map(
      (p) =>
        new vscode.ParameterInformation(
          p.hasDefault ? `${p.name} = …` : p.name,
          p.hasDefault
            ? I18n.__("signatureHelp.macro.optional")
            : I18n.__("signatureHelp.macro.required")
        )
    );

    const help = new vscode.SignatureHelp();
    help.signatures = [signature];
    help.activeSignature = 0;
    help.activeParameter = computeActiveParameter(textBefore);
    return help;
  }
}
