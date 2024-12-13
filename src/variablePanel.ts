import * as vscode from 'vscode';

export class VariablePanelManager {
  private panel: vscode.WebviewPanel | undefined;

  constructor(private readonly context: vscode.ExtensionContext) { }

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
          <script src="https://unpkg.com/react@17/umd/react.production.min.js" nonce="${nonce}"></script>
          <script src="https://unpkg.com/react-dom@17/umd/react-dom.production.min.js" nonce="${nonce}"></script>
        </head>
        <body>
          <div id="root"></div>
          <script nonce="${nonce}">
            const vscode = acquireVsCodeApi();
            const variables = ${JSON.stringify(variables)};
            
            // Render the React component
            ReactDOM.render(
              React.createElement(${VariablePanel.name}, { variables }),
              document.getElementById('root')
            );
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
}
