import * as vscode from "vscode";
import { PrettierResolver } from "./prettierResolver";

export class Jinja2FormattingProvider implements vscode.DocumentFormattingEditProvider {
  async provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    _options: vscode.FormattingOptions,
    _token: vscode.CancellationToken
  ): Promise<vscode.TextEdit[]> {
    // Check master toggle
    const config = vscode.workspace.getConfiguration("jinja2-html-enhancer");
    if (!config.get<boolean>("formatting.enabled", true)) {
      return [];
    }

    // Resolve prettier + plugin from workspace
    const resolved = await PrettierResolver.resolve();
    if (!resolved) {
      return [];
    }

    const text = document.getText();

    try {
      const formatted = await resolved.prettier.format(text, {
        parser: "jinja-template",
        plugins: [resolved.pluginPath],
      });

      if (formatted === text) {
        return [];
      }

      const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));

      return [vscode.TextEdit.replace(fullRange, formatted)];
    } catch (error) {
      console.error("[Jinja2 Enhance] Formatting failed:", error);
      return [];
    }
  }
}
