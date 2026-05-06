# 🗺️ Jinja2 Enhance — Roadmap

> This document describes what the free extension does today. Feature suggestions are always welcome — [open an issue on GitHub](https://github.com/xubylele/jinja2-html-enhancer/issues).
> 🔒 **Where the code lives.** This repository ships the **free** extension and is MIT-licensed. **Pro** and **Team** features are implemented in a separate, **private** repository (`jinja2-html-enhancer-pro`) and distributed only via the paid Marketplace listing. The shared analyzer package (`jinja2-enhanced-shared`) consumed by both extensions also lives in its own private repository, distributed over git+ssh by tag.

Status legend: ✅ Shipped · 🚧 In progress · ❌ Planned

---

## ✅ Free Feature Status

| Feature | Status |
| --- | --- |
| **Syntax Highlighting** — `{% %}` tags (`for`, `if`, `block`, `extends`, `include`, `set`, `macro`, …), `{{ }}` variables, pipe filters; works inside `<style>` and `<script>` blocks | ✅ Shipped |
| **`{# #}` Comment Toggling** — `Ctrl+/` / `Cmd+/` inserts the correct Jinja2 comment syntax | ✅ Shipped |
| **Themes** — 5 built-in color themes (Dark Default, Light Default, Dark High Contrast, Light High Contrast, Xuby Selection) + full `editor.tokenColorCustomizations` control | ✅ Shipped |
| **Variable Checking** — detects every `{{ }}` variable, understands `{% set %}` / `{% for %}` definitions, warns on undefined uses, runs on save or on demand | ✅ Shipped |
| **Quick Fix** — save an undefined variable to your config in one click | ✅ Shipped |
| **Custom Variable Allowlist** — silence false positives for backend-injected variables (per-workspace toggle) | ✅ Shipped |
| **Variable Panel** — sidebar webview listing every used and set variable in the current template | ✅ Shipped |
| **File Icons** — `.jinja2`, `.j2`, and `.jinja` files get a Jinja2 icon in the file explorer | ✅ Shipped |
| **Localization** — English and Spanish | ✅ Shipped |
| **Code Snippets** — 10 built-in snippets (`for`, `if`, `ife`, `block`, `extends`, `include`, `set`, `macro`, `with`, `filter`) | ✅ Shipped |

> All free features above are implemented and shipping in the current Marketplace release.

---

## ✅ Free Feature Status (Updated)

| Feature | Status |
| --- | --- |
| **Template Preview (Basic)** — Render Jinja2 templates with manual/static context input, highlight missing variables with styled `<span>` placeholders | ✅ Shipped |

---

> 💬 **Have a feature idea?** Open an issue at [github.com/xubylele/jinja2-html-enhancer](https://github.com/xubylele/jinja2-html-enhancer/issues) — community feedback shapes what gets built next.
>
> ⚡ **Looking for backend intelligence, cross-file tracking, macro IntelliSense, advanced linting, type hints, filter hover docs, or full-featured Template Preview?** Those live in **Jinja2 Enhance Pro** — see the Pro Marketplace listing.
> 💬 **Have a feature idea?** Open an issue at [github.com/xubylele/jinja2-html-enhancer](https://github.com/xubylele/jinja2-html-enhancer/issues) — community feedback shapes what gets built next.
>
> ⚡ **Looking for backend intelligence, cross-file tracking, macro IntelliSense, advanced linting, type hints, or filter hover docs?** Those live in **Jinja2 Enhance Pro** — see the Pro Marketplace listing.
