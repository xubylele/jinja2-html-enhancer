---
"jinja2-html-enhancer": minor
---

New: template preview now automatically injects backend-detected variables as context defaults. When your Flask, Django, FastAPI, Express, or Nunjucks backend files reference a template, the variables they pass are pre-populated in the preview context — no manual setup needed. Profile-defined values still override these defaults.
