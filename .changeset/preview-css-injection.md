---
"jinja2-html-enhancer": minor
---

New: CSS-aware template preview — the preview panel now auto-detects and applies CSS from your project. Flask static files (`url_for('static', ...)`), hardcoded `/static/` paths, CDN stylesheets (Bootstrap, Tailwind CDN, etc.), and inline `<style>` blocks are detected across the template and all its `{% extends %}` ancestors and applied in the preview. When no CSS is found, a structural fallback stylesheet makes semantic elements (`<header>`, `<section>`, `<nav>`, `<aside>`, `<article>`, `<footer>`) visually distinct.
