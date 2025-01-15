import * as path from 'path';
import * as vscode from 'vscode';
import i18n from '../../translations';
import { FileWatcher } from '../../watchers/fileWatcher';

export class VariablePanelManager {
  private panel: vscode.WebviewPanel | undefined;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private context: vscode.ExtensionContext,
    private fileWatcher: FileWatcher
  ) {
    this.disposables.push(
      fileWatcher.onDidAnalyzeDocument(({ usedVariables, setVariables }) => {
        if (this.panel) {
          this.updateContent(usedVariables, setVariables);
        }
      })
    );
  }

  public show(usedVariables: string[], setVariables: string[]) {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside);
    } else {
      this.panel = vscode.window.createWebviewPanel(
        'jinja2Variables',
        'Jinja2 Variables',
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        }
      );

      this.panel.onDidDispose(() => {
        this.panel = undefined;
      });
    }

    this.updateContent(usedVariables, setVariables);
  }

  private updateContent(usedVariables: string[], setVariables: string[]) {
    if (this.panel) {
      const translations = i18n.getCatalog();
      const webview = this.panel.webview;

      const cssUri = webview.asWebviewUri(
        vscode.Uri.file(
          path.join(this.context.extensionPath, 'out', 'css', 'output.css')
        )
      );
      const jsUri = webview.asWebviewUri(
        vscode.Uri.file(
          path.join(this.context.extensionPath, 'out', 'App.js')
        )
      );

      const params = {
        usedVariables,
        setVariables,
        translations,
      };

      webview.html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Jinja2 Variables</title>
          <link href="${cssUri}" rel="stylesheet">
        </head>
        <body>
          <div id="root">Loading...</div>
          <script>
            if (!window.vscode) {
              window.vscode = acquireVsCodeApi();
            }
          </script>
          <script>
            const params = ${JSON.stringify(params)};
          </script>
          <script type="module" src="${jsUri}"></script>
        </body>
        </html>`;
    }
  }

  private dispose() {
    this.disposables.forEach(d => d.dispose());
    if (this.panel) {
      this.panel.dispose();
    }
  }
}
