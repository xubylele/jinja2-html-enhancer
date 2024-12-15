import * as vscode from 'vscode';
import { FileWatcher } from 'watchers/fileWatcher';

export class VariablePanelManager {
  private panel: vscode.WebviewPanel | undefined;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private readonly context: vscode.ExtensionContext,
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
      const variables = usedVariables.map(v => ({
        name: v,
        isDefined: setVariables.includes(v)
      }));

      const webview = this.panel.webview;

      const nonce = this.getNonce();

      webview.html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Jinja2 Variables</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body>
          <div class="p-4">
            <h1 class="text-2xl font-bold mb-4">Jinja2 Variables</h1>
            <table class="table-auto w-full">
              <thead>
                <tr>
                  <th class="px-4 py-2">Variable</th>
                  <th class="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                ${variables.map(v => `
                  <tr>
                    <td class="border px-4 py-2">${v.name}</td>
                    <td class="border px-4 py-2 ${v.isDefined ? 'text-green-500' : 'text-red-500'}" id="status-${v.name}">${v.isDefined ? 'Defined' : 'Undefined'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>  

          <script nonce="${nonce}">
            const vscode = acquireVsCodeApi();
            const variables = ${JSON.stringify(variables)};
          </script>
        </body>
        </html>
      `;
    }
  }

  private getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  private dispose() {
    this.disposables.forEach(d => d.dispose());
    if (this.panel) {
      this.panel.dispose();
    }
  }
}
