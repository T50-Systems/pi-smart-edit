import test from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { FilesystemPiClient } from '../src/filesystem-client.js';
import { runCli } from '../src/cli.js';
import { SmartEditError, SmartEditErrorCode } from '../src/errors.js';

const cliPath = fileURLToPath(new URL('../src/cli.js', import.meta.url));

type CliResult = SpawnSyncReturns<string>;

function invoke(args: string[]): CliResult {
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
    shell: false,
  });
}

async function fixture(name: string, content: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'pi-smart-edit-cli-'));
  const path = join(directory, name);
  await writeFile(path, content, 'utf8');
  return path;
}

test('documented replace-unique CLI recipe succeeds for a path with spaces', async () => {
  const path = await fixture('file with spaces.ts', 'const x = 1;\n');
  const result = invoke(['replace-unique', '--path', path, '--old', 'const x = 1;', '--new', 'const x = 2;']);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(await readFile(path, 'utf8'), 'const x = 2;\n');
});

test('documented replace-between CLI recipe succeeds', async () => {
  const path = await fixture('between.ts', 'function demo() {\n  return 1;\n}\n');
  const result = invoke([
    'replace-between',
    '--path',
    path,
    '--start',
    'function demo() {',
    '--end',
    '}',
    '--lines-json',
    JSON.stringify(['function demo() {', '  return 42;', '}']),
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(await readFile(path, 'utf8'), 'function demo() {\n  return 42;\n}\n');
});

test('documented anchored-retry CLI recipe succeeds without shell quoting', async () => {
  const path = await fixture('anchored.ts', 'old line\n');
  const snapshot = await new FilesystemPiClient().read({ path });
  const pos = snapshot.split(/\r?\n/)[0] as string;
  const result = invoke([
    'anchored-retry',
    '--path',
    path,
    '--op',
    'replace',
    '--pos',
    pos,
    '--lines-json',
    JSON.stringify(['new line']),
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(await readFile(path, 'utf8'), 'new line\n');
});

test('invalid CLI inputs fail actionably without writing', async () => {
  const path = await fixture('invalid.ts', 'unchanged\n');
  const cases: Array<{ args: string[]; code: string; error: RegExp }> = [
    { args: ['replace-between', '--path', path, '--start', 'unchanged', '--end', 'unchanged', '--lines-json', '['], code: 'E_INVALID_INPUT', error: /--lines-json must be valid JSON/ },
    { args: ['replace-between', '--path', path, '--start', 'unchanged', '--end', 'unchanged', '--lines-json', '[1]'], code: 'E_INVALID_INPUT', error: /JSON array of strings/ },
    { args: ['replace-unique', '--path', path, '--old', 'unchanged'], code: 'E_INVALID_INPUT', error: /Missing --new/ },
    { args: ['anchored-retry', '--path', path, '--pos', '1#AA:unchanged', '--op', 'remove'], code: 'E_INVALID_INPUT', error: /--op must be one of/ },
    { args: ['unknown', '--path', path], code: 'E_INVALID_INPUT', error: /Unknown command: unknown/ },
    { args: [], code: 'E_INVALID_INPUT', error: /Usage: pi-smart-edit/ },
  ];

  for (const entry of cases) {
    const before = await readFile(path, 'utf8');
    const result = invoke(entry.args);
    assert.notEqual(result.status, 0, `expected failure for ${entry.args.join(' ')}`);
    assert.match(result.stderr, new RegExp(`^\\[${entry.code}\\] `));
    assert.equal(result.stdout, '');
    assert.match(result.stderr, entry.error);
    assert.equal(await readFile(path, 'utf8'), before);
  }
});

test('runCli exposes the adapter for in-process coverage and stable errors', async () => {
  const path = await fixture('direct.ts', 'before\n');
  await runCli(['replace-unique', '--path', path, '--old', 'before', '--new', 'after']);
  assert.equal(await readFile(path, 'utf8'), 'after\n');
  await assert.rejects(
    runCli(['anchored-retry', '--path', path, '--op', 'invalid']),
    (error: unknown) => error instanceof SmartEditError && error.code === SmartEditErrorCode.InvalidInput,
  );
});

test('CLI emits the core code deterministically and does not mutate on ambiguity', async () => {
  const path = await fixture('ambiguous.ts', 'same\nsame\n');
  const before = await readFile(path, 'utf8');
  const result = invoke(['replace-unique', '--path', path, '--old', 'same', '--new', 'changed']);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /^\[E_INVALID_PATCH\] replace_text requires one unique exact occurrence\r?\n$/);
  assert.equal(result.stdout, '');
  assert.equal(await readFile(path, 'utf8'), before);
});

test('permission failures are non-zero and preserve content', { skip: process.platform === 'win32' && 'POSIX write bits are not enforced on Windows' }, async () => {
  const path = await fixture('readonly.ts', 'locked\n');
  await chmod(path, 0o444);
  try {
    const result = invoke(['replace-unique', '--path', path, '--old', 'locked', '--new', 'changed']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /permission|EACCES/i);
    assert.match(result.stderr, /^\[E_FILESYSTEM_PERMISSION\] /);
    assert.equal(await readFile(path, 'utf8'), 'locked\n');
  } finally {
    await chmod(path, 0o644);
    await chmod(dirname(path), 0o755);
  }
});
