import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseDocument } from 'yaml';

const files = [
  '.github/dependabot.yml',
  '.github/workflows/ci.yml',
  '.github/workflows/release.yml',
];

for (const file of files) {
  const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
  const document = parseDocument(source, { uniqueKeys: true });
  assert.deepEqual(document.errors, [], `${file} must be valid YAML: ${document.errors.join('; ')}`);
  const value = document.toJS();
  assert.ok(value && typeof value === 'object', `${file} must contain a YAML mapping`);

  if (file.includes('/workflows/')) {
    assert.ok(value.on, `${file} must define triggers`);
    assert.ok(value.jobs && Object.keys(value.jobs).length > 0, `${file} must define jobs`);
    for (const match of source.matchAll(/^\s*uses:\s*([^\s]+)\s*$/gm)) {
      assert.match(match[1], /@(?:v\d+|[0-9a-f]{40})$/, `${file} action references must use a reviewed major tag or commit`);
    }
  }
}

console.log(`Workflow YAML verified (${files.length} files).`);
