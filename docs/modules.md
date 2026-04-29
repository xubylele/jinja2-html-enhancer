# Module Reference

## `src/extension.ts`

**Layer:** Activation
**Purpose:** Entry point — registers all commands, providers, listeners, and review prompt on activation; cleans up on deactivation.

### Exports

| Name | Type | Description |
| ------ | ------ | ------------- |
| `activate` | function | Registers commands, CodeActionProvider, onDidSaveTextDocument listener, and review prompt logic |
| `deactivate` | function | Clears diagnostics and disposes file watcher |

### Dependencies

- Internal: `./codeActions/quickFixProvider`, `./commands/commandManager`, `./commands/commentToggle`, `./diagnostics/diagnosticsManager`, `./translations`, `./ui/panels/variablePanel`, `./watchers/fileWatcher`
- VS Code API: `vscode.commands`, `vscode.window`, `vscode.languages`, `vscode.workspace`
- External: none

### Side Effects

- Registers 6 commands into `context.subscriptions`
- Registers CodeActionProvider for HTML documents
- Registers `onDidSaveTextDocument` listener
- Writes `jinja2.firstActivation` to `context.globalState` on first run
- May show review prompt after 7 days

---

## `src/commands/commandManager.ts`

**Layer:** Commands
**Purpose:** Central command handler that delegates to FileWatcher, VariablePanelManager, and theme services.

### Exports

| Name | Type | Description |
| ------ | ------ | ------------- |
| `CommandManager` | class | Wraps fileWatcher + variablePanelManager; exposes checkVariables, openVariablePanel, changeConfiguration, saveVariable, changeTheme |

### Dependencies

- Internal: `../theme/themeChoose`, `../translations`, `../ui/panels/variablePanel`, `../utils/variables`, `../watchers/fileWatcher`
- VS Code API: `vscode.window`, `vscode.workspace`, `vscode.ConfigurationTarget`
- External: none

---

## `src/commands/commentToggle.ts`

**Layer:** Commands
**Purpose:** Toggles Jinja2 block comments (`{# ... #}`) on selected lines or current cursor line.

### Exports

| Name | Type | Description |
| ------ | ------ | ------------- |
| `CommentToggle` | class | `toggle()` — wraps/unwraps lines with `{# ... #}` based on selection state |

### Dependencies

- Internal: `../translations`
- VS Code API: `vscode.window`, `vscode.TextEditorEdit`, `vscode.TextLine`, `vscode.TextDocument`
- External: none

---

## `src/diagnostics/diagnosticsManager.ts`

**Layer:** Services
**Purpose:** Manages VS Code diagnostic collection for undefined Jinja2 variables (code: JHE0001).

### Exports

| Name | Type | Description |
| ------ | ------ | ------------- |
| `DiagnosticsManager` | class | Creates/updates/clears diagnostics; fires `onDidUpdateDiagnostics` event |

### Dependencies

- Internal: `../translations`
- VS Code API: `vscode.languages`, `vscode.Diagnostic`, `vscode.Range`, `vscode.DiagnosticSeverity`, `vscode.EventEmitter`, `vscode.TextDocument`
- External: none

### Side Effects

- Creates a `DiagnosticCollection` named `jinja2`
- Fires `onDidUpdateDiagnostics` event on each `updateDiagnostics()` call

---

## `src/diagnostics/variableAnalyzer.ts`

**Layer:** Utils
**Purpose:** Pure regex-based extraction of used and set variables from Jinja2 template text.

### Exports

| Name | Type | Description |
| ------ | ------ | ------------- |
| `extractVariables` | function | Extracts `{{ var }}` as used and `{% set var = %}` / `{% for var in %}` as set variables |
| `analyzeNestedStructures` | function | Tracks `for`/`if`/`set` block nesting and returns loop/defined variable names |

### Dependencies

- Internal: none
- VS Code API: none
- External: none

---

## `src/codeActions/quickFixProvider.ts`

**Layer:** Providers
**Purpose:** Provides "Save variable" quick-fix code actions for JHE0001 diagnostics.

### Exports

| Name | Type | Description |
| ------ | ------ | ------------- |
| `QuickFixProvider` | class (implements `vscode.CodeActionProvider`) | Filters diagnostics by code JHE0001; creates CodeAction that triggers `extension.saveVariable` |

### Dependencies

- Internal: `../translations`, `../utils/variables`
- VS Code API: `vscode.CodeAction`, `vscode.CodeActionKind`, `vscode.TextDocument`, `vscode.Range`, `vscode.Selection`, `vscode.CodeActionContext`
- External: none

---

## `src/theme/themeChoose.ts`

**Layer:** Services
**Purpose:** Presents theme picker QuickPick and applies/removes Jinja2 token color customizations.

### Exports

| Name | Type | Description |
| ------ | ------ | ------------- |
| `chooseThemeSelector` | function | Shows QuickPick of 5 themes; merges selected theme's textMateRules into `editor.tokenColorCustomizations` |

### Dependencies

