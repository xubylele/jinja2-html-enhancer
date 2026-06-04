---
"jinja2-html-enhancer": minor
---

New: variable type hints on hover. Hover over any template variable to see its inferred type — backend-declared types from Python (str, int, bool, list, dict) or TypeScript annotations, types inferred from template usage patterns (member access like `user.name` infers object), and inherited variables from parent templates. Object types list their known fields inline.
