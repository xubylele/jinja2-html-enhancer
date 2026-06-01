import * as path from "path";
import * as vscode from "vscode";
import { findUsedVariables, renderTemplate } from "@xubylele/jinja2-enhanced-shared";
import {
  ContextProfileSet,
  ContextProfilesMap,
  WILDCARD_TEMPLATE_KEY,
  buildLegacyCustomVarsContext,
  getContextProfiles,
  resolveProfilesForTemplate,
} from "../../config/configService";
import { PreviewEngine } from "../../preview/previewEngine";
import i18n from "../../translations";

interface PreviewSession {
  content: string;
  templatePath: string;
  templateKey: string;
  uri: vscode.Uri;
  set: ContextProfileSet;
  activeProfile: string;
  /** When set, replaces the persisted profile context during render — for live JSON editor preview. */
  previewContext?: Record<string, unknown>;
  /** Backend-detected variables pre-populated as defaults (overridden by profile context). */
  backendContext?: Record<string, unknown>;
}

interface WebviewIncomingMessage {
  command:
    | "save-profile"
    | "delete-profile"
    | "set-default"
    | "set-active"
    | "request-rerender"
    | "add-missing-var"
    | "preview-context";
  name?: string;
  context?: Record<string, unknown>;
}

export class TemplatePreviewPanel {
  private panel: vscode.WebviewPanel | undefined;
  private session: PreviewSession | undefined;
  private saveWatcher: vscode.Disposable | undefined;
  private changeWatcher: vscode.Disposable | undefined;
  private changeDebounce: NodeJS.Timeout | undefined;

  constructor(
    private context: vscode.ExtensionContext,
    private previewEngine?: PreviewEngine,
  ) {}

  /** Wire up backend-aware context building after the BackendIndex is available. */
  public setPreviewEngine(engine: PreviewEngine): void {
    this.previewEngine = engine;
  }

