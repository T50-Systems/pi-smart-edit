import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { verifyRuntimeDependencies } from './verify-dependencies.mjs';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const changelog = await readFile(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
const packageLock = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url), 'utf8'));

assert.equal(packageLock.version, packageJson.version, 'package-lock.json version must match package.json');
assert.equal(
  packageLock.packages?.['']?.version,
  packageJson.version,
  'package-lock.json root package version must match package.json',
);
verifyRuntimeDependencies(packageJson, packageLock);

assert.match(changelog, /^## \[Unreleased\]$/m, 'CHANGELOG.md must contain an [Unreleased] section');
assert.match(
  changelog,
  new RegExp(`^## \\[${packageJson.version.replaceAll('.', '\\.')}\\] - \\d{4}-\\d{2}-\\d{2}$`, 'm'),
  `CHANGELOG.md must contain a dated ${packageJson.version} section`,
);

const npmCli = process.env.npm_execpath;
assert.ok(npmCli, 'Run release verification through npm run verify:release');
const packed = spawnSync(process.execPath, [npmCli, 'pack', '--dry-run', '--json'], {
  cwd: new URL('..', import.meta.url),
  encoding: 'utf8',
});
assert.equal(packed.status, 0, packed.error?.message ?? packed.stderr ?? 'npm pack --dry-run failed');
const report = JSON.parse(packed.stdout);
const files = new Set(report[0].files.map((entry) => entry.path));
for (const required of [
  'ARCHITECTURE.md',
  'CHANGELOG.md',
  'LICENSE',
  'README.md',
  'ROADMAP.md',
  'VISION.md',
  'docs/OPERATIONS.md',
  'docs/RELEASING.md',
  'examples/smart_edit-examples.md',
  'dist/src/cli.js',
  'dist/src/extension.js',
  'dist/src/index.js',
  'dist/src/index.d.ts',
]) {
  assert.ok(files.has(required), `release package is missing ${required}`);
}
for (const forbiddenPrefix of ['test/', 'benchmark/', 'scripts/']) {
  assert.ok(
    [...files].every((file) => !file.startsWith(forbiddenPrefix)),
    `release package unexpectedly includes ${forbiddenPrefix}`,
  );
}

console.log(`Release verification passed for ${packageJson.name}@${packageJson.version} (${files.size} files).`);
