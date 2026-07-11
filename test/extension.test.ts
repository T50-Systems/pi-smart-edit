import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Check } from 'typebox/value';
import registerSmartEdit, {
  smartEditParameters,
  type SmartEditExtensionApi,
  type SmartEditParameters,
} from '../src/extension.js';
import { FilesystemPiClient } from '../src/filesystem-client.js';

type RegisteredTool = Parameters<SmartEditExtensionApi['registerTool']>[0];

function register(): RegisteredTool {
  const tools: RegisteredTool[] = [];
  registerSmartEdit({ registerTool: (tool) => tools.push(tool) });
  assert.equal(tools.length, 1);
  assert.equal(tools[0]?.name, 'smart_edit');
  return tools[0] as RegisteredTool;
}

async function fixture(content: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'pi-smart-edit-extension-'));
  const path = join(directory, 'fixture.txt');
  await writeFile(path, content, 'utf8');
  return path;
}

const validPayloads: SmartEditParameters[] = [
  { path: 'file.ts', mode: 'replace_unique', oldText: 'old', newText: 'new' },
  { path: 'file.ts', mode: 'replace_between', startContent: 'start', endContent: 'end', lines: [] },
  { path: 'file.ts', mode: 'anchored_retry', op: 'replace', pos: '1#AA:old', lines: ['new'] },
  { path: 'file.ts', mode: 'anchored_retry', op: 'replace', pos: '1#AA:old', end: '2#BB:end', lines: ['new'] },
  { path: 'file.ts', mode: 'anchored_retry', op: 'append', pos: '1#AA:old', lines: ['new'] },
  { path: 'file.ts', mode: 'anchored_retry', op: 'prepend', pos: '1#AA:old', lines: ['new'] },
];

test('smart_edit schema accepts every documented mode and operation', () => {
  for (const payload of validPayloads) assert.equal(Check(smartEditParameters, payload), true, JSON.stringify(payload));
});

test('smart_edit schema rejects missing, unknown, and incompatible fields', () => {
  const invalidPayloads: unknown[] = [
    { path: 'file.ts', mode: 'replace_unique', oldText: 'old' },
    { path: 'file.ts', mode: 'replace_between', startContent: 'start', endContent: 'end' },
    { path: 'file.ts', mode: 'anchored_retry', op: 'replace', lines: [] },
    { path: 'file.ts', mode: 'unknown' },
    { path: 'file.ts', mode: 'anchored_retry', op: 'remove', pos: '1#AA:old', lines: [] },
    { path: 'file.ts', mode: 'anchored_retry', op: 'append', pos: '1#AA:old', end: '2#BB:end', lines: [] },
    { path: 'file.ts', mode: 'replace_unique', oldText: 'old', newText: 'new', lines: [] },
  ];
  for (const payload of invalidPayloads) assert.equal(Check(smartEditParameters, payload), false, JSON.stringify(payload));
});

test('extension registers exactly one tool and routes all modes', async () => {
  const tool = register();

  const uniquePath = await fixture('old\n');
  const unique = await tool.execute('unique', {
    path: uniquePath,
    mode: 'replace_unique',
    oldText: 'old',
    newText: 'new',
  });
  assert.deepEqual(unique.details, { mode: 'replace_unique', path: uniquePath });
  assert.equal(await readFile(uniquePath, 'utf8'), 'new\n');

  const betweenPath = await fixture('start\nmiddle\nend\n');
  await tool.execute('between', {
    path: betweenPath,
    mode: 'replace_between',
    startContent: 'start',
    endContent: 'end',
    lines: ['replacement'],
  });
  assert.equal(await readFile(betweenPath, 'utf8'), 'replacement\n');

  const anchoredPath = await fixture('old\n');
  const pos = (await new FilesystemPiClient().read({ path: anchoredPath })).split(/\r?\n/)[0] as string;
  await tool.execute('anchored', {
    path: anchoredPath,
    mode: 'anchored_retry',
    op: 'replace',
    pos,
    lines: ['new'],
  });
  assert.equal(await readFile(anchoredPath, 'utf8'), 'new\n');
});

test('schema validation prevents adapter errors from reaching the filesystem', async () => {
  const tool = register();
  const path = await fixture('unchanged\n');
  const invalid = { path, mode: 'replace_unique', oldText: 'unchanged' };

  if (Check(smartEditParameters, invalid)) {
    await tool.execute('invalid', invalid);
  }

  assert.equal(await readFile(path, 'utf8'), 'unchanged\n');
});
