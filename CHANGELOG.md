# Change Log

All notable changes to the "jinja2-html-enhancer" extension will be documented in this file.

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
