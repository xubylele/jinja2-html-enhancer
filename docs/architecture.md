# Architecture

## Extension Lifecycle

- **Activation trigger**: `onLanguage:html` — activates when any HTML file is opened
- **`activate()` registers**:
  - 6 commands (`checkJinja2Variables`, `openVariablePanel`, `saveVariable`, `toggleVariableCheck`, `changeTheme`, `toggleJinja2Comment`)
  - 1 `CodeActionProvider` (QuickFixProvider for diagnostic JHE0001)
  - 1 `onDidSaveTextDocument` listener that triggers document analysis on save
  - Review prompt logic (shows welcome on first install, asks for review after 7 days)
- **`deactivate()` cleans up**: `DiagnosticsManager` (clears + disposes collection), `FileWatcher` (disposes file system watcher)

## Layer Map

| Layer      | Files                                                                                                                     | Responsibility                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Activation | `src/extension.ts`                                                                                                        | Wires up commands, providers, listeners, review prompt                |
| Commands   | `src/commands/commandManager.ts`, `src/commands/commentToggle.ts`                                                         | Thin handlers delegating to FileWatcher / VariablePanelManager        |
| Providers  | `src/codeActions/quickFixProvider.ts`, `src/ui/panels/variablePanel.ts`                                                   | CodeActionProvider for quick fixes; WebviewPanel for variable display |
| Services   | `src/diagnostics/diagnosticsManager.ts`, `src/watchers/fileWatcher.ts`, `src/theme/themeChoose.ts`, `src/translations.ts` | Diagnostics creation, file watching/analysis, theme application, i18n |
| Models     | `src/themes/*.ts`, `src/themes/index.ts`                                                                                  | Static theme color definitions (textMateRules objects)                |
| Utils      | `src/utils/variables.ts`, `src/diagnostics/variableAnalyzer.ts`                                                           | Pure helpers: regex extraction, config target resolution              |

## Data Flow

```makefile
User opens .html file
  └─ Extension activates (onLanguage:html)
       └─ FileWatcher creates FileSystemWatcher (**/*.html)
       └─ onDidSaveTextDocument listener registered

User triggers "Check Variables" command
  └─ CommandManager.checkVariables()
       └─ FileWatcher.analyzeDocument()
            └─ variableAnalyzer.extractVariables()  ← regex parsing
            └─ variableAnalyzer.analyzeNestedStructures()  ← for/if/set blocks
            └─ Merges with customVariables from workspace config
            └─ DiagnosticsManager.updateDiagnostics()
                 └─ Creates vscode.Diagnostic for each undefined variable (code: JHE0001)
                 └─ Fires onDidUpdateDiagnostics event

QuickFixProvider (on diagnostic hover/lightbulb)
  └─ Provides "Save variable" code action → triggers extension.saveVariable command
       └─ CommandManager.saveVariable()
            └─ Extracts variable name from diagnostic message
            └─ Writes to workspace/resource config (customVariables)
            └─ Re-runs checkVariables()

User triggers "Open Variable Panel"
  └─ CommandManager.openVariablePanel()
       └─ FileWatcher.analyzeDocument() → VariablePanelManager.show()
            └─ Creates/reveals vscode.WebviewPanel
            └─ Renders React App (App.tsx → VariablePanel.tsx) via bundled App.js

User triggers "Toggle Comment" (cmd+/ or ctrl+/)
  └─ CommentToggle.toggle()
       └─ Wraps/unwraps lines with {# ... #}

User triggers "Change Theme"
  └─ CommandManager.changeTheme()
       └─ themeChoose.chooseThemeSelector() → writes editor.tokenColorCustomizations
```

## VS Code API Surface

| Namespace                                     | Usage                                                                                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vscode.commands`                             | `registerCommand` for all 6 commands                                                                                                              |
| `vscode.window`                               | `showInformationMessage`, `showWarningMessage`, `showErrorMessage`, `showQuickPick`, `activeTextEditor`, `createWebviewPanel`, `env.openExternal` |
| `vscode.workspace`                            | `getConfiguration`, `onDidSaveTextDocument`, `createFileSystemWatcher`, `getWorkspaceFolder`, `openTextDocument`                                  |
| `vscode.languages`                            | `createDiagnosticCollection`, `registerCodeActionsProvider`                                                                                       |
| `vscode.Diagnostic`                           | Create warnings with code JHE0001                                                                                                                 |
| `vscode.Range` / `vscode.Position`            | Map variable positions in document                                                                                                                |
| `vscode.CodeAction` / `vscode.CodeActionKind` | Quick fix code actions                                                                                                                            |
| `vscode.ConfigurationTarget`                  | Global / WorkspaceFolder config scope                                                                                                             |
| `vscode.EventEmitter`                         | Event propagation (diagnostics update, document analysis)                                                                                         |
| `vscode.env.language`                         | Detect user locale for i18n                                                                                                                       |
| `vscode.Uri`                                  | File paths, webview URIs, external URLs                                                                                                           |
| `vscode.TextEditorEdit`                       | Text replacements for comment toggle                                                                                                              |

## Known Layer Violations / Tech Debt

1. **`src/utils/variables.ts` imports `vscode`** — `getVscodeConfigTarget` and `getConfiguration` depend on `vscode.ConfigurationTarget` and `vscode.workspace.getConfiguration`. Should be in a `src/config/` layer.
2. **`src/watchers/fileWatcher.ts` mixes service + config concerns** — reads `toggleVariableCheck` and `customVariables` config directly instead of delegating to a config service.
3. **`src/diagnostics/diagnosticsManager.ts` imports `vscode`** — creates `DiagnosticCollection` directly. Acceptable for a VS Code extension but means it cannot be unit-tested without mocking vscode.
4. **`src/theme/themeChoose.ts` mixes service + config + UI** — presents QuickPick, reads current theme config, writes `editor.tokenColorCustomizations`. Should be split into theme service + config writer.
5. **`src/commands/commandManager.ts` has config write logic** — `changeConfiguration()` and `saveVariable()` both call `config.update()` directly. A config service would centralize this.
6. **`src/translations.ts` exports raw `i18n` module as default** — callers access `i18n.__()` and `i18n.getCatalog()` directly, creating tight coupling to the `i18n` library.
7. **Module-level singletons in `extension.ts`** — `diagnosticsManager` and `fileWatcher` are module-scoped `let` variables, not stored in `ExtensionContext`. This works because `deactivate()` references them, but violates the "no module-level singletons" best practice.
8. **`src/intelligence/` is an empty directory** — dead folder, should be removed.
