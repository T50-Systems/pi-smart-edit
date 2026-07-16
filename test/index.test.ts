import test from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../src/index.js';

test('public index exports the supported library surface', () => {
  assert.equal(typeof api.SmartEditSession, 'function');
  assert.equal(typeof api.FilesystemPiClient, 'function');
  assert.equal(typeof api.parseReadAnchors, 'function');
  assert.equal(typeof api.SmartEditError, 'function');
  assert.equal(api.SmartEditErrorCode.StaleAnchor, 'E_STALE_ANCHOR');
});
