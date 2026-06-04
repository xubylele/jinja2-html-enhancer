import * as vscode from "vscode";
import type { BackendIndex, BackendVarSummary } from "../../intelligence/backendIndex";

interface SerializedLocation {
  uri: string;
  startLine: number;
  startChar: number;
  endLine: number;
  endChar: number;
}

interface SerializedVar {
  name: string;
  locations: SerializedLocation[];
}

interface IncomingMessage {
  type: "goto";
  uri: string;
  startLine: number;
  startChar: number;
  endLine: number;
  endChar: number;
}

export class BackendVariablePanel implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private currentTemplateUri: vscode.Uri | undefined;
  private readonly disposables: vscode.Disposable[] = [];

  constructor(private readonly index: BackendIndex) {
    this.disposables.push(
      index.onDidUpdate(() => this.refresh()),
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (!editor) {
          return;
        }
        if (isJinjaTemplate(editor.document)) {
          this.currentTemplateUri = editor.document.uri;
          this.refresh();
        }
      })
    );
  }

  show(): void {
    const editor = vscode.window.activeTextEditor;
    if (editor && isJinjaTemplate(editor.document)) {
      this.currentTemplateUri = editor.document.uri;
    }

    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside);
    } else {
      this.panel = vscode.window.createWebviewPanel(
        "jinja2BackendVariables",
        "Jinja2: Backend Variables",
        vscode.ViewColumn.Beside,
        { enableScripts: true, retainContextWhenHidden: true }
      );
      this.panel.onDidDispose(() => {
        this.panel = undefined;
      });
      this.panel.webview.onDidReceiveMessage((msg: IncomingMessage) => this.handleMessage(msg));
    }

    this.refresh();
  }

  private refresh(): void {
    if (!this.panel) {
      return;
    }
    const summary = this.currentTemplateUri
      ? this.index.getSummaryFor(this.currentTemplateUri)
      : [];
    this.panel.webview.html = renderHtml(this.currentTemplateUri, summary);
  }

  private async handleMessage(msg: IncomingMessage): Promise<void> {
    if (!msg || msg.type !== "goto") {
      return;
    }
    try {
      const uri = vscode.Uri.parse(msg.uri);
      const range = new vscode.Range(
        new vscode.Position(msg.startLine, msg.startChar),
        new vscode.Position(msg.endLine, msg.endChar)
      );
      const doc = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(doc, {
        viewColumn: vscode.ViewColumn.One,
        preserveFocus: false,
        selection: range,
      });
      editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    } catch (err) {
      void vscode.window.showErrorMessage(`Failed to open definition: ${String(err)}`);
    }
  }

  dispose(): void {
    for (const d of this.disposables) {
      try {
        d.dispose();
      } catch {
        /* ignore */
      }
    }
    this.disposables.length = 0;
    if (this.panel) {
      this.panel.dispose();
    }
  }
}

function isJinjaTemplate(doc: vscode.TextDocument): boolean {
  return doc.languageId === "html" || doc.languageId === "jinja2";
}

function renderHtml(templateUri: vscode.Uri | undefined, summary: BackendVarSummary[]): string {
  const serialized: SerializedVar[] = summary.map((v) => ({
    name: v.name,
    locations: v.locations.map((l) => ({
      uri: l.uri.toString(),
      startLine: l.range.start.line,
      startChar: l.range.start.character,
      endLine: l.range.end.line,
      endChar: l.range.end.character,
    })),
  }));

  const heading = templateUri
    ? `Backend variables for <code>${escapeHtml(prettyPath(templateUri))}</code>`
    : "Open a Jinja2 template to see backend variables";

  const empty = templateUri
    ? '<p class="empty">No backend render call references this template yet.</p>'
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';" />
  <title>Backend Variables</title>
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 12px; }
    h1 { font-size: 14px; margin: 0 0 12px; font-weight: 600; }
    code { background: var(--vscode-textCodeBlock-background); padding: 1px 4px; border-radius: 2px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--vscode-panel-border); vertical-align: top; }
    th { font-weight: 600; font-size: 12px; }
    .name { font-family: var(--vscode-editor-font-family); font-weight: 600; }
    .loc-list { list-style: none; margin: 0; padding: 0; }
    .loc-list li { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
    .loc-path { font-family: var(--vscode-editor-font-family); font-size: 11px; opacity: 0.85; }
    button { font: inherit; cursor: pointer; padding: 2px 8px;
             background: var(--vscode-button-background); color: var(--vscode-button-foreground);
             border: none; border-radius: 2px; }
    button:hover { background: var(--vscode-button-hoverBackground); }
    .empty { opacity: 0.7; font-size: 12px; }
  </style>
</head>
<body>
  <h1>${heading}</h1>
  ${serialized.length === 0 ? empty : ""}
  ${
    serialized.length === 0
      ? ""
      : `
    <table>
      <thead><tr><th>Variable</th><th>Definitions</th></tr></thead>
      <tbody>
        ${serialized
          .map(
            (v, i) => `
          <tr>
            <td class="name">${escapeHtml(v.name)}</td>
            <td>
              <ul class="loc-list">
                ${v.locations
                  .map(
                    (l: SerializedLocation, j: number) => `
                  <li>
                    <button data-var="${i}" data-loc="${j}">Go to definition</button>
                    <span class="loc-path">${escapeHtml(prettyLocPath(l))}</span>
                  </li>
                `
                  )
                  .join("")}
              </ul>
            </td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `
  }
  <script>
    const vscode = acquireVsCodeApi();
    const data = ${JSON.stringify(serialized)};
    document.querySelectorAll('button[data-var]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const v = Number(btn.getAttribute('data-var'));
        const l = Number(btn.getAttribute('data-loc'));
        const loc = data[v] && data[v].locations[l];
        if (!loc) { return; }
        vscode.postMessage({ type: 'goto', ...loc });
      });
    });
  </script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function prettyPath(uri: vscode.Uri): string {
  const folder = vscode.workspace.getWorkspaceFolder(uri);
  if (folder) {
    return uri.fsPath.slice(folder.uri.fsPath.length + 1);
  }
  return uri.fsPath;
}

function prettyLocPath(loc: SerializedLocation): string {
  try {
    const uri = vscode.Uri.parse(loc.uri);
    return `${prettyPath(uri)}:${loc.startLine + 1}`;
  } catch {
    return `${loc.uri}:${loc.startLine + 1}`;
  }
}
