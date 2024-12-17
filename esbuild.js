/* eslint-env node */
const esbuild = require('esbuild');

const args = process.argv.slice(2);
const watch = args.includes('--watch');
const production = args.includes('--production');

const config = {
  entryPoints: ['./src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  sourcemap: !production,
  minify: production
};

async function build() {
  if (watch) {
    const context = await esbuild.context(config);
    await context.watch();
  } else {
    await esbuild.build(config);
  }
}

build().catch(() => process.exit(1));