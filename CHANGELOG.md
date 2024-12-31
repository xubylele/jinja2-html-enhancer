# Change Log

All notable changes to the "jinja2-html-enhancer" extension will be documented in this file.

## [1.2.0] - 2024-12-16

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
