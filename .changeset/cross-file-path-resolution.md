---
"jinja2-html-enhancer": minor
---

New: cmd+click / F12 on a template path inside `{% extends %}`, `{% include %}`, `{% import %}`, or `{% from %}` now jumps to the referenced file. Unresolvable template paths and circular `{% extends %}` chains are flagged inline. A new `jinja2-html-enhancer.templateRoots` setting lets you point resolution at directories outside the auto-discovered `templates/` folders.