- Internal: `../translations`, `../themes/*` (all 5 themes)
- VS Code API: `vscode.window`, `vscode.workspace`, `vscode.ConfigurationTarget`
- External: none

---

## `src/themes/index.ts`

**Layer:** Models
**Purpose:** Barrel re-export of all 5 theme objects.

### Exports

Re-exports: `darkDefaultTheme`, `darkHighContrast`, `lightDefaultTheme`, `lightHighContrast`, `xubySelectionTheme`

---

## `src/themes/darkDefaultTheme.ts` through `src/themes/xubySelectionTheme.ts`

**Layer:** Models
**Purpose:** Static textMateRules color definitions for each theme variant.

### Exports (per file)

| Name | Type | Description |
| ------ | ------ | ------------- |
| `*Theme` | const object | `{ textMateRules: Array<{ scope, settings: { foreground, fontStyle? } }> }` |

### Dependencies

- None — pure data objects

---

## `src/translations.ts`

**Layer:** Services
**Purpose:** Initializes `i18n` library with VS Code locale and locale files; exports i18n module for use across the extension.

### Exports

| Name | Type | Description |
| ------ | ------ | ------------- |
| `setupI18n` | function | Configures i18n with locales `en`, `es`; sets locale to `vscode.env.language` |
| `I18n` (default) | i18n module | Used as `I18n.__(key, interpolations)` and `I18n.getCatalog()` |

### Dependencies

- Internal: none
- VS Code API: `vscode.env`, `vscode.ExtensionContext`
- External: `i18n`

---

## `src/watchers/fileWatcher.ts`

**Layer:** Services
**Purpose:** Watches `.html` files for changes, analyzes documents for Jinja2 variables, and updates diagnostics.

### Exports

| Name | Type | Description |
| ------ | ------ | ------------- |
| `FileWatcher` | class | Creates FileSystemWatcher; `analyzeDocument()` extracts variables, merges customVariables, updates diagnostics; fires `onDidAnalyzeDocument` |

### Dependencies

- Internal: `../diagnostics/diagnosticsManager`, `../diagnostics/variableAnalyzer`, `../translations`, `../utils/variables`
- VS Code API: `vscode.workspace`, `vscode.window`, `vscode.FileSystemWatcher`, `vscode.EventEmitter`, `vscode.TextDocument`, `vscode.Uri`, `vscode.ConfigurationTarget`
- External: none

### Side Effects

- Creates a `FileSystemWatcher` for `**/*.html`
- Writes diagnostics via DiagnosticsManager
- Fires `onDidAnalyzeDocument` event (propagated from DiagnosticsManager)

---

## `src/utils/variables.ts`

**Layer:** Utils
**Purpose:** Helper functions for extracting variable names from diagnostic messages and resolving VS Code config targets.

### Exports

| Name | Type | Description |
| ------ | ------ | ------------- |
| `extractVariableName` | function | Extracts variable name from a diagnostic message string via regex `'([^']+)'` |
| `getVscodeConfigTarget` | function | Returns `ConfigurationTarget.WorkspaceFolder` or `ConfigurationTarget.Global` based on editor path |
| `getConfiguration` | function (async) | Reads a config value from `jinja2-html-enhancer` configuration |

### Dependencies

- Internal: none
- VS Code API: `vscode.workspace`, `vscode.ConfigurationTarget`, `vscode.TextEditor`
- External: none

---

## `src/ui/panels/variablePanel.ts`

**Layer:** Providers
**Purpose:** Manages a VS Code WebviewPanel that displays Jinja2 variable analysis results as a React app.

### Exports

| Name | Type | Description |
| ------ | ------ | ------------- |
| `VariablePanelManager` | class | `show()` — creates/reveals webview; `updateContent()` — renders HTML with React bundle + Tailwind CSS + params |

### Dependencies

- Internal: `../../translations`, `../../watchers/fileWatcher`
- VS Code API: `vscode.window`, `vscode.WebviewPanel`, `vscode.ViewColumn`, `vscode.Uri`, `vscode.Disposable`
- External: `path` (Node.js built-in)

### Side Effects

- Subscribes to `fileWatcher.onDidAnalyzeDocument` to auto-update panel content
- Creates a singleton webview panel (one panel, reused on subsequent `show()` calls)

---

## `src/ui/App.tsx`

**Layer:** UI (Webview)
**Purpose:** React entry point for the variables webview — renders header, VariablePanel component, footer; handles dark mode via `prefers-color-scheme`.

### Exports

None — self-executing via `ReactDOM.createRoot`.

### Dependencies

- Internal: `./components/VariablePanel`
- External: `react`, `react-dom`

---

## `src/ui/components/VariablePanel.tsx`

**Layer:** UI (Webview)
**Purpose:** React component that renders a table of used variables with Defined/Undefined status.

### Exports

| Name | Type | Description |
| ------ | ------ | ------------- |
| `VariablePanel` | React.FC | Accepts `usedVariables` and `setVariables` arrays; renders table with green/red status |

### Dependencies

- External: `react`
