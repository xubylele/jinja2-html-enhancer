# Jinja2 Enhance — VS Code Extension

## What This Is

A VS Code extension that provides syntax highlighting, variable checking, and comment toggling for Jinja2 templates embedded in HTML files.

## Stack

- Runtime: VS Code Extension Host (Node.js)
- Language: TypeScript 6.0 (strict: true, target: ES2022, jsx: react)
- VS Code Engine: ^1.102.0
- Key deps: `i18n` (localization), `react` 19 + `react-dom` 19 (webview UI), `tailwindcss` 4 (webview styling), `uuid` 14, `esbuild` (bundler)

## Layer Model

| Layer | Files | Rule |
| ------- | ------- | ------ |
| Activation | `src/extension.ts` | Wires up commands, providers, listeners — minimal logic |
| Commands | `src/commands/` | Thin handlers — delegate to FileWatcher, VariablePanelManager, theme services |
| Providers | `src/codeActions/`, `src/ui/panels/` | CodeActionProvider + WebviewPanel management |
| Services | `src/diagnostics/`, `src/watchers/`, `src/theme/`, `src/translations.ts` | Business logic — **violates**: imports `vscode.*` directly |
| Models | `src/themes/` | Static color data objects only |
| Utils | `src/utils/`, `src/diagnostics/variableAnalyzer.ts` | Pure regex helpers — **violates**: `variables.ts` imports `vscode.*` |
| UI (Webview) | `src/ui/App.tsx`, `src/ui/components/` | React components — browser-only, no vscode imports |

## Non-Negotiables

- No `vscode.*` imports in `src/themes/` (currently clean)
- `src/diagnostics/variableAnalyzer.ts` must stay pure (currently clean)
- Every `registerCommand` / `registerProvider` must be pushed to `context.subscriptions`
- Dispose all watchers and listeners on `deactivate()`
- Module-level singletons (`diagnosticsManager`, `fileWatcher`) in `extension.ts` are a known risk

## Active Commands

| Command | Keybinding | Description |
| --------- | ------------ | ------------- |
| `extension.checkJinja2Variables` | — | Analyze current document for undefined Jinja2 variables |
| `extension.openVariablePanel` | — | Open sidebar webview showing variable definition status |
| `extension.saveVariable` | — | Save an undefined variable to workspace/resource config |
| `extension.toggleVariableCheck` | — | Toggle the variable check setting on/off |
| `extension.changeTheme` | — | Apply or remove Jinja2 token color customizations |
| `extension.toggleJinja2Comment` | `cmd+/` / `ctrl+/` | Toggle `{# ... #}` comments on selected lines |

## Active Providers

| Provider | Language | Purpose |
| ---------- | ---------- | --------- |
| `QuickFixProvider` | HTML | Quick-fix "Save variable" for JHE0001 diagnostics |
| `VariablePanelManager` (WebviewPanel) | — | React-based panel showing variable analysis results |

## Key Config Settings

| Setting | Effect |
| --------- | -------- |
| `jinja2-html-enhancer.customVariables` | Whitelist of file-specific variables to suppress JHE0001 warnings |
| `jinja2-html-enhancer.toggleVariableCheck` | Master on/off switch for variable analysis (default: off) |

## Commit Convention

- ✨ feature | 🐛 fix | ♻️ refactor | 🧪 tests | 📝 docs | 🔧 config
