---
"jinja2-html-enhancer": minor
---

New: hover and quick-fix for variables inherited via `{% extends %}`. Hover over any variable inherited from a parent template to see its origin file and line. A "Go to inherited definition" quick-fix appears on `JHE0001` diagnostics when the variable can be traced back to a parent. Imported macros and namespaces from `{% import %}` and `{% from … import … %}` are also resolved.
