---
"jinja2-html-enhancer": patch
---

Migrated from npm to pnpm@11.0.8 for improved supply-chain security. The [TanStack npm supply-chain compromise](https://tanstack.com/blog/npm-supply-chain-compromise-postmortem) (May 2026) demonstrated how npm's dependency-resolution model allows malicious lifecycle scripts during install to harvest credentials and self-propagate. pnpm's content-addressable store and build-scripts-blocked-by-default (`ERR_PNPM_IGNORED_BUILDS`) mitigate this attack class. A side-effect: pnpm is not natively supported by `@vscode/vsce`, so packaging/publishing now uses `--no-dependencies` (both extensions already bundle with esbuild, so no `node_modules` are needed in the `.vsix`). CI workflows updated: `actions/setup-node` caching switched to `cache: pnpm`, and `pnpm/action-setup@v5` added before it.
