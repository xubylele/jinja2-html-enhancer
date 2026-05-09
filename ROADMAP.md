# 🗺️ Jinja2 Enhance — Roadmap

> This document describes what the free extension does today and what's planned next. Feature suggestions are always welcome — [open an issue on GitHub](https://github.com/xubylele/jinja2-html-enhancer/issues).
> 🔒 **Where the code lives.** This repository ships the **free** extension and is MIT-licensed. **Pro** and **Team** features are implemented in a separate, **private** repository (`jinja2-html-enhancer-pro`) and distributed only via the paid Marketplace listing. The shared analyzer package (`jinja2-enhanced-shared`) consumed by both extensions also lives in its own private repository, distributed over git+ssh by tag.

Status legend: ✅ Shipped · 🚧 In progress · ❌ Planned

---

## ✅ Shipped — Free Today

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
| **Template Preview (Basic)** — render Jinja2 templates with manual/static context input, highlight missing variables with styled `<span>` placeholders | ✅ Shipped |
| **Filter Docs on Hover** — hover any built-in Jinja2 filter (`length`, `default`, `safe`, …) to see its signature, description, and a usage example. Localized in English and Spanish. | ✅ Shipped |
| **Macro IntelliSense (single-file)** — autocomplete and parameter hints for `{% macro %}` definitions in the current file, including snippet expansion of macro arguments. Cross-file macros stay Pro. | ✅ Shipped |

---

## ❌ Planned — Free Next 6 Months

The free extension stays **100% local** — no accounts, no backend, no telemetry. Features arrive through two paths: net-new local utilities, and selected Pro features that graduate to free after their exclusivity window.

| # | Feature | Source | Target | Status |
| --- | --- | --- | --- | --- |
| 1 | ~~**Filter Docs on Hover**~~ — shipped May 2026 (ahead of Jun 2026 target). See "Shipped — Free Today". | Migrated from Pro | May 2026 | ✅ Shipped |
| 2 | ~~**Macro IntelliSense (single-file)**~~ — shipped May 2026 (ahead of Jul 2026 target). See "Shipped — Free Today". | Migrated from Pro (subset) | May 2026 | ✅ Shipped |
| 3 | **Template Preview v2** — multiple named context profiles saved to workspace JSON, better placeholder rendering, mock data presets. | Net-new | Jul 2026 | ❌ Planned |
| 4 | **Jinja2-aware Formatter** — format on save with proper handling of `{% %}` / `{{ }}` inside HTML. No competing tool does this well. | Net-new | Aug 2026 | ❌ Planned |
| 5 | **Custom User Snippets UI** — manage `{% call %}`, `{% raw %}`, and user-defined snippets through a settings panel instead of `keybindings.json`. | Net-new | Aug 2026 | ❌ Planned |
| 6 | **Cross-File Resolution (basic)** — resolve `{% extends %}` / `{% include %}` paths and follow `cmd+click` to the file. Inherited variable resolution stays Pro. | Migrated from Pro (subset) | Sep 2026 | ❌ Planned |
| 7 | **Variable Type Hints (local-only)** — type hints inferred from local `{% set %}` / `{% for %}` patterns. Backend-aware and AI-inferred type hints stay Pro. | Migrated from Pro (subset) | Oct 2026 | ❌ Planned |
| 8 | **Advanced Linting (subset)** — block-scope vars, unused `{% set %}`, nesting depth. Team-wide / cloud lint rules stay Pro. | Migrated from Pro (subset) | Nov 2026 | ❌ Planned |
| 9 | **More Themes + i18n Expansion** — community themes, plus pt-br, fr, de, zh translations. | Net-new | Rolling | ❌ Planned |

### How free / Pro coexist

Free keeps getting better. Pro features that don't require a server graduate to free after a **~4-month exclusivity window** so the local experience for everyone improves quickly. Pro stays valuable because it adds **server-backed** capabilities — cloud variable registries, AI inference, team documentation, audit dashboards — that simply can't ship in a local-only MIT extension.

---

> 💬 **Have a feature idea?** Open an issue at [github.com/xubylele/jinja2-html-enhancer](https://github.com/xubylele/jinja2-html-enhancer/issues) — community feedback shapes what gets built next.
>
> ⚡ **Looking for backend intelligence, cross-file variable tracking, AI-inferred types, team variable registries, audit reports, or cloud-synced docs?** Those live in **Jinja2 Enhance Pro** — see the Pro Marketplace listing.
