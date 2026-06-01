---
"jinja2-html-enhancer": minor
---

New: advanced linting rules. Flags unused `{% set %}` variables (JHE1200), variables set inside a block but used outside its scope (JHE1201), excessive template nesting depth (JHE1202), incorrect macro argument counts (JHE1203), and block definitions never overridden by child templates (JHE1204). Nesting threshold configurable via `jinja2-html-enhancer.nestingDepthThreshold`.
