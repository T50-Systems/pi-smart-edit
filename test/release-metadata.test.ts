import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const preparer = fileURLToPath(new URL('../../scripts/prepare-release.mjs', import.meta.url));

type Metadata = {
  tag?: string;
  packageVersion?: string;
  lockVersion?: string;
  rootLockVersion?: string;
  changelogVersion?: string;
};

async function prepare(metadata: Metadata = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'pi-smart-edit-release-'));
  const packagePath = join(directory, 'package.json');
  const lockPath = join(directory, 'package-lock.json');
  const changelogPath = join(directory, 'CHANGELOG.md');
  const outputPath = join(directory, 'notes.md');
  const packageVersion = metadata.packageVersion ?? '1.2.3';
  const lockVersion = metadata.lockVersion ?? packageVersion;
  const rootLockVersion = metadata.rootLockVersion ?? packageVersion;
  const changelogVersion = metadata.changelogVersion ?? packageVersion;
  await writeFile(packagePath, JSON.stringify({ version: packageVersion }), 'utf8');
  await writeFile(lockPath, JSON.stringify({ version: lockVersion, packages: { '': { version: rootLockVersion } } }), 'utf8');
  await writeFile(changelogPath, `# Changelog\n\n## [Unreleased]\n\n## [${changelogVersion}] - 2026-07-11\n\n### Added\n\n- Release feature.\n\n## [1.0.0] - 2026-01-01\n\n- Older.\n`, 'utf8');
  const result = spawnSync(process.execPath, [
    preparer,
    metadata.tag ?? `v${packageVersion}`,
    '--package', packagePath,
    '--lock', lockPath,
    '--changelog', changelogPath,
    '--output', outputPath,
  ], { encoding: 'utf8', shell: false });
  return { result, outputPath };
}

test('release preparation emits only matching changelog notes', async () => {
  const { result, outputPath } = await prepare();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(await readFile(outputPath, 'utf8'), '### Added\n\n- Release feature.\n');
});

test('release preparation rejects tag, lockfile, and changelog mismatches', async () => {
  const cases: Metadata[] = [
    { tag: 'v1.2.4' },
    { lockVersion: '1.2.4' },
    { rootLockVersion: '1.2.4' },
    { changelogVersion: '1.2.4' },
  ];
  for (const metadata of cases) {
    const { result } = await prepare(metadata);
    assert.notEqual(result.status, 0, JSON.stringify(metadata));
    assert.match(result.stderr, /must match|must contain/);
  }
});
