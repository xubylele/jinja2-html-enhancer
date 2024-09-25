# Jinja2 HTML Enhancer

**Jinja2 HTML Enhancer** is a Visual Studio Code extension that adds syntax highlighting support for the Jinja2 templating language inside `.jinja2.html` files. It extends the native HTML highlighting with additional rules for Jinja2, allowing seamless editing of templates that mix both HTML and Jinja2.

## Features

- **Jinja2 Syntax Highlighting**:
  - Supports Jinja2 control structures like `{% for %}`, `{% if %}`, `{% block %}`, etc.
  - Highlights variable interpolation using `{{ }}` syntax.
  - Keywords like `for`, `if`, `block` are highlighted with a distinct color for better readability.
  - Pipe filters like `capitalize`, `default`, `length`, `lower`, etc., are highlighted after the pipe (`|`).

- **HTML and Jinja2 Together**:
  - Maintains the standard HTML syntax highlighting while injecting Jinja2 rules.
  - Useful for projects that use Jinja2 templating language for dynamic content within HTML.

## Installation

1. Open Visual Studio Code.
2. Go to the Extensions view by clicking on the Extensions icon in the Activity Bar on the side of the window or press `Ctrl+Shift+X`.
3. Search for `Jinja2 HTML Enhancer`.
4. Click **Install**.

Alternatively, you can install it via the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/).

## Usage

1. Open a file with the `.jinja2.html` extension.
2. The extension will automatically apply syntax highlighting to both HTML and Jinja2 templating language.
3. Enjoy a seamless coding experience with both HTML and Jinja2.

## Supported Jinja2 Syntax

- `{% for %}`, `{% if %}`, `{% block %}`, and other control structures.
- `{{ variable }}` for variable interpolation.
- `{% extends %}`, `{% include %}`, `{% set %}`, `{% import %}`, `{% macro %}`, and more.
- Pipe filters like `| capitalize`, `| default`, `| length`, `| lower`, `| upper`, etc.

## Customization

You can customize the colors used for Jinja2 syntax highlighting by modifying your VSCode theme settings. For example, to change the color of keywords and filters, you can add the following to your settings:

```json
{
  "editor.tokenColorCustomizations": {
    "textMateRules": [
      {
        "scope": "keyword.reserved.jinja2",
        "settings": {
          "foreground": "#FF5733",  // Color for reserved keywords like 'for', 'if', etc.
          "fontStyle": "bold"
        }
      },
      {
        "scope": "support.function.jinja2.filter",
        "settings": {
          "foreground": "#33C4FF"  // Color for pipe filters
        }
      }
    ]
  }
}
```

## Contributing

If you want to contribute to this project, feel free to submit issues or pull requests in the [GitHub repository]()