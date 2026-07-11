import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const [workflow, policySource] = await Promise.all([
  readFile(new URL('.github/workflows/ci.yml', root), 'utf8'),
  readFile(new URL('.github/required-checks.json', root), 'utf8'),
]);
const policy = JSON.parse(policySource);
const expected = [
  'Validate (ubuntu-latest, Node 22)',
  'Validate (ubuntu-latest, Node 24)',
  'Validate (windows-latest, Node 22)',
  'Validate (windows-latest, Node 24)',
  'Validate (macos-latest, Node 22)',
  'Validate (macos-latest, Node 24)',
];

assert.deepEqual(policy.required_checks, expected, 'required checks must match the supported OS/Node matrix');
assert.equal(policy.branch, 'main');
assert.equal(policy.strict, true, 'required checks must require an up-to-date branch');
assert.equal(policy.allow_force_pushes, false);
assert.equal(policy.allow_deletions, false);
assert.match(workflow, /name: Validate \(\$\{\{ matrix\.os \}\}, Node \$\{\{ matrix\.node-version \}\}\)/);
assert.match(workflow, /os: \[ubuntu-latest, windows-latest, macos-latest\]/);
assert.match(workflow, /node-version: \[22, 24\]/);

console.log(`Repository policy verified (${expected.length} stable required checks).`);
