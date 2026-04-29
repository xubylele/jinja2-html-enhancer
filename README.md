# Jinja2 Enhance

**Jinja2 Enhance** is a Visual Studio Code extension that adds syntax highlighting support for the Jinja2 templating language inside `.html` files and provides variable checking functionality. It extends the native HTML highlighting with additional rules for Jinja2, allowing seamless editing of templates that mix both HTML and Jinja2.

## Donations

If you find this extension helpful, consider supporting the developer by buying them a coffee:

<a href="https://www.buymeacoffee.com/xubylelec" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-blue.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

## **Code Snippets Just Landed!**

Type `for`, `if`, `block`, `extends`, `include`, `set`, `macro`, `with`, or `filter` in any `.html` file and get a ready-to-use Jinja2 snippet with placeholder tabstops. Press `Tab` to jump between fields.

## Features

- **Jinja2 Enhance**:
  - Supports Jinja2 control structures like `{% for %}`, `{% if %}`, `{% block %}`, etc.
  - Highlights variable interpolation using `{{ }}` syntax.
  - Keywords like `for`, `if`, `block` are highlighted with a distinct color for better readability.
  - Pipe filters like `capitalize`, `default`, `length`, `lower`, etc., are highlighted after the pipe (`|`).

- **HTML and Jinja2 Together**:
  - Maintains the standard HTML syntax highlighting while injecting Jinja2 rules.
  - Useful for projects that use Jinja2 templating language for dynamic content within HTML.

- **Variable Checking**:
  - Analyzes Jinja2 templates to identify used and set variables.
  - Provides warnings for variables that are used but not set within the template.
  - Recognizes variables set in various contexts, including `{% set %}` statements and `{% for %}` loops.
  - Automatically checks variables on file save and provides a command to manually trigger checking.

- **UI Variable Panel**:
  - Displays a panel in the sidebar that shows the variables used and set in the current template.
  - Update the panel by saving the file or manually triggering variable checking.

- **Save variables in configuration**:
  - Save the variables in the configuration file to avoid rechecking the variables every time you open the file.
  - This feature is useful for large files with many variables, and it works with the quick fix vscode feature.

- **Toggle Variable Checking**:
  - Allows you to toggle the variable checking feature on and off.
  - Useful for debugging or when you want to temporarily disable variable checking.
  - Use command "Toggle check jinja2 variable check" to toggle the feature.
  - Use configuration `Toggle check jinja2 variable check` to set the variable checking feature.

- **Jinja2 Comment Toggling**:
  - Press `Ctrl+/` (`Cmd+/` on macOS) to toggle Jinja2-style comments `{# #}` on the current line or selected lines.
  - Automatically detects whether a line is already commented and toggles accordingly.
  - Works with single lines and multi-line selections — all selected lines are commented or uncommented together.
  - Preserves indentation when adding or removing comment markers.

- **Theme Support**:
  - Choose from multiple themes for Jinja2 syntax highlighting.
  - You can select a theme using the command "Choose Jinja2 Theme" from the command palette (`Ctrl+Shift+P`).
  - Themes include:
    - Dark Default
    - Light Default
    - Dark High Contrast
    - Light High Contrast
    - Xuby Selection (custom theme)
  - Also you can change the theme colors on your settings:
  - Enter `"editor.tokenColorCustomizations": { "textMateRules": [] }` in your settings.json file.

## Example

Here's an example of the syntax highlighting in action:

![Syntax Highlight Example](https://i.imgur.com/pWahcjc.png)

And here's an example of the variable checking and UI variable panel:

![Variable Checking Example](https://i.imgur.com/qk46DYx.png)

And here's an example of the variable saving in the configuration file:

![Variable Saving Example](https://i.imgur.com/7ojKh5D.gif)

## Theme Selection

You can choose from multiple themes for Jinja2 syntax highlighting. To select a theme, use the command "Choose Jinja2 Theme" from the command palette (`Ctrl+Shift+P`). The available themes are:

Dark Default theme, which provides a dark background with contrasting colors for Jinja2 syntax.
![Dark Default Theme Example](https://i.imgur.com/1wueoPs.png)

Light Default theme, which provides a light background with contrasting colors for Jinja2 syntax.
![Light Default Theme Example](https://i.imgur.com/DOOWGA4.png)

Dark High Contrast theme, which provides a high contrast dark background for better visibility.
![Dark High Contrast Theme Example](https://i.imgur.com/iNGNdrC.png)

Light High Contrast theme, which provides a high contrast light background for better visibility.
![Light High Contrast Theme Example](https://i.imgur.com/BqRi5yp.png)

Xuby Selection theme, which is a custom theme with unique colors for Jinja2 syntax.
![Xuby Selection Theme Example](https://i.imgur.com/gj7j9yQ.png)

## Installation

1. Open Visual Studio Code.
2. Go to the Extensions view by clicking on the Extensions icon in the Activity Bar on the side of the window or press `Ctrl+Shift+X`.
3. Search for `Jinja2 Enhance`.
4. Click **Install**.

Alternatively, you can install the extension from the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=Xubylele.jinja2-html-enhancer) or the [Open VSX Registry](https://open-vsx.org/extension/xubylele/jinja2-html-enhancer).

[![VS Marketplace](https://img.shields.io/visual-studio-marketplace/v/Xubylele.jinja2-html-enhancer)](https://marketplace.visualstudio.com/items?itemName=Xubylele.jinja2-html-enhancer) [![Open VSX](https://img.shields.io/open-vsx/v/xubylele/jinja2-html-enhancer)](https://open-vsx.org/extension/xubylele/jinja2-html-enhancer)

## Usage

1. Open a file with the `.html` extension.
2. The extension will automatically apply syntax highlighting to both HTML and Jinja2 templating language.
3. Variable checking will occur automatically when you save the file.
4. To manually check variables, use the command "Check Jinja2 Variables" from the command palette (`Ctrl+Shift+P`).
5. The UI variable panel will display the variables, use the command "Open jinja2 Variable Panel" to open it.
6. Warnings for undefined variables will appear as diagnostics in your editor.

## Supported Jinja2 Syntax

- `{% for %}`, `{% if %}`, `{% block %}`, and other control structures.
- `{{ variable }}` for variable interpolation.
- `{% extends %}`, `{% include %}`, `{% set %}`, `{% import %}`, `{% macro %}`, and more.
- Pipe filters like `| capitalize`, `| default`, `| length`, `| lower`, `| upper`, etc.

## Customization

You can customize the colors used for Jinja2 syntax highlighting by modifying your VSCode theme settings. For example, to change the color of keywords and filters, you can add the following to your settings:

## Roadmap

Curious about what's coming next? Check out the [**Roadmap**](ROADMAP.md) for the full list of planned features — including upcoming free improvements, and what's on the horizon for Pro and Team tiers.

## Contributing

If you want to contribute to this project, feel free to submit issues or pull requests in the [GitHub repository](https://github.com/xubylele/jinja2-html-enhancer?tab=readme-ov-file)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details.
