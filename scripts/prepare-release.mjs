import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

export function extractReleaseNotes(changelog, version) {
  const heading = new RegExp(`^## \\[${version.replaceAll('.', '\\.')}\\] - \\d{4}-\\d{2}-\\d{2}$`, 'm');
  const match = heading.exec(changelog);
  assert.ok(match, `CHANGELOG.md must contain a dated ${version} section`);
  const start = match.index + match[0].length;
  const nextSection = changelog.slice(start).search(/^(?:## |\[[^\]]+\]:\s)/m);
  const notes = changelog.slice(start, nextSection < 0 ? undefined : start + nextSection).trim();
  assert.ok(notes, `CHANGELOG.md ${version} section must contain release notes`);
  return notes;
}

export function verifyReleaseMetadata(tag, packageJson, packageLock, changelog) {
  assert.match(tag, /^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, 'release tag must use vX.Y.Z format');
  assert.equal(tag, `v${packageJson.version}`, `tag ${tag} must match package version v${packageJson.version}`);
  assert.equal(packageLock.version, packageJson.version, 'package-lock.json version must match package.json');
  assert.equal(packageLock.packages?.['']?.version, packageJson.version, 'package-lock.json root version must match package.json');
  return extractReleaseNotes(changelog, packageJson.version);
}

const tag = process.argv[2] ?? process.env.RELEASE_TAG;
if (!tag) {
  console.error('Usage: node scripts/prepare-release.mjs vX.Y.Z [--output <path>]');
  process.exitCode = 1;
} else {
  try {
    const packagePath = resolve(option('--package') ?? fileURLToPath(new URL('../package.json', import.meta.url)));
    const lockPath = resolve(option('--lock') ?? fileURLToPath(new URL('../package-lock.json', import.meta.url)));
    const changelogPath = resolve(option('--changelog') ?? fileURLToPath(new URL('../CHANGELOG.md', import.meta.url)));
    const [packageSource, lockSource, changelog] = await Promise.all([
      readFile(packagePath, 'utf8'),
      readFile(lockPath, 'utf8'),
      readFile(changelogPath, 'utf8'),
    ]);
    const notes = verifyReleaseMetadata(tag, JSON.parse(packageSource), JSON.parse(lockSource), changelog);
    const output = option('--output');
    if (output) await writeFile(resolve(output), `${notes}\n`, 'utf8');
    else console.log(notes);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
