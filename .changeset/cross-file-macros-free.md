---
"jinja2-html-enhancer": minor
---

New: cross-file macro autocomplete and signature help. Macros inherited via `{% extends %}` and imported via `{% import %}` or `{% from … import … %}` now appear in autocomplete with snippet insertion. Namespace completions work too — type `forms.` to see all macros from `{% import "macros.html" as forms %}`. Signature help (parameter hints) resolves both inherited and namespaced macros.