  public openFor(document: vscode.TextDocument, initialProfile?: string) {
    const templatePath = document.uri.fsPath;
    const { key, set } = resolveProfilesForTemplate(templatePath, document.uri);

    let activeProfile = initialProfile ?? set.default ?? "";
    if (activeProfile && !set.profiles[activeProfile]) {
      activeProfile = "";
    }
    if (!activeProfile && Object.keys(set.profiles).length > 0) {
      activeProfile = Object.keys(set.profiles)[0];
    }

    this.session = {
      content: document.getText(),
      templatePath,
      templateKey: key,
      uri: document.uri,
      set,
      activeProfile,
    };

    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside);
    } else {
      this.panel = vscode.window.createWebviewPanel(
        "jinja2TemplatePreview",
        i18n.__("preview.title"),
        vscode.ViewColumn.Beside,
        { enableScripts: true, retainContextWhenHidden: true }
      );
      this.panel.onDidDispose(() => {
        this.panel = undefined;
        this.session = undefined;
        this.saveWatcher?.dispose();
        this.saveWatcher = undefined;
        this.changeWatcher?.dispose();
        this.changeWatcher = undefined;
        if (this.changeDebounce) {
          clearTimeout(this.changeDebounce);
        }
      });
      this.panel.webview.onDidReceiveMessage((msg: WebviewIncomingMessage) =>
        this.handleMessage(msg)
      );

      this.saveWatcher = vscode.workspace.onDidSaveTextDocument((doc) => {
        if (!this.session) {
          return;
        }
        if (doc.uri.fsPath !== this.session.templatePath) {
          return;
        }
        this.session.content = doc.getText();
        this.postIncremental();
      });

      this.changeWatcher = vscode.workspace.onDidChangeTextDocument((e) => {
        if (!this.session) {
          return;
        }
        if (e.document.uri.fsPath !== this.session.templatePath) {
          return;
        }
        if (this.changeDebounce) {
          clearTimeout(this.changeDebounce);
        }
        this.changeDebounce = setTimeout(() => {
          if (!this.session) {
            return;
          }
          this.session.content = e.document.getText();
          this.postIncremental();
        }, 250);
      });
    }

    void this.loadBackendContext(document.uri);
    void this.renderFull();
  }

  private async loadBackendContext(uri: vscode.Uri): Promise<void> {
    if (!this.previewEngine || !this.session) {
      return;
    }
    try {
      const backendContext = await this.previewEngine.buildContext(uri);
      if (this.session) {
        this.session.backendContext = backendContext;
        void this.renderFull();
      }
    } catch {
      // ignore backend context errors — preview still works without it
    }
  }

  public listProfilesForActive(): { key: string; set: ContextProfileSet } {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return { key: "", set: { default: "", profiles: {} } };
    }
    return resolveProfilesForTemplate(editor.document.uri.fsPath, editor.document.uri);
  }

  private getEffectiveContext(): Record<string, unknown> {
    if (!this.session) {
      return {};
    }
    // backendContext provides defaults; profile/live context takes precedence.
    const base: Record<string, unknown> = { ...(this.session.backendContext ?? {}) };
    if (this.session.previewContext) {
      return { ...base, ...this.session.previewContext };
    }
    const { set, activeProfile, templatePath, uri } = this.session;
    if (activeProfile && set.profiles[activeProfile]) {
      return { ...base, ...set.profiles[activeProfile] };
    }
    return { ...base, ...buildLegacyCustomVarsContext(templatePath, uri) };
  }

  private computeRender() {
    if (!this.session) {
      return null;
    }
    const context = this.getEffectiveContext();
    const result = renderTemplate(this.session.content, context, {
      placeholderMode: "inline",
    });
    const usedVariables = findUsedVariables(this.session.content);
    return { context, result, usedVariables };
  }

  /** Full webview reload — used on open, save-file, profile mutations, scope changes. */
  private renderFull() {
    if (!this.panel || !this.session) {
      return;
    }
    const computed = this.computeRender();
    if (!computed) {
      return;
    }

    const webview = this.panel.webview;
    const cssUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, "out", "css", "output.css"))
    );
    const jsUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, "out", "App.js"))
    );

    const params = {
      view: "preview" as const,
      translations: i18n.getCatalog(),
      templateKey: this.session.templateKey,
      wildcardKey: WILDCARD_TEMPLATE_KEY,
      profileSet: this.session.set,
      activeProfile: this.session.activeProfile,
      currentContext: computed.context,
      html: computed.result.html,
      missingVariables: computed.result.missingVariables,
      usedVariables: computed.usedVariables,
    };

    webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(i18n.__("preview.title"))}</title>
  <link href="${cssUri}" rel="stylesheet">
</head>
<body>
  <div id="root">Loading...</div>
  <script>
    try {
      if (!window.vscode) { window.vscode = acquireVsCodeApi(); }
    } catch (e) {
      console.error("[jinja2-preview] acquireVsCodeApi failed:", e);
    }
  </script>
  <script>
    const params = ${JSON.stringify(params)};
  </script>
  <script type="module" src="${jsUri}"></script>
