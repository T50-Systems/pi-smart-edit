import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { parse } from 'yaml';

const gitDependency = /^(?:github:|gitlab:|bitbucket:|git(?:\+[^:]+)?:|https?:\/\/.*\.git(?:#|$))/i;
const immutableRevision = /#([0-9a-f]{40})$/i;

export function verifyRuntimeDependencies(packageJson, packageLock) {
  for (const [name, spec] of Object.entries(packageJson.dependencies ?? {})) {
    if (!gitDependency.test(spec)) continue;

    const revision = immutableRevision.exec(spec)?.[1];
    assert.ok(
      revision,
      `runtime git dependency ${name} must end with an immutable 40-character commit revision`,
    );

    if (packageLock.importers) {
      const locked = packageLock.importers['.']?.dependencies?.[name];
      assert.equal(locked?.specifier, spec, `pnpm-lock.yaml must preserve the immutable ${name} specification`);
      const resolution = packageLock.packages?.[`${name}@${locked.version}`]?.resolution;
      assert.equal(resolution?.type, 'git', `${name} must use a Git resolution`);
      assert.equal(resolution.commit, revision, `${name} must resolve to ${revision}`);
      const github = /^github:([^#]+)#/i.exec(spec);
      if (github) {
        assert.equal(resolution.repo.toLowerCase(), `https://github.com/${github[1]}.git`.toLowerCase(), `${name} must resolve to its declared repository`);
      }
      continue;
    }

    const lockedSpec = packageLock.packages?.['']?.dependencies?.[name];
    assert.equal(lockedSpec, spec, `package-lock.json must preserve the immutable ${name} specification`);

    const resolved = packageLock.packages?.[`node_modules/${name}`]?.resolved;
    assert.equal(typeof resolved, 'string', `package-lock.json must resolve ${name}`);
    assert.match(resolved, new RegExp(`#${revision}$`, 'i'), `${name} must resolve to ${revision}`);
  }
}

export function verifyPnpmManifest(packageJson, lock) {
  assert.equal(Number(lock.lockfileVersion), 9, 'pnpm-lock.yaml must use the supported lock format');
  const importer = lock.importers?.['.'];
  assert.ok(importer, 'pnpm-lock.yaml must contain the root importer');
  for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    for (const [name, spec] of Object.entries(packageJson[section] ?? {})) {
      assert.equal(importer[section]?.[name]?.specifier, spec, `pnpm-lock.yaml must preserve ${name}'s declared specification`);
    }
  }
}

export async function verifyDependencyFiles(packagePath, lockPath) {
  const [packageSource, lockSource] = await Promise.all([
    readFile(packagePath, 'utf8'),
    readFile(lockPath, 'utf8'),
  ]);
  const packageJson = JSON.parse(packageSource);
  const lock = lockPath.endsWith('.json') ? JSON.parse(lockSource) : parse(lockSource);
  if (!lockPath.endsWith('.json')) verifyPnpmManifest(packageJson, lock);
  verifyRuntimeDependencies(packageJson, lock);
}

const invokedAsScript = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (invokedAsScript) {
  const packagePath = resolve(process.argv[2] ?? fileURLToPath(new URL('../package.json', import.meta.url)));
  const lockPath = resolve(process.argv[3] ?? fileURLToPath(new URL('../pnpm-lock.yaml', import.meta.url)));
  try {
    await verifyDependencyFiles(packagePath, lockPath);
    console.log('Runtime dependency policy verified.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
