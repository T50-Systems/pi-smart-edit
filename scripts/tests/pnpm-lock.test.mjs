import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parse } from 'yaml';
import { verifyPnpmManifest, verifyRuntimeDependencies } from '../verify-dependencies.mjs';

const pkg = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
const lock = parse(await readFile(new URL('../../pnpm-lock.yaml', import.meta.url), 'utf8'));

test('the imported pnpm lock preserves runtime Git provenance and manifest specifications', () => {
  verifyPnpmManifest(pkg, lock);
  verifyRuntimeDependencies(pkg, lock);
});

test('a modified Git commit or repository is rejected', () => {
  const name = 'pi-anchor-edit-core';
  const key = `${name}@${lock.importers['.'].dependencies[name].version}`;
  for (const field of ['commit', 'repo']) {
    const changed = structuredClone(lock);
    changed.packages[key].resolution[field] = field === 'commit'
      ? '0000000000000000000000000000000000000000'
      : 'https://github.com/untrusted/other.git';
    assert.throws(() => verifyRuntimeDependencies(pkg, changed));
  }
});

test('a stale dependency specification or absent importer is rejected', () => {
  const stale = structuredClone(lock);
  stale.importers['.'].dependencies['pi-anchor-edit-core'].specifier = 'github:T50-Systems/pi-anchor-edit-core#main';
  assert.throws(() => verifyPnpmManifest(pkg, stale));
  const missing = structuredClone(lock);
  delete missing.importers['.'];
  assert.throws(() => verifyPnpmManifest(pkg, missing));
});
