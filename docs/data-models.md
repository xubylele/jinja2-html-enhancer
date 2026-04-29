# Data Models

## Types & Interfaces

### `Theme` (internal to `src/theme/themeChoose.ts`)

**Defined in:** `src/theme/themeChoose.ts:12`
**Purpose:** Shape for a theme's textMateRules configuration.

```typescript
type Theme = {
  textMateRules: Array<{
    scope: string;
    settings: {
      foreground: string;
      fontStyle?: string;
    };
  }>;
};
```

### `ThemeName` (internal to `src/theme/themeChoose.ts`)

**Defined in:** `src/theme/themeChoose.ts:11`
**Purpose:** Union of available theme identifiers.

```typescript
type ThemeName = 'darkDefault' | 'lightDefault' | 'darkHighContrast' | 'lightHighContrast' | 'xubySelection';
```

### `Variable` (internal to `src/ui/components/VariablePanel.tsx`)

**Defined in:** `src/ui/components/VariablePanel.tsx:3`
**Purpose:** UI shape representing a variable with its definition status.

```typescript
interface Variable {
  name: string;
  isDefined: boolean;
}
```

### `VariablePanelProps` (internal to `src/ui/components/VariablePanel.tsx`)

**Defined in:** `src/ui/components/VariablePanel.tsx:8`
**Purpose:** Props for the VariablePanel React component.

```typescript
interface VariablePanelProps {
  usedVariables: string[];
  setVariables: string[];
}
```

### `params` (global declaration in `src/ui/App.tsx`)

**Defined in:** `src/ui/App.tsx:5`
**Purpose:** Global `params` object injected into the webview HTML by VariablePanelManager.

```typescript
declare const params: {
  translations: Record<string, string>;
  usedVariables: string[];
  setVariables: string[];
};
```

### Theme Objects (exported from `src/themes/*.ts`)

**Defined in:** Each `src/themes/*.ts` file
**Purpose:** Static objects matching the `Theme` type above. Each contains `textMateRules` for 6 Jinja2 scope categories:

- `keyword.control.jinja2`
- `entity.filter.jinja2`
- `variable.interpolation.jinja2`
- `punctuation.definition.tag.jinja2, punctuation.definition.interpolation.jinja2`
- `punctuation.section.group.begin.jinja2, punctuation.section.group.end.jinja2`
- `comment.block.jinja2`

Exported names: `darkDefaultTheme`, `darkHighContrast`, `lightDefaultTheme`, `lightHighContrast`, `xubySelectionTheme`.

---

## Extension State

### `ExtensionContext.globalState`

| Key | Type | Scope | Description |
| ----- | ------ | ------- | ------------- |
| `jinja2.firstActivation` | `number` | Global | Timestamp of first extension activation (set to `Date.now() - 8 days` on first run so review triggers after 7 real days) |
| `jinja2.reviewRequested` | `boolean` | Global | Whether the user has already been prompted to leave a review |

### `ExtensionContext.subscriptions`

| Subscription | Type | Description |
| -------------- | ------ | ------------- |
| `checkVariablesDisposable` | `Disposable` | Command: `extension.checkJinja2Variables` |
| `openPanelDisposable` | `Disposable` | Command: `extension.openVariablePanel` |
| `saveVariableDisposable` | `Disposable` | Command: `extension.saveVariable` |
| `toggleVariableCheck` | `Disposable` | Command: `extension.toggleVariableCheck` |
| `themeChangeDisposable` | `Disposable` | Command: `extension.changeTheme` |
| `toggleCommentDisposable` | `Disposable` | Command: `extension.toggleJinja2Comment` |
| CodeActionProvider registration | `Disposable` | QuickFixProvider for HTML |
| `onDidSaveTextDocument` listener | `Disposable` | Analyzes HTML documents on save |

### Module-Level Variables (`src/extension.ts`)

| Variable | Type | Scope | Description |
| ---------- | ------ | ------- | ------------- |
| `diagnosticsManager` | `DiagnosticsManager \| undefined` | Module | Singleton — cleared and disposed on `deactivate()` |
| `fileWatcher` | `FileWatcher \| undefined` | Module | Singleton — disposed on `deactivate()` |

### `VariablePanelManager` Instance State

| Property | Type | Description |
| ---------- | ------ | ------------- |
| `panel` | `vscode.WebviewPanel \| undefined` | Singleton webview — reused across `show()` calls |
| `disposables` | `vscode.Disposable[]` | Internal disposables (fileWatcher event subscription) |

---

## Configuration Schema

From `package.json` → `contributes.configuration`:

| Setting | Type | Default | Scope | Description |
| --------- | ------ | --------- | ------- | ------------- |
| `jinja2-html-enhancer.customVariables` | `object` | `{}` | `resource` | Map of file paths to arrays of custom variable names (e.g., `{ "/path/to/file.html": ["myVar"] }`) |
| `jinja2-html-enhancer.toggleVariableCheck` | `boolean` | `false` | `resource` | Enables/disables automatic variable checking on document analysis |

Additionally, the extension writes to VS Code's built-in settings (not declared in its own schema):

- `workbench.editor.tokenColorCustomizations.textMateRules` — modified by `changeTheme` command (Global target)

---

## Diagnostic Codes

| Code | Severity | Source | Description |
| ------ | ---------- | -------- | ------------- |
| `JHE0001` | Warning | `DiagnosticsManager` | Variable is used (`{{ var }}`) but not set (no `{% set var = %}`, `{% for var in %}`, or custom variable entry) |
