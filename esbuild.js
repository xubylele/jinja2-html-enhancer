const esbuild = require('esbuild');
const fs = require('fs');

const args = process.argv.slice(2);
const watch = args.includes('--watch');
const production = args.includes('--production');

const outputDir = 'out';
const validateFiles = [
  `${outputDir}/extension.js`,
  `${outputDir}/App.js`,
  `${outputDir}/css/output.css`,
];

const extensionConfig = {
  entryPoints: ['./src/extension.ts'],
  bundle: true,
  outfile: `${outputDir}/extension.js`,
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  sourcemap: !production,
  minify: production,
  loader: {
    '.ts': 'ts',
  },
};

const webviewConfig = {
  entryPoints: ['./src/ui/App.tsx'],
  bundle: true,
  outfile: `${outputDir}/App.js`,
  format: 'esm',
  platform: 'browser',
  sourcemap: !production,
  minify: production,
  loader: {
    '.tsx': 'tsx',
    '.ts': 'ts',
  },
};

async function validateBuild() {
  let allValid = true;
  validateFiles.forEach((file) => {
    if (!fs.existsSync(file)) {
      console.error(`Error: Required file ${file} is missing.`);
      allValid = false;
    }
  });

  if (!allValid) {
    process.exit(1);
  }
}

async function build() {
  try {
    console.log(`Building with esbuild (production: ${production}, watch: ${watch})`);

    if (watch) {
      console.log('Watching for changes...');
      const extensionContext = await esbuild.context(extensionConfig);
      const webviewContext = await esbuild.context(webviewConfig);
      await Promise.all([extensionContext.watch(), webviewContext.watch()]);
    } else {
      await Promise.all([esbuild.build(extensionConfig), esbuild.build(webviewConfig)]);
      console.log('Build completed. Validating files...');
      await validateBuild();
      console.log('All required files are present.');
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();