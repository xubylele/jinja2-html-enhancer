# Change Log

## 1.17.0

### Minor Changes

- 626658b: New: hover docs for built-in Jinja2 filters. Hover any pipe filter (`length`, `default`, `safe`, …) and see its signature, description, and a usage example. Available in English and Spanish.
- 6e1dd68: New: Jinja2-aware formatting via `prettier-plugin-jinja-template` integration. The extension auto-detects the plugin in your project and delegates formatting to it — best-in-class Jinja2+HTML formatting with zero custom parser maintenance. If the plugin isn't found, the extension offers to install it automatically.
  - Works for `.html`, `.jinja2`, `.j2`, and `.jinja` files
  - Format on save via `jinja2-html-enhancer.formatting.formatOnSave` (enabled by default, but skips if VS Code's global `editor.formatOnSave` is already active)
  - Master toggle: `jinja2-html-enhancer.formatting.enabled`
  - Manual formatting via VS Code's format command (`Shift+Alt+F` / `Shift+Option+F`)

- 175bb5a: New: autocomplete and parameter hints for macros defined in the same file. Type `{{ ` to see local macros with their signatures, and trigger signature help with `(` to see parameters as you type.
- b63fe95: New: Template Preview v2. Save multiple named context profiles per template (or a workspace-wide `*` fallback) in your settings, switch between them from a sidebar, and start fast with built-in mock data presets (`user`, `list`, `paginated`, `form`). The rendered preview now updates live as you edit the JSON context or the template itself, missing variables show as clickable chips that you can add to the active profile with one click, and the context editor can be collapsed to give the rendered preview the full panel width. Adds the `Jinja2: Preview Template with Profile` quick-pick command.

### Patch Changes

- 076ba1c: Fixed: creating context profiles in the template preview panel.
  - The "+ New Profile" button now opens an inline name input (VS Code webviews block `window.prompt`, which is why the button looked dead).
  - Profile saves now resolve their config-target from the template's own URI instead of `activeTextEditor` — clicking inside the webview steals focus from the editor, so the previous code was writing to a target the URI-scoped reader couldn't see, and any failure was swallowed silently. Errors now surface as a VS Code error toast.

- 219ce43: Migrated from npm to pnpm@11.0.8 for improved supply-chain security. The [TanStack npm supply-chain compromise](https://tanstack.com/blog/npm-supply-chain-compromise-postmortem) (May 2026) demonstrated how npm's dependency-resolution model allows malicious lifecycle scripts during install to harvest credentials and self-propagate. pnpm's content-addressable store and build-scripts-blocked-by-default (`ERR_PNPM_IGNORED_BUILDS`) mitigate this attack class. A side-effect: pnpm is not natively supported by `@vscode/vsce`, so packaging/publishing now uses `--no-dependencies` (both extensions already bundle with esbuild, so no `node_modules` are needed in the `.vsix`). CI workflows updated: `actions/setup-node` caching switched to `cache: pnpm`, and `pnpm/action-setup@v5` added before it.
- 97b7448: Update roadmap

## 1.16.0

### Minor Changes

- 43535e4: New: after a month of using the free extension, a one-time message suggests upgrading to Pro with quick actions to install it from the Marketplace or learn more. The prompt is skipped automatically if Jinja2 Enhance Pro is already installed.

## 1.15.0

### Minor Changes

- 🎉 Template Preview is now officially released — available in the stable release (removed pre-release status)
- ✨ Template Preview panel — see rendered HTML with variable highlighting, dark-themed UI with improved visibility for missing variables

## 1.14.2

### Patch Changes

- adc99ce: Update CI workflow to remove GitHub Packages token dependency. Shared package now published to public npmjs.com. Update AGENTS.md to reflect shared dependency change from git+ssh to npm registry.

## 1.14.1

### Patch Changes

- cadd613: fix readme

## 1.14.0

### Minor Changes

- dada25b: ✨ Improve Template Preview styling with dark theme background, blue-bordered preview container, and enhanced missing variable highlighting for better visibility

## 1.13.0

### Minor Changes

- 1f1ae86: ✨ Variables checked automatically — zero config required

  Variable checking is now **ON by default** after install. Open any HTML or Jinja2 file and undefined variables appear immediately as diagnostics — no settings toggle needed.
  - **Auto-analyze on file open.** Opening a file triggers variable analysis automatically. No more manual "Check Variables" command.
  - **Save still re-checks.** Editing and saving a file continues to refresh diagnostics instantly.
  - Existing users who explicitly turned variable checking off keep their preference — the new default only applies to fresh installs.

- 1f1ae86: ✨ Variable Panel: Origin column + contribution API for sister extensions

  The Variable Panel now has room for a third **Origin** column that explains _where each variable comes from_ — local, inherited from a parent template, imported, or passed by the backend. The column only appears when origin metadata is available; existing free-only installs see no UI change.
  - **New Status: Inherited.** Variables that aren't declared locally but are recognized by an origin provider now render as **Inherited** (blue) instead of **Undefined** (red). The third state makes it instantly obvious which "missing" names are actually fine.
  - **Public contribution API.** Sister extensions (e.g. Jinja2 Enhance Pro) can call two new VS Code commands to inject origin metadata into the panel:
    - `jinja2-html-enhancer.registerOriginProvider({ id, provider })`
    - `jinja2-html-enhancer.unregisterOriginProvider({ id })`

    The provider callback receives `{ uri, names }` and returns `Record<string, { label, uri?, line? }>`. Async providers are supported. Provider exceptions are isolated — a buggy sister extension can't break the panel. Type contracts live in `src/types/originProvider.ts`.

  - **Cleanup.** Removed the dead `src/intelligence/` directory called out in `docs/architecture.md`.

## 1.12.2

### Patch Changes

- 75e718f: Update the roadmap to reflect only the features that are currently implemented in the free extension, removing any references to Pro features or future plans.

## 1.12.1

### Patch Changes

- a29b1a3: Extract pure utilities into a shared package and isolate VS Code-dependent config helpers

  Internal refactor with no user-visible behavior change. Resolves the architecture tech-debt items flagged in `docs/architecture.md` (mixed concerns in `src/utils/variables.ts` and pure-but-misplaced regex helpers).
  - The pure variable analyzer (`extractVariables`, `analyzeNestedStructures`) and diagnostic-message helper (`extractVariableName`) now live in the external `jinja2-enhanced-shared` package, consumed via git URL pinned to `v0.1.0`. The same package will be reused by the upcoming Pro extension to avoid duplication.
  - The VS Code-dependent `getConfiguration` and `getVscodeConfigTarget` helpers move to a new `src/config/configService.ts` layer.
  - `src/utils/variables.ts` and `src/diagnostics/variableAnalyzer.ts` are deleted; their tests move alongside the new locations.
  - Imports updated in `quickFixProvider`, `commandManager`, `fileWatcher`, and the `fileWatcher` test mock.

## 1.12.0

### Minor Changes

- 19e3b03: Add standalone Jinja2 language support with file icons for `.jinja2`, `.j2`, and `.jinja` files. Files now display a proper Jinja2 icon in the VS Code file explorer and get syntax highlighting when opened directly.
- c3e9a79: Add 10 built-in Jinja2 code snippets. Type `for`, `if`, `ife`, `block`, `extends`, `include`, `set`, `macro`, `with`, or `filter` in any `.html` file and get a ready-to-use Jinja2 snippet with tabstop placeholders.

## 1.11.0

### Minor Changes

- 7588e9d: Add Jinja2 comment toggling via `Ctrl+/` (`Cmd+/` on macOS)

  Pressing the comment shortcut in any `.html` file now inserts `{# #}` instead of `<!-- -->`, matching the correct Jinja2 comment syntax. The command supports:
  - Single-line toggling at the cursor position
  - Multi-line toggling across a selection (all lines commented or uncommented together based on current state)
  - Indentation preservation when adding or removing comment markers
  - Skipping empty lines within a multi-line selection

  The command is also available via the command palette as "Toggle Jinja2 Comment".

## 1.10.4

### Patch Changes

- fix changelog issue and add ROADMAP to set the future features and improvements of the extension.

## 1.10.3

### Patch Changes

- add openvsx link to README.md.

## 1.10.2

### Patch Changes

- Fix HTML comment injection inside `<style>` and `<script>` blocks
  - Removed `"include": "text.html.basic"` from the injection grammar. Re-including it inside an injection grammar caused HTML comment patterns to bleed into embedded CSS and JS scopes.
  - Removed `"language": "html"` from the grammar contribution in `package.json`, converting it to a pure injection grammar. VS Code's built-in HTML grammar now handles HTML parsing; this extension only injects Jinja2 patterns on top.
  - Changed `injectionSelector` from `"text.html"` to `"L:text.html"` so Jinja2 `{% %}` and `{{ }}` patterns are still applied inside `<style>` and `<script>` blocks.

## 1.10.1

### Patch Changes

- Add review prompt after 7 days of use
  - Added a review prompt that appears after 7 days of first activation, asking users to leave a review on the VS Code Marketplace. Tracks state via `globalState` keys `jinja2.firstActivation` and `jinja2.reviewRequested`.
  - Added NLS localization keys for the review prompt in `package.nls.json` and `package.nls.es.json`.
  - Updated `activate()` in `extension.ts` to include review prompt logic.

## [1.10.0] - 2025-07-24 Release

### ✨ Added v1.10.0

- **Token Color Customizations**:
  - Finalized the implementation of `editor.tokenColorCustomizations` for Jinja2 tokens, allowing users to fully customize the appearance of Jinja2 syntax elements in their VS Code settings.
  - This feature enhances readability and user experience by providing visual distinction for Jinja2 syntax.
- **Theme Selection**:
  - Added new theme options for `jinja2-html-enhancer.darkDefault`, `jinja2-html-enhancer.lightDefault`, `jinja2-html-enhancer.darkHighContrast`, and `jinja2-html-enhancer.lightHighContrast` to the theme selection menu.
  - Users can now easily switch between these themes to suit their preferences and improve their coding environment.
- **Xuby Selection Theme**:
  - Introduced a new theme option `jinja2-html-enhancer.xubySelection` to the theme selection menu, providing users with a unique color scheme specifically designed for Jinja2 templates.

### 🔧 Changed v1.10.0

- **Theme Management**:
  - Refactored theme management to support the new token color customizations and theme selection options.
  - Updated the `themeChoose.ts` file to include the new themes and ensure they are correctly registered in the VS Code settings.
- **Code Structure**:
  - Improved the organization of theme-related code, making it easier to maintain and extend in the future.
  - Updated import paths and module structures to align with the new theme management system.
- **Updated node package versions**:
  - Updated dependencies in `package.json` and `package-lock.json` to ensure compatibility with the latest VS Code API and improve overall performance.
- **Documentation**:
  - Updated the `CHANGELOG.md` to reflect the new features and changes in this release.
  - Updated the README to include instructions on how to use the new token color customizations and theme selection features.

## [1.9.0] - 2025-07-20 Pre-release

### ✨ Added v1.9.0

- **Token Color Customizations**:
  - Introduced support for the standard `editor.tokenColorCustomizations` configuration, allowing users to customize the colors of Jinja2 tokens directly through their VS Code settings, without needing to create or switch themes.
    - This feature improves the visual distinction of Jinja2 syntax elements, enhancing readability and user experience.
- **Theme Selection**:
  - Added theme options for `jinja2-html-enhancer.darkDefault`, `jinja2-html-enhancer.lightDefault`, `jinja2-html-enhancer.darkHighContrast`, and `jinja2-html-enhancer.lightHighContrast` to the theme selection menu.
  - Users can now easily switch between these themes to suit their preferences and improve their coding environment.
- **Xuby Selection Theme**:
  - Added a new theme option `jinja2-html-enhancer.xubySelection` to the theme selection menu, providing users with a unique color scheme specifically designed for Jinja2 templates.

### 🔧 Changed v1.9.0

- **Theme Management**:
  - Refactored theme management to support the new token color customizations and theme selection options.
  - Updated the `themeChoose.ts` file to include the new themes and ensure they are correctly registered in the VS Code settings.

- **Code Structure**:
  - Improved the organization of theme-related code, making it easier to maintain and extend in the future.
  - Updated import paths and module structures to align with the new theme management system.

- **Updated node package versions**:
  - Updated dependencies in `package.json` and `package-lock.json` to ensure compatibility with the latest VS Code API and improve overall performance.
- **Documentation**:
  - Updated the `CHANGELOG.md` to reflect the new features and changes in this release.
  - Updated the README to include instructions on how to use the new token color customizations and theme selection features.

## [1.9.0] - 2025-07-20 Pre-release

### ✨ Added v1.9.0

- **Token Color Customizations**:
  - Introduced support for the standard `editor.tokenColorCustomizations` configuration, allowing users to customize the colors of Jinja2 tokens directly through their VS Code settings, without needing to create or switch themes.
    - This feature improves the visual distinction of Jinja2 syntax elements, enhancing readability and user experience.
- **Theme Selection**:
  - Added theme options for `jinja2-html-enhancer.darkDefault`, `jinja2-html-enhancer.lightDefault`, `jinja2-html-enhancer.darkHighContrast`, and `jinja2-html-enhancer.lightHighContrast` to the theme selection menu.
  - Users can now easily switch between these themes to suit their preferences and improve their coding environment.
- **Xuby Selection Theme**:
  - Added a new theme option `jinja2-html-enhancer.xubySelection` to the theme selection menu, providing users with a unique color scheme specifically designed for Jinja2 templates.

### 🔧 Changed v1.9.0

- **Theme Management**:
  - Refactored theme management to support the new token color customizations and theme selection options.
  - Updated the `themeChoose.ts` file to include the new themes and ensure they are correctly registered in the VS Code settings.

- **Code Structure**:
  - Improved the organization of theme-related code, making it easier to maintain and extend in the future.
  - Updated import paths and module structures to align with the new theme management system.

- **Updated node package versions**:
  - Updated dependencies in `package.json` and `package-lock.json` to ensure compatibility with the latest VS Code API and improve overall performance.
- **Documentation**:
  - Updated the `CHANGELOG.md` to reflect the new features and changes in this release.
  - Updated the README to include instructions on how to use the new token color customizations and theme selection features.

## [1.8.3] - 2025-07-18

### ✨ Added v1.8.3

- **Token Color Customizations** (work in progress):
  - Introducing a new configuration option `jinja2-html-enhancer.tokenColorCustomizations` to allow users to customize the colors of Jinja2 tokens in their templates.
  - This feature will enhance the visual distinction of Jinja2 syntax elements, improving readability and user experience.

## [1.8.2] - 2025-07-17

### 🐛 Fixed v1.8.2

- Update CHANGELOG.md to fix the version number.
- Fix footer copyright.

## [1.6.1] - 2025-01-14

### 🐛 Fixed v1.6.1

- Update CHANGELOG.md to fix the version number.

## [1.6.0 - Pre-release] - 2025-01-13

### ✨ Added v1.6.0

- **VariablePanel Component**:
  - Introduced a dedicated component to display Jinja2 variables, improving usability and clarity.
- **Tailwind CSS Integration**:
  - Added Tailwind CSS to enhance and modernize the UI styling of the extension.
- **Jest Setup**:
  - Added `jest.setup.js` and `jest.config.js` to establish a robust testing framework for the project.
- **Babel Configuration**:
  - Included `.babelrc` to support advanced JavaScript features.
- **Build Validation**:
  - Added `validate-build.js` to ensure build integrity.

### 🔧 Changed v1.6.0

- **Project Structure**:
  - Renamed `LICENSE.md` to `LICENSE.txt` for consistency.
  - Updated `.gitignore` to exclude `.DS_Store` files.
  - Refactored `quickFixProvider.ts` and `commandManager.ts` with updated import paths.
  - Renamed release workflow files for clarity.
- **TypeScript Configuration**:
  - Updated `tsconfig.json` to improve development efficiency.
- **ESLint Configuration**:
  - Enhanced ESLint rules for better TypeScript support.

### 🐛 Fixed v1.6.0

- **Code Formatting**:
  - Corrected formatting issues in `variables.ts` and `extension.ts`.

### 📄 Additional Changes

- Added `FUNDING.yml` to provide sponsorship details and invite community contributions.

## [1.4.0] - 2025-01-03

### ✨ Added v1.4.0

- Added a new command "Toggle check jinja2 variable check" to toggle the variable checking feature on and off.
  - Useful for debugging or when you want to temporarily disable variable checking.
  - You can configure it using the `Toggle check jinja2 variable check` configuration.

## [1.2.9] - 2025-01-03

### 🐛 Fixed v1.2.9

- Fixed a bug that causes the extension not validating the variables in the configuration file.

### ✨ Added v1.2.9

- Added a feature to check the variables when a variable is saved in the configuration file.
  - This feature is useful for large files with many variables, and it works with the quick fix vscode feature.

## [1.2.8] - 2025-01-03

### 🐛 Fixed v1.2.8

- Fixed a bug that caused the extension not to save the variables in the configuration file.

## [1.2.7] - 2025-01-01

- Work in progress: Fixed a bug that caused the extension not to save the variables in the configuration file.
- Get back original extension identifier.

## [1.2.6] - 2025-01-01

### 🐛 Fixed v1.2.6

- Work in progress: Fixed a bug that caused the extension not to save the variables in the configuration file.
- Change extension name to Jinja2 Enhancer.

## [1.2.2] - 2024-12-31

### 🐛 Fixed v1.2.2

- Fixed a bug that caused the extension not to save the variables in the configuration file.
- Fixed a bug that caused the extension not considering the variables saved in the configuration file.

## [1.2.1] - 2024-12-30

### 🐛 Fixed v1.2.1

- Fixed a bug that caused the extension not to save the variables in the configuration file.

## [1.2.0] - 2024-12-30

### ✨ Added v1.2.0

- Added a new command saveVariable to save a variable in the vscode workspace.
  - The variable is saved in the vscode workspace to not show the warning of the variable not being set.

## [1.1.4] - 2024-12-16

### 🐛 Fixed v1.1.4

- Implementation of esbuild to build the extension.

## [1.1.3] - 2024-12-16

### 🐛 Fixed v1.1.3

- Fix bug that caused command "Check Jinja2 Variables" and "Open Variable Panel" to not work properly.

## [1.1.2] - 2024-12-16

### 🐛 Fixed v1.1.2

- Hotfix: Fixed a bug that caused the extension to not work properly with some Jinja2 templates.

## [1.1.1]

## 🐛 Fixed v1.1.1

- Fix bug at translations imports.

## [1.1.0] - 2024-12-16

### ✨ Added v1.1.0

- Added a new command "Open Variable Panel" to open the new variable panel.
  - The variable panel displays a tree view of all variables used and set in the current Jinja2 template.
- Added Internationalization (i18n) support for the extension. Currently, English and Spanish are supported.

## [1.0.2] - 2024-12-11

### 🐛 Fixed v1.0.2

- Fixed readme, remove .jinja2.html file extension.

## [1.0.1] - 2024-12-10

### 🐛 Fixed v1.0.1

- Fixed logo rendering issue in package.json.

## [1.0.0] - 2024-12-10

### ✨ Added v1.0.0

- Variable checking functionality:
  - Analyzes Jinja2 templates to identify used and set variables.
  - Provides warnings for variables that are used but not set within the template.
  - Recognizes variables set in various contexts, including `{% set %}` statements and `{% for %}` loops.
  - Automatically checks variables on file save.
- New command "Check Jinja2 Variables" to manually trigger variable checking.
- Improved syntax highlighting:
  - Enhanced color highlighting for Jinja2 reserved keywords like `for`, `if`, `block`, etc.
  - Refined color highlighting for Jinja2 pipe filters like `capitalize`, `default`, `length`, `upper`, etc.

### 🔧 Changed

- Refactored codebase for better modularity and maintainability.
- Updated README with new feature descriptions and usage instructions.

### 🐛 Fixed v1.0.0

- Various minor bugs and improvements in syntax highlighting.
- Now will support .html files instead of just .jinja2.html files.

## [0.1.3] - 2024-09-28

- Issue:
  - Fix donation link in README.md.

## [0.1.2] - 2024-09-28

- Feature:
  - Add donation link to README.md.
  - Add marketplace link to README.md.

## [0.1.1] - 2024-09-24

- Issues:
  - Fixed image rendering issue in README.md.
  - Add logo to package.json.

## [0.1.0] - 2024-09-25

- Initial release:
  - Added basic syntax highlighting for Jinja2 blocks within `.jinja2.html` files.
  - HTML syntax is maintained alongside Jinja2.
  - Fix donation link in README.md.
