import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  formatSmartEditError,
  normalizeSmartEditError,
  normalizeSmartEditResult,
  SmartEditError,
  SmartEditErrorCode,
} from '../src/errors.js';
import { FilesystemPiClient } from '../src/filesystem-client.js';
import { SmartEditSession } from '../src/smart-edit.js';
import type { PiClient } from '../src/types.js';

async function capture(work: Promise<unknown>): Promise<SmartEditError> {
  try {
    await work;
  } catch (error) {
    assert.ok(error instanceof SmartEditError);
    return error;
  }
  assert.fail('expected SmartEditError rejection');
}

test('public error details are stable and redact operational context', () => {
  const secretPath = 'C:/private/customer/secret.txt';
  const error = new SmartEditError(SmartEditErrorCode.BoundaryNotFound, `Unable to find boundary anchors in ${secretPath}`);

  assert.equal(error.code, 'E_BOUNDARY_NOT_FOUND');
  assert.deepEqual(error.details, { code: 'E_BOUNDARY_NOT_FOUND', category: 'policy' });
  assert.equal(JSON.stringify(error.details).includes(secretPath), false);
  assert.match(error.message, /secret\.txt/);
  assert.equal(formatSmartEditError(error), `[E_BOUNDARY_NOT_FOUND] ${error.message}`);
});

test('central normalization classifies core returns, thrown errors, filesystem, and queue failures', () => {
  assert.throws(
    () => normalizeSmartEditResult('[E_MULTI_MATCH] multiple matches'),
    (error: unknown) => error instanceof SmartEditError && error.code === SmartEditErrorCode.MultipleMatches,
  );

  const thrownCore = normalizeSmartEditError(new Error('[E_MULTI_MATCH] multiple matches'));
  assert.equal(thrownCore.code, SmartEditErrorCode.MultipleMatches);

  const permission = Object.assign(new Error('access denied'), { code: 'EACCES', path: 'C:/private/file' });
  const normalizedPermission = normalizeSmartEditError(permission, SmartEditErrorCode.FilesystemIo);
  assert.equal(normalizedPermission.code, SmartEditErrorCode.FilesystemPermission);
  assert.deepEqual(normalizedPermission.details, { code: 'E_FILESYSTEM_PERMISSION', category: 'filesystem' });
  assert.equal(JSON.stringify(normalizedPermission.details).includes('private'), false);

  const queue = normalizeSmartEditError(new Error('queue unavailable'), SmartEditErrorCode.QueueFailure);
  assert.equal(queue.code, SmartEditErrorCode.QueueFailure);
});

test('returned and thrown core failures have library code parity', async () => {
  const clients: PiClient[] = [
    { read: async () => '', edit: async () => '[E_INVALID_PATCH] invalid anchor' },
    { read: async () => '', edit: async () => { throw new Error('[E_INVALID_PATCH] invalid anchor'); } },
  ];

  for (const client of clients) {
    const error = await capture(new SmartEditSession(client).replaceUnique('fixture.txt', 'old', 'new'));
    assert.equal(error.code, SmartEditErrorCode.InvalidPatch);
    assert.match(error.message, /invalid anchor/);
  }
});

test('filesystem adapter and library reject the same coded nonmutating failure', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pi-smart-edit-errors-'));
  const path = join(directory, 'fixture.txt');
  await writeFile(path, 'same\nsame\n', 'utf8');
  const before = await readFile(path, 'utf8');

  const adapterError = await capture(new FilesystemPiClient().edit({
    path,
    edits: [{ op: 'replace_text', oldText: 'same', newText: 'changed' }],
  }));
  assert.equal(adapterError.code, SmartEditErrorCode.InvalidPatch);
  assert.equal(await readFile(path, 'utf8'), before);

  const libraryError = await capture(new SmartEditSession(new FilesystemPiClient()).replaceUnique(path, 'same', 'changed'));
  assert.equal(libraryError.code, adapterError.code);
  assert.equal(await readFile(path, 'utf8'), before);
});
