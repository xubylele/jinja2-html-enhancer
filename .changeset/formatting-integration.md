---
"jinja2-html-enhancer": minor
---

New: Jinja2-aware formatting via `prettier-plugin-jinja-template` integration. The extension auto-detects the plugin in your project and delegates formatting to it — best-in-class Jinja2+HTML formatting with zero custom parser maintenance. If the plugin isn't found, the extension offers to install it automatically.

- Works for `.html`, `.jinja2`, `.j2`, and `.jinja` files
- Format on save via `jinja2-html-enhancer.formatting.formatOnSave` (enabled by default, but skips if VS Code's global `editor.formatOnSave` is already active)
- Master toggle: `jinja2-html-enhancer.formatting.enabled`
- Manual formatting via VS Code's format command (`Shift+Alt+F` / `Shift+Option+F`)
