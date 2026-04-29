# 🗺️ Jinja2 Enhance — Roadmap

> This document describes what the extension does today, what's coming next for free, and what's planned for paid tiers. Feature suggestions are always welcome — [open an issue on GitHub](https://github.com/xubylele/jinja2-html-enhancer/issues).

---

## ✅ What's Available Today (Free)

Everything below is free and ships with the extension right now.

### 🎨 Syntax Highlighting

- Full highlighting for `{% %}` tags — `for`, `if`, `block`, `extends`, `include`, `set`, `macro`, and more
- Variable highlighting inside `{{ }}` expressions
- Pipe filter highlighting — `| capitalize`, `| length`, `| lower`, etc.
- Works inside `<style>` and `<script>` blocks, not just HTML content
- **`{# #}` comment toggling** — Jinja2 uses `{# #}` for comments, not `<!-- -->`. Pressing the comment shortcut (`Ctrl+/`) or (`Cmd+/`) will insert the correct syntax

### 🎭 Themes

- 5 built-in color themes: **Dark Default**, **Light Default**, **Dark High Contrast**, **Light High Contrast**, and **Xuby Selection**
- Full control over token colors via VS Code's `editor.tokenColorCustomizations` setting

### 🔍 Variable Checking

- Automatically detects every variable you use in `{{ }}` expressions
- Understands variables defined with `{% set %}` and `{% for %}` loops
- Warns you when a variable is used but never defined in the template
- Runs automatically every time you save, or manually on demand
- **Quick fix**: click the warning and save the variable to your config in one action
- Custom variable list in settings — add variables injected by your backend to silence false positives
- Toggle variable checking on/off per workspace

### 🖥️ Variable Panel

- Sidebar panel that shows all used and set variables in the current template at a glance

### 📁 File Icons

- `.jinja2`, `.j2`, and `.jinja` files display a proper Jinja2 icon in the VS Code file explorer

### 🌍 Localization

- Interface available in **English** and **Spanish**

---

### ⌨️ Code Snippets

- 10 built-in snippets for Jinja2 control structures — type `for`, `if`, `ife`, `block`, `extends`, `include`, `set`, `macro`, `with`, or `filter` and press `Tab` to expand

---

## ⚡ Pro — $5/month

For developers building real Jinja2 projects with Flask, Django, FastAPI, or Node.js.

### 🧠 Backend Intelligence

Stop getting false "undefined variable" warnings for variables your backend passes to the template. The extension reads your Python, JavaScript, or TypeScript files and automatically learns which variables each template receives.

Works with the most popular frameworks out of the box:

| Framework | Example it understands |
| --- | --- |
| Flask | `render_template('page.html', user=user, items=items)` |
| Django | `render(request, 'page.html', {'user': user})` |
| FastAPI / Starlette | `TemplateResponse('page.html', {'user': user})` |
| Jinja2 standalone | `template.render(user=user)` |
| Express / Node.js | `res.render('page.html', { user, items })` |
| Nunjucks | `env.render('page.html', { user, items })` |

Your backend files are watched live — change a render call and the template diagnostics update automatically.

---

### 🔗 Cross-File Variable Tracking

The current variable checker only looks at one file at a time. With this feature, it follows your full template hierarchy — `{% extends %}`, `{% include %}`, and `{% import %}` — and understands which variables flow down from parent templates so child templates don't get false warnings.

---

### 💡 Macro IntelliSense

When you define a macro like `{% macro card(title, body, footer="") %}`, calling it anywhere in your project will show:

- The parameter names and their defaults
- Which file the macro lives in
- Autocomplete for argument names

---

### 📏 Advanced Linting Rules

Extra rules you can turn on individually:

- Warn when a variable used inside a `{% block %}` override is undefined in that scope
- Warn when a `{% block %}` is defined in a parent but never overridden by any child
- Warn when a macro is called with too few or too many arguments
- Warn on `{% set %}` variables that are defined but never used
- Configurable nesting depth limit for `{% if %}` and `{% for %}` blocks

---

### 🏷️ Variable Type Hints

Add type information to your variables in the extension settings:

```json
"jinja2-html-enhancer.customVariables": {
  "user": { "type": "object", "fields": ["name", "email", "role"] },
  "items": { "type": "list" }
}
```

Hovering over `{{ user.name }}` will show its type. Accessing `{{ user.unknown_field }}` will raise a warning.

---

### 📖 Filter Docs on Hover

Hover over any Jinja2 filter and see what it does, what it expects as input, what it returns, and a quick example — without leaving the editor.

---

## 👥 Team — $12/month

For teams working on shared Jinja2 codebases. Everything in Pro, plus:

### 📋 Shared Variable Registry

Commit a `.jinja2enhance.json` file to your repo. Every teammate gets the same variable definitions, type hints, and descriptions automatically — no one has to set up their own config.

```json
{
  "variables": {
    "current_user": {
      "type": "object",
      "description": "Injected by Flask login_required decorator",
      "owner": "auth-team"
    }
  }
}
```

---

### 📝 Variable Documentation

Add a description to any variable in the shared registry. When a teammate hovers over `{{ current_user }}` in any template, they see what it is, its type, and where it comes from — no more digging through backend code to understand a template.

---

### 📊 Template Audit Reports

Run a single command to get a full report of your template project:

- Every template and what it depends on
- Every variable: whether it's defined, inherited, or missing
- Every macro: where it's defined and every place it's called
- Templates that no other template includes (potentially orphaned)

Great for onboarding new developers, refactoring, or reviewing a project before a release.

---

### 🏗️ Monorepo Support

Working in a repo with multiple Flask or Django apps sharing a templates folder? The extension keeps each app's template tree and variable registry separate so there's no cross-contamination between projects.

---

## 🚧 What We're Building Next

Here's the order features will be tackled, prioritized by daily impact vs. effort:

| # | Feature | Tier | Impact |
| --- | --- | --- | --- |
| 1 | `{# #}` comment toggling | Free | Used every day — wrong comment syntax is constantly annoying |
| 2 | Code snippets | Free | ✅ Shipped — speeds up writing boilerplate control structures |
| 3 | File icon support | Free | ✅ Shipped — `.jinja2`, `.j2`, `.jinja` files get a proper icon in the file explorer |
| 4 | Filter docs on hover | Pro | Easy win — filter list is finite and well-documented |
| 5 | Advanced linting rules | Pro | Builds on the existing warning system |
| 6 | Macro IntelliSense | Pro | The grammar already recognizes macros — completion is the next step |
| 7 | Backend intelligence | Pro | Fixes the most common false positive in real projects |
| 8 | Cross-file variable tracking | Pro | Biggest quality-of-life upgrade for multi-template projects |
| 9 | Shared variable registry | Team | Needs cross-file tracking to be reliable first |
| 10 | Variable type hints | Pro | Builds on the registry format established above |
| 11 | Template inheritance graph | Pro | Depends on the cross-file resolver — visually powerful |
| 12 | Template audit reports | Team | The final layer on top of everything else |

---

> 💬 **Have a feature idea?** Open an issue at [github.com/xubylele/jinja2-html-enhancer](https://github.com/xubylele/jinja2-html-enhancer/issues) — community feedback shapes what gets built next.
