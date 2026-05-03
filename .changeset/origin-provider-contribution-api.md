---
"jinja2-html-enhancer": minor
---

✨ Variable Panel: Origin column + contribution API for sister extensions

The Variable Panel now has room for a third **Origin** column that explains *where each variable comes from* — local, inherited from a parent template, imported, or passed by the backend. The column only appears when origin metadata is available; existing free-only installs see no UI change.

- **New Status: Inherited.** Variables that aren't declared locally but are recognized by an origin provider now render as **Inherited** (blue) instead of **Undefined** (red). The third state makes it instantly obvious which "missing" names are actually fine.
- **Public contribution API.** Sister extensions (e.g. Jinja2 Enhance Pro) can call two new VS Code commands to inject origin metadata into the panel:
  - `jinja2-html-enhancer.registerOriginProvider({ id, provider })`
  - `jinja2-html-enhancer.unregisterOriginProvider({ id })`

  The provider callback receives `{ uri, names }` and returns `Record<string, { label, uri?, line? }>`. Async providers are supported. Provider exceptions are isolated — a buggy sister extension can't break the panel. Type contracts live in `src/types/originProvider.ts`.
- **Cleanup.** Removed the dead `src/intelligence/` directory called out in `docs/architecture.md`.
