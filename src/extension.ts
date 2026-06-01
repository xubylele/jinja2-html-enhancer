import * as vscode from "vscode";
import { registerOriginProvider, unregisterOriginProvider } from "./api/originProviderRegistry";
import { BackendVariableActions } from "./codeActions/backendVariableActions";
import { InheritedVariableActions } from "./codeActions/inheritedVariableActions";
import { QuickFixProvider } from "./codeActions/quickFixProvider";
import { CommandManager } from "./commands/commandManager";
import { CommentToggle } from "./commands/commentToggle";
import { gotoDefinitionCommand } from "./commands/gotoDefinitionCommand";
import { MacroCompletionProvider, MacroSignatureHelpProvider } from "./completion/macro";
import { TemplateDefinitionProvider } from "./definition/templateDefinitionProvider";
import { DiagnosticsManager } from "./diagnostics/diagnosticsManager";
import { LintEngine } from "./diagnostics/lintEngine";
import { TemplatePathDiagnostics } from "./diagnostics/templatePathDiagnostics";
import { Jinja2FormattingProvider } from "./formatting/jinja2FormattingProvider";
import { BackendVariableHover } from "./hover/backendVariableHover";
import { FilterDocsHover } from "./hover/filterDocsHover";
import { InheritedVariableHover } from "./hover/inheritedVariableHover";
import { TypeHintHover } from "./hover/typeHintHover";
import { BackendIndex } from "./intelligence/backendIndex";
import { getInheritedScope, type InheritedSymbol } from "./resolver/inheritedScope";
import { BackendDefinitionProvider } from "./resolver/backendDefinitionProvider";
import { TemplateGraphIndex } from "./resolver/templateGraphIndex";
import { TemplateRootsProvider } from "./resolver/templateRoots";
import I18n, { setupI18n } from "./translations";
import { BackendVariablePanel } from "./ui/panels/backendVariablePanel";
import { TemplatePreviewPanel } from "./ui/panels/templatePreviewPanel";
import { VariablePanelManager } from "./ui/panels/variablePanel";
import { maybePromptProUpsell } from "./upsell/proUpsell";
import { FileWatcher } from "./watchers/fileWatcher";

let diagnosticsManager: DiagnosticsManager;
let fileWatcher: FileWatcher;

