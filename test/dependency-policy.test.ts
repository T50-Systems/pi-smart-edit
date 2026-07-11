import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const verifier = fileURLToPath(new URL('../../scripts/verify-dependencies.mjs', import.meta.url));

async function runWith(spec: string, resolved: string) {
  const directory = await mkdtemp(join(tmpdir(), 'pi-smart-edit-deps-'));
  const packagePath = join(directory, 'package.json');
  const lockPath = join(directory, 'package-lock.json');
  await writeFile(packagePath, JSON.stringify({ dependencies: { core: spec } }), 'utf8');
  await writeFile(lockPath, JSON.stringify({ packages: {
    '': { dependencies: { core: spec } },
    'node_modules/core': { resolved },
  } }), 'utf8');
  return spawnSync(process.execPath, [verifier, packagePath, lockPath], { encoding: 'utf8', shell: false });
}

test('runtime dependency verifier accepts a locked git commit', async () => {
  const revision = 'fa10abb76aee5e745ad291aff4448b09fd1cb47d';
  const result = await runWith(
    `github:T50-Systems/pi-anchor-edit-core#${revision}`,
    `git+ssh://git@github.com/T50-Systems/pi-anchor-edit-core.git#${revision}`,
  );
  assert.equal(result.status, 0, result.stderr);
});

test('runtime dependency verifier rejects a mutable git specification', async () => {
  const result = await runWith(
    'git+https://github.com/T50-Systems/pi-anchor-edit-core.git',
    'git+ssh://git@github.com/T50-Systems/pi-anchor-edit-core.git#fa10abb76aee5e745ad291aff4448b09fd1cb47d',
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /immutable 40-character commit revision/);
});
