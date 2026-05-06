import * as path from 'path';
import * as vscode from 'vscode';
import { renderTemplate, findMissingVariables } from '@xubylele/jinja2-enhanced-shared';

export class TemplatePreviewPanel {
  private panel: vscode.WebviewPanel | undefined;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public show(content: string, contextVars: Record<string, unknown>) {
    const result = renderTemplate(content, contextVars, { highlightMissing: true });

    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside);
    } else {
      this.panel = vscode.window.createWebviewPanel(
        'jinja2TemplatePreview',
        'Jinja2 Template Preview',
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

    this.panel.webview.html = this.getWebviewContent(result.html, result.missingVariables);
  }

  private getWebviewContent(html: string, missingVars: string[]): string {
    const missingInfo = missingVars.length > 0
      ? `<div class="warning">Missing variables: ${missingVars.join(', ')}</div>`
      : '<div class="success">All variables resolved</div>';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jinja2 Preview</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      margin: 0;
      padding: 20px;
      background: #1e1e1e;
      color: #cccccc;
    }
    .warning {
      background: #2d2a00;
      border: 1px solid #ffc107;
      color: #ffd60a;
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 16px;
      font-size: 13px;
    }
    .success {
      background: #0a2d0a;
      border: 1px solid #28a745;
      color: #4ade80;
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 16px;
      font-size: 13px;
    }
    .preview-container {
      background: #252526;
      border: 2px solid #007acc;
      border-radius: 8px;
      overflow: hidden;
    }
    .preview-header {
      background: #2d2d30;
      padding: 8px 16px;
      border-bottom: 1px solid #3e3e42;
      font-size: 11px;
      color: #858585;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .preview {
      padding: 24px;
      background: white;
      color: #1e1e1e;
      min-height: 200px;
    }
    .jinja2-missing-var {
      background: #ff4444;
      color: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 600;
      font-size: 12px;
      border: 1px solid #cc0000;
    }
  </style>
</head>
<body>
  ${missingInfo}
  <div class="preview-container">
    <div class="preview-header">Rendered Preview</div>
    <div class="preview">${html}</div>
  </div>
</body>
</html>`;
  }
}