export function activate(context: vscode.ExtensionContext) {
  setupI18n(context);

  diagnosticsManager = new DiagnosticsManager();
  fileWatcher = new FileWatcher(diagnosticsManager);
  const variablePanelManager = new VariablePanelManager(context, fileWatcher);
  const templatePreviewPanel = new TemplatePreviewPanel(context);

  const commandManager = new CommandManager(
    fileWatcher,
    variablePanelManager,
    templatePreviewPanel
  );
  const formattingProvider = new Jinja2FormattingProvider();
  const commentToggle = new CommentToggle();

  const checkVariablesDisposable = vscode.commands.registerCommand(
    "extension.checkJinja2Variables",
    () => commandManager.checkVariables()
  );
  const openPanelDisposable = vscode.commands.registerCommand("extension.openVariablePanel", () =>
    commandManager.openVariablePanel()
  );
  const saveVariableDisposable = vscode.commands.registerCommand(
    "extension.saveVariable",
    (diagnosticMessage: string) => commandManager.saveVariable(diagnosticMessage)
  );
  const toggleVariableCheck = vscode.commands.registerCommand("extension.toggleVariableCheck", () =>
    commandManager.changeConfiguration("toggleVariableCheck")
  );
  const themeChangeDisposable = vscode.commands.registerCommand("extension.changeTheme", () =>
    commandManager.changeTheme()
  );
  const toggleCommentDisposable = vscode.commands.registerCommand(
    "extension.toggleJinja2Comment",
    () => commentToggle.toggle()
  );
  const openPreviewDisposable = vscode.commands.registerCommand(
    "extension.openTemplatePreview",
    () => commandManager.openTemplatePreview()
  );
  const previewWithProfileDisposable = vscode.commands.registerCommand(
    "extension.previewWithProfile",
    () => commandManager.previewWithProfile()
  );

  context.subscriptions.push(checkVariablesDisposable);
  context.subscriptions.push(openPanelDisposable);
  context.subscriptions.push(saveVariableDisposable);
  context.subscriptions.push(toggleVariableCheck);
  context.subscriptions.push(themeChangeDisposable);
  context.subscriptions.push(toggleCommentDisposable);
  context.subscriptions.push(openPreviewDisposable);
  context.subscriptions.push(previewWithProfileDisposable);
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { scheme: "file", language: "html" },
      new QuickFixProvider()
    )
  );
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      [{ language: "html" }, { language: "jinja2" }],
      new FilterDocsHover()
    )
  );
  // ── Formatting ─────────────────────────────────────────────────────

  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(
      [{ language: "html" }, { language: "jinja2" }],
      formattingProvider
    )
  );

  // ── Cross-file template path navigation + diagnostics ──────────────
  // templateRoots is declared early so macro providers can use it.

  const templateRoots = new TemplateRootsProvider();
  const templatePathDiagnostics = new TemplatePathDiagnostics(templateRoots);
  context.subscriptions.push(templateRoots, templatePathDiagnostics);

  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      [{ language: "html" }, { language: "jinja2" }],
      new TemplateDefinitionProvider(templateRoots)
    )
  );

  const validateOpenTemplates = () => {
    for (const doc of vscode.workspace.textDocuments) {
      if (doc.languageId === "html" || doc.languageId === "jinja2") {
        void templatePathDiagnostics.analyzeDocument(doc);
      }
    }
  };

  const templateWatcher = vscode.workspace.createFileSystemWatcher("**/*.{html,jinja2,j2,jinja}");
  templateWatcher.onDidCreate(() => validateOpenTemplates());
  templateWatcher.onDidDelete(() => validateOpenTemplates());
  templateWatcher.onDidChange(() => validateOpenTemplates());
  context.subscriptions.push(
    templateWatcher,
    templateRoots.onDidChange(() => validateOpenTemplates())
  );

  validateOpenTemplates();

  // ── Cross-file inherited variable resolution ────────────────────────
  // Builds the full template graph (extends/include/import) and exposes
  // hover + quick-fix for variables inherited from parent templates.

  const templateGraph = new TemplateGraphIndex();
  void templateGraph.build();
  context.subscriptions.push(templateGraph);

  const selector: vscode.DocumentSelector = [{ language: "html" }, { language: "jinja2" }];

  context.subscriptions.push(
    gotoDefinitionCommand(),
    vscode.languages.registerHoverProvider(
      selector,
      new InheritedVariableHover(templateGraph, templateRoots)
    ),
    vscode.languages.registerCodeActionsProvider(
      selector,
      new InheritedVariableActions(templateGraph, templateRoots),
      { providedCodeActionKinds: InheritedVariableActions.providedCodeActionKinds }
    )
  );

  // ── Advanced Linting (JHE12xx) ─────────────────────────────────────

  const lintEngine = new LintEngine(templateGraph, templateRoots);
  void lintEngine.refreshAll();
  context.subscriptions.push(lintEngine);

  // ── Macro completion (local + cross-file) ──────────────────────────

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      selector,
      new MacroCompletionProvider(templateGraph, templateRoots),
      "."
    ),
    vscode.languages.registerSignatureHelpProvider(
      selector,
      new MacroSignatureHelpProvider(templateGraph, templateRoots),
      "(",
      ","
    )
  );

  // ── Backend Intelligence ────────────────────────────────────────────
  // Scans Python/JS/TS backend files for render calls and indexes variables.

  const backendIndex = new BackendIndex();
  void backendIndex.build();
  context.subscriptions.push(backendIndex);

  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      selector,
      new BackendDefinitionProvider(backendIndex)
    ),
    vscode.languages.registerHoverProvider(selector, new BackendVariableHover(backendIndex)),
    vscode.languages.registerCodeActionsProvider(
      selector,
      new BackendVariableActions(backendIndex),
      { providedCodeActionKinds: BackendVariableActions.providedCodeActionKinds }
    )
  );

  const backendPanel = new BackendVariablePanel(backendIndex);
  context.subscriptions.push(backendPanel);

  // ── Variable Type Hints ─────────────────────────────────────────────
  // Infers types from backend annotations, inherited scope, and template usage.

  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      selector,
      new TypeHintHover(backendIndex, templateGraph, templateRoots)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("jinja2-html-enhancer.openBackendVariablePanel", () =>
      backendPanel.show()
    )
  );

  // Register inherited-variable origin provider directly (internal — no command round-trip).
  registerOriginProvider({
    id: "jinja2-free.inherited",
    provider: async (req: { uri: string; names: string[] }) => {
      const out: Record<string, { label: string; uri?: string; line?: number }> = {};
      let templateUri: vscode.Uri;
      try {
        templateUri = vscode.Uri.parse(req.uri);
      } catch {
        return out;
      }
      const inherited = await getInheritedScope(templateUri, {
        index: templateGraph,
        roots: templateRoots,
      });
      const requested = new Set(req.names);
      for (const sym of inherited) {
        if (!requested.has(sym.name) || out[sym.name]) {
          continue;
        }
        const via = sym.viaPath ? ` (via ${sym.viaPath})` : "";
        const labelPrefix = ((): string => {
          switch ((sym as InheritedSymbol).kind) {
            case "set":
              return "Inherited";
            case "macro":
              return "Macro";
            case "imported-macro":
              return "Imported macro";
            case "imported-namespace":
              return "Imported namespace";
          }
        })();
        out[sym.name] = {
          label: `${labelPrefix} from ${prettyOriginPath(sym.originUri)}${via}`,
          uri: sym.originUri.toString(),
          line: sym.originRange.start.line,
        };
      }

      // backend variables
      const backendVars = backendIndex.getSummaryFor(templateUri);
      for (const summary of backendVars) {
        if (!requested.has(summary.name) || out[summary.name]) continue;
        const first = summary.locations[0];
        if (!first) continue;
        out[summary.name] = {
          label: `Backend (${prettyOriginPath(first.uri)})`,
          uri: first.uri.toString(),
          line: first.range.start.line,
        };
      }

      return out;
    },
  });

  // ── Public contribution API — sister extensions (Jinja2 Enhance Pro) inject
  // origin metadata into the Variable Panel. See src/types/originProvider.ts.
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "jinja2-html-enhancer.registerOriginProvider",
      (reg: { id: string; provider: any }) => registerOriginProvider(reg)
    ),
    vscode.commands.registerCommand(
      "jinja2-html-enhancer.unregisterOriginProvider",
      (reg: { id: string }) => unregisterOriginProvider(reg)
    )
  );

  const firstActivation = context.globalState.get<number>("jinja2.firstActivation");
  if (firstActivation === undefined) {
    context.globalState.update("jinja2.firstActivation", Date.now() - 8 * 24 * 60 * 60 * 1000);
    vscode.window.showInformationMessage(I18n.__("review.welcomeMessage"));
  } else if (!context.globalState.get<boolean>("jinja2.reviewRequested")) {
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - firstActivation >= sevenDays) {
      const leaveLabel = I18n.__("review.action.leave");
      const neverLabel = I18n.__("review.action.never");
      vscode.window
        .showInformationMessage(
          I18n.__("review.message"),
          leaveLabel,
          I18n.__("review.action.later"),
          neverLabel
        )
        .then((selection) => {
          if (selection === leaveLabel) {
            vscode.env.openExternal(
              vscode.Uri.parse(
                "https://marketplace.visualstudio.com/items?itemName=Xubylele.jinja2-html-enhancer"
              )
            );
            vscode.env.openExternal(
              vscode.Uri.parse("https://open-vsx.org/extension/xubylele/jinja2-html-enhancer")
            );
            context.globalState.update("jinja2.reviewRequested", true);
          } else if (selection === neverLabel) {
            context.globalState.update("jinja2.reviewRequested", true);
          }
        });
    }
  }

  void maybePromptProUpsell(context);

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      if (document.languageId === "html" || document.languageId === "jinja2") {
        void templatePathDiagnostics.analyzeDocument(document);
        const result = await fileWatcher.analyzeDocument(document);
        if (result) {
          vscode.window.showInformationMessage(I18n.__("analyzer.analysisComplete"));
        }
      }
    })
  );

  // ── Format on save ─────────────────────────────────────────────────

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      if (document.languageId !== "html" && document.languageId !== "jinja2") {
        return;
      }
      const config = vscode.workspace.getConfiguration("jinja2-html-enhancer", document.uri);
      if (!config.get<boolean>("formatting.enabled", true)) return;
      if (!config.get<boolean>("formatting.formatOnSave", true)) return;

      // Skip if VS Code's own formatOnSave is already handling it
      const editorConfig = vscode.workspace.getConfiguration("editor", document.uri);
      if (editorConfig.get<boolean>("formatOnSave")) return;

      const edits = await formattingProvider.provideDocumentFormattingEdits(
        document,
        { tabSize: 2, insertSpaces: true },
        new vscode.CancellationTokenSource().token
      );
      if (edits.length === 0) return;

      const workspaceEdit = new vscode.WorkspaceEdit();
      workspaceEdit.set(document.uri, edits);
      await vscode.workspace.applyEdit(workspaceEdit);
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(async (document) => {
      if (document.languageId === "html" || document.languageId === "jinja2") {
        void templatePathDiagnostics.analyzeDocument(document);
        await fileWatcher.analyzeDocument(document);
      }
    })
  );
}

export function deactivate() {
  if (diagnosticsManager) {
    diagnosticsManager.clear();
    diagnosticsManager.dispose();
  }
  if (fileWatcher) {
    fileWatcher.dispose();
  }
}

function prettyOriginPath(uri: vscode.Uri): string {
  const folder = vscode.workspace.getWorkspaceFolder(uri);
  if (folder) {
    return uri.fsPath.slice(folder.uri.fsPath.length + 1);
  }
  return uri.fsPath;
}
