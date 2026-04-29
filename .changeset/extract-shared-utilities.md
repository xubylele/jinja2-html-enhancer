---
"jinja2-html-enhancer": patch
---

Extract pure utilities into a shared package and isolate VS Code-dependent config helpers

Internal refactor with no user-visible behavior change. Resolves the architecture tech-debt items flagged in `docs/architecture.md` (mixed concerns in `src/utils/variables.ts` and pure-but-misplaced regex helpers).

- The pure variable analyzer (`extractVariables`, `analyzeNestedStructures`) and diagnostic-message helper (`extractVariableName`) now live in the external `jinja2-enhanced-shared` package, consumed via git URL pinned to `v0.1.0`. The same package will be reused by the upcoming Pro extension to avoid duplication.
- The VS Code-dependent `getConfiguration` and `getVscodeConfigTarget` helpers move to a new `src/config/configService.ts` layer.
- `src/utils/variables.ts` and `src/diagnostics/variableAnalyzer.ts` are deleted; their tests move alongside the new locations.
- Imports updated in `quickFixProvider`, `commandManager`, `fileWatcher`, and the `fileWatcher` test mock.