</body>
</html>`;
  }

  /** Incremental update — used while the user edits the JSON in the panel. Keeps React mounted. */
  private postIncremental() {
    if (!this.panel || !this.session) {
      return;
    }
    const computed = this.computeRender();
    if (!computed) {
      return;
    }

    this.panel.webview.postMessage({
      type: "preview-result",
      html: computed.result.html,
      missingVariables: computed.result.missingVariables,
      usedVariables: computed.usedVariables,
    });
  }

  private async persist(set: ContextProfileSet) {
    if (!this.session) {
      return;
    }
    this.session.set = set;
    const all: ContextProfilesMap = getContextProfiles(this.session.uri);
    all[this.session.templateKey] = set;
    const config = vscode.workspace.getConfiguration("jinja2-html-enhancer");
    try {
      await config.update("contextProfiles", all, vscode.ConfigurationTarget.Global);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      vscode.window.showErrorMessage(`Failed to save profile: ${message}`);
      throw err;
    }
  }

  private async handleMessage(msg: WebviewIncomingMessage) {
    console.log("[jinja2-preview] message received:", msg.command, { name: msg.name });
    if (!this.session) {
      return;
    }

    switch (msg.command) {
      case "save-profile": {
        if (!msg.name) {
          return;
        }
        const currentSet: ContextProfileSet = this.session.set ?? { default: "", profiles: {} };
        const next: ContextProfileSet = {
          default: currentSet.default || msg.name,
          profiles: {
            ...(currentSet.profiles ?? {}),
            [msg.name]: msg.context ?? {},
          },
        };
        try {
          await this.persist(next);
        } catch {
          return;
        }
        const readback = getContextProfiles(this.session.uri);
        if (!readback[this.session.templateKey]?.profiles?.[msg.name]) {
          vscode.window.showErrorMessage(
            `Profile '${msg.name}' did not persist. Check user settings.`
          );
          return;
        }
        this.session.activeProfile = msg.name;
        this.session.previewContext = undefined;
        vscode.window.showInformationMessage(i18n.__("preview.profileSaved", { name: msg.name }));
        this.renderFull();
        return;
      }
      case "delete-profile": {
        if (!msg.name) {
          return;
        }
        const remaining = { ...this.session.set.profiles };
        delete remaining[msg.name];
        const nextDefault =
          this.session.set.default === msg.name
            ? (Object.keys(remaining)[0] ?? "")
            : this.session.set.default;
        const next: ContextProfileSet = {
          default: nextDefault,
          profiles: remaining,
        };
        await this.persist(next);
        if (this.session.activeProfile === msg.name) {
          this.session.activeProfile = nextDefault;
        }
        this.session.previewContext = undefined;
        vscode.window.showInformationMessage(i18n.__("preview.profileDeleted", { name: msg.name }));
        this.renderFull();
        return;
      }
      case "set-default": {
        if (!msg.name) {
          return;
        }
        const next: ContextProfileSet = {
          ...this.session.set,
          default: msg.name,
        };
        await this.persist(next);
        this.renderFull();
        return;
      }
      case "set-active": {
        if (!msg.name) {
          return;
        }
        this.session.activeProfile = msg.name;
        this.session.previewContext = undefined;
        this.renderFull();
        return;
      }
      case "add-missing-var": {
        if (!msg.name) {
          return;
        }
        const profileName = this.session.activeProfile || "default";
        const current = this.session.set.profiles[profileName] ?? {};
        if (msg.name in current) {
          return;
        }
        const next: ContextProfileSet = {
          default: this.session.set.default || profileName,
          profiles: {
            ...this.session.set.profiles,
            [profileName]: { ...current, [msg.name]: "" },
          },
        };
        await this.persist(next);
        this.session.activeProfile = profileName;
        this.session.previewContext = undefined;
        this.renderFull();
        return;
      }
      case "preview-context": {
        this.session.previewContext = msg.context ?? {};
        this.postIncremental();
        return;
      }
      case "request-rerender": {
        this.renderFull();
        return;
      }
    }
  }

  public show(content: string, contextVars: Record<string, unknown>) {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.getText() === content) {
      this.openFor(editor.document);
      return;
    }
    const result = renderTemplate(content, contextVars, {
      placeholderMode: "inline",
    });
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside);
    } else {
      this.panel = vscode.window.createWebviewPanel(
        "jinja2TemplatePreview",
        i18n.__("preview.title"),
        vscode.ViewColumn.Beside,
        { enableScripts: true, retainContextWhenHidden: true }
      );
      this.panel.onDidDispose(() => {
        this.panel = undefined;
        this.session = undefined;
        this.saveWatcher?.dispose();
        this.saveWatcher = undefined;
      });
    }
    this.panel.webview.html = `<!DOCTYPE html><html><body><div>${result.html}</div></body></html>`;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
