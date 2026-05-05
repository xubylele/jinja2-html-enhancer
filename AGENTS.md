# Jinja2 Enhance — VS Code Extension

## Stack

- Runtime: VS Code Extension Host (Node.js)
- Language: TypeScript 6.0 (strict, target: ES2022, jsx: react)
- Engine: VS Code ^1.102.0
- Key deps: `i18n`, `react` 19 + `react-dom` 19, `tailwindcss` 4, `uuid` 14, `esbuild`

## Build

Two separate esbuild entrypoints produce three artifacts:
- `out/extension.js` — CJS, Node platform, `vscode` external
- `out/App.js` — ESM, browser platform (webview React UI)
- `out/css/output.css` — Tailwind output (`npm run build:tailwind`)

Required build order: `check-types` → `lint` → `build:tailwind` → `esbuild`

| Script | Effect |
| ------ | ------ |
| `npm run compile` | check-types + lint + build:tailwind + esbuild |
| `npm run package` | compile --production + validate-build |
| `npm run watch` | build:tailwind + esbuild --watch |
| `npm run validate-build` | fails if any output artifact is missing |

## Test

- Jest + jsdom; `vscode` mocked via `test/mocks/vscode.ts`
- Tests: `test/**/*.test.ts`
- Coverage excludes `src/themes/**`, `src/theme/**`, `src/ui/**`, `src/extension.ts`
- Threshold: 80% lines/branches/functions/statements

| Script | Effect |
| ------ | ------ |
| `npm test` | jest --runInBand |
| `npm run test:ci` | jest --runInBand --ci |

## Architecture

| Layer | Files | Notes |
| ----- | ----- | ----- |
| Entry | `src/extension.ts` | Activates singletons: `diagnosticsManager`, `fileWatcher` |
| Commands | `src/commands/` | `commandManager.ts`, `commentToggle.ts` |
| Diagnostics | `src/diagnostics/diagnosticsManager.ts` | Imports `vscode.*` |
| Watchers | `src/watchers/fileWatcher.ts` | Imports `vscode.*` |
| Theme service | `src/theme/themeChoose.ts` | Imports `vscode.*` — applies token color customizations |
| Theme data | `src/themes/` | Static color objects only — no `vscode.*` imports |
| Webview UI | `src/ui/App.tsx`, `src/ui/components/` | React + Tailwind — browser-only, no vscode imports |
| API | `src/api/originProviderRegistry.ts` | Public API for Pro extension injection |
| Config | `src/config/configService.ts` | Reads `jinja2-html-enhancer.*` settings |

## Rules

- Push every `registerCommand` / `registerProvider` to `context.subscriptions`
- Dispose watchers and listeners on `deactivate()`
- `src/themes/` must not import `vscode.*`
- `src/ui/` webview code must not import `vscode.*`

## Changesets

- PR → `develop` requires a changeset (`npm run changeset`)
- PR → `main` / `pre*` must have no `.changeset/*.md` files (they must be consumed first)
- Apply: `npm run version` (runs `changeset version` + `npm install`)

## Commands

| Command | Keybinding | Description |
| --------- | ------------ | ------------- |
| `extension.checkJinja2Variables` | — | Analyze current document for undefined Jinja2 variables |
| `extension.openVariablePanel` | — | Open sidebar webview showing variable definition status |
| `extension.saveVariable` | — | Save an undefined variable to workspace/resource config |
| `extension.toggleVariableCheck` | — | Toggle the variable check setting on/off |
| `extension.changeTheme` | — | Apply or remove Jinja2 token color customizations |
| `extension.toggleJinja2Comment` | `cmd+/` / `ctrl+/` | Toggle `{# ... #}` comments on selected lines |

## Config Settings

| Setting | Effect |
| --------- | -------- |
| `jinja2-html-enhancer.customVariables` | Whitelist of file-specific variables to suppress JHE0001 warnings |
| `jinja2-html-enhancer.toggleVariableCheck` | Master on/off switch for variable analysis (default: off) |

## Commit Convention

✨ feature | 🐛 fix | ♻️ refactor | 🧪 tests | 📝 docs | 🔧 config
