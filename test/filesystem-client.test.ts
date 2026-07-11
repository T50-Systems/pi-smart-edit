import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { FilesystemPiClient } from '../src/filesystem-client.js';

test('filesystem client reads hashline format', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'pi-smart-edit-'));
  const path = join(dir, 'a.txt');
  await writeFile(path, 'one\ntwo', 'utf8');

  const client = new FilesystemPiClient();
  const text = await client.read({ path });

  assert.match(text, /^1#[A-Z0-9]+:one/m);
  assert.match(text, /^2#[A-Z0-9]+:two/m);
});

test('filesystem client detects stale anchor and succeeds after refreshed edit', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'pi-smart-edit-'));
  const path = join(dir, 'b.txt');
  await writeFile(path, 'alpha\nbeta', 'utf8');

  const client = new FilesystemPiClient();
  const firstRead = await client.read({ path });
  const stalePos = firstRead.split(/\r?\n/)[1] as string;

  await writeFile(path, 'alpha\ngamma', 'utf8');
  const stale = await client.edit({
    path,
    edits: [{ op: 'replace', pos: stalePos, lines: ['patched'] }],
  });
  assert.match(stale, /\[E_STALE_ANCHOR\]/);

  const freshRead = await client.read({ path });
  const freshPos = freshRead.split(/\r?\n/)[1] as string;
  await client.edit({ path, edits: [{ op: 'replace', pos: freshPos, lines: ['patched'] }] });

  const finalText = await readFile(path, 'utf8');
  assert.equal(finalText, 'alpha\npatched');
});

test('filesystem client preserves CRLF line endings', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'pi-smart-edit-crlf-'));
  const path = join(dir, 'crlf.txt');
  await writeFile(path, 'alpha\r\nbeta\r\n', 'utf8');

  const client = new FilesystemPiClient();
  const snapshot = await client.read({ path });
  const pos = snapshot.split(/\r?\n/)[1] as string;
  await client.edit({ path, edits: [{ op: 'replace', pos, lines: ['patched'] }] });

  assert.equal(await readFile(path, 'utf8'), 'alpha\r\npatched\r\n');
});
