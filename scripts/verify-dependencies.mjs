import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

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

    const lockedSpec = packageLock.packages?.['']?.dependencies?.[name];
    assert.equal(lockedSpec, spec, `package-lock.json must preserve the immutable ${name} specification`);

    const resolved = packageLock.packages?.[`node_modules/${name}`]?.resolved;
    assert.equal(typeof resolved, 'string', `package-lock.json must resolve ${name}`);
    assert.match(resolved, new RegExp(`#${revision}$`, 'i'), `${name} must resolve to ${revision}`);
  }
}

export async function verifyDependencyFiles(packagePath, lockPath) {
  const [packageSource, lockSource] = await Promise.all([
    readFile(packagePath, 'utf8'),
    readFile(lockPath, 'utf8'),
  ]);
  verifyRuntimeDependencies(JSON.parse(packageSource), JSON.parse(lockSource));
}

const invokedAsScript = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (invokedAsScript) {
  const packagePath = resolve(process.argv[2] ?? fileURLToPath(new URL('../package.json', import.meta.url)));
  const lockPath = resolve(process.argv[3] ?? fileURLToPath(new URL('../package-lock.json', import.meta.url)));
  try {
    await verifyDependencyFiles(packagePath, lockPath);
    console.log('Runtime dependency policy verified.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
