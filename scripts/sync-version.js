const { readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');

// File paths
const paths = {
  package: resolve('package.json'),
  appVersion: resolve('src/version.ts'),
  clientVersion: resolve('client/src/version.ts')
};

// 1. Read the new version from package.json (already updated by npm version)
const pkg = JSON.parse(readFileSync(paths.package, 'utf-8'));
const newVersion = pkg.version;

console.log(`🔄 Syncing version to ${newVersion}...`);

// 2. Update src/version.ts
const versionContent = `export const APP_VERSION = "${newVersion}";\n`;
writeFileSync(paths.appVersion, versionContent);
console.log('✅ Updated src/version.ts');

writeFileSync(paths.clientVersion, versionContent);
console.log('✅ Updated client/src/version.ts');
