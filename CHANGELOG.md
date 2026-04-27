# Change Log

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
