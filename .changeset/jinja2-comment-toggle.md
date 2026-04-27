---
"jinja2-html-enhancer": minor
---

Add Jinja2 comment toggling via `Ctrl+/` (`Cmd+/` on macOS)

Pressing the comment shortcut in any `.html` file now inserts `{# #}` instead of `<!-- -->`, matching the correct Jinja2 comment syntax. The command supports:

- Single-line toggling at the cursor position
- Multi-line toggling across a selection (all lines commented or uncommented together based on current state)
- Indentation preservation when adding or removing comment markers
- Skipping empty lines within a multi-line selection

The command is also available via the command palette as "Toggle Jinja2 Comment".
