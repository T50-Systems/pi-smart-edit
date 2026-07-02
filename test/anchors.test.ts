import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStaleAnchorError } from '../src/anchors.js';

test('parse stale anchor suggestions', () => {
  const info = parseStaleAnchorError(`
[E_STALE_ANCHOR] nope
>>> 12#ABCD1234:hello
>>> 13#EEEE9999:world
`.trim());

  assert.equal(info.stale, true);
  assert.equal(info.suggested.length, 2);
  assert.equal(info.suggested[0]?.content, 'hello');
});
