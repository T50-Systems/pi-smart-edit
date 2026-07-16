import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { setImmediate as waitForImmediate } from 'node:timers/promises';
import { withFileMutationQueue } from '@earendil-works/pi-coding-agent';
import { Check } from 'typebox/value';
import registerSmartEdit, {
  smartEditParameters,
  type SmartEditExtensionApi,
  type SmartEditParameters,
} from '../src/extension.js';
import { FilesystemPiClient } from '../src/filesystem-client.js';
import { SmartEditError, SmartEditErrorCode } from '../src/errors.js';

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

type Deferred = {
  promise: Promise<void>;
  resolve(): void;
};

function deferred(): Deferred {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function context(cwd: string) {
  return { cwd };
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
  }, undefined, undefined, context(dirname(uniquePath)));
  assert.deepEqual(unique.details, { mode: 'replace_unique', path: uniquePath });
  assert.equal(await readFile(uniquePath, 'utf8'), 'new\n');

  const betweenPath = await fixture('start\nmiddle\nend\n');
  await tool.execute('between', {
    path: betweenPath,
    mode: 'replace_between',
    startContent: 'start',
    endContent: 'end',
    lines: ['replacement'],
  }, undefined, undefined, context(dirname(betweenPath)));
  assert.equal(await readFile(betweenPath, 'utf8'), 'replacement\n');

  const anchoredPath = await fixture('old\n');
  const pos = (await new FilesystemPiClient().read({ path: anchoredPath })).split(/\r?\n/)[0] as string;
  await tool.execute('anchored', {
    path: anchoredPath,
    mode: 'anchored_retry',
    op: 'replace',
    pos,
    lines: ['new'],
  }, undefined, undefined, context(dirname(anchoredPath)));
  assert.equal(await readFile(anchoredPath, 'utf8'), 'new\n');
});

test('schema validation prevents adapter errors from reaching the filesystem', async () => {
  const tool = register();
  const path = await fixture('unchanged\n');
  const invalid = { path, mode: 'replace_unique', oldText: 'unchanged' };

  if (Check(smartEditParameters, invalid)) {
    await tool.execute('invalid', invalid, undefined, undefined, context(dirname(path)));
  }

  assert.equal(await readFile(path, 'utf8'), 'unchanged\n');
});

test('direct Pi execution exposes schema code details and does not mutate', async () => {
  const tool = register();
  const path = await fixture('unchanged\n');
  const invalid = { path, mode: 'replace_unique', oldText: 'unchanged' } as SmartEditParameters;

  await assert.rejects(
    tool.execute('invalid-direct', invalid, undefined, undefined, context(dirname(path))),
    (error: unknown) =>
      error instanceof SmartEditError &&
      error.code === SmartEditErrorCode.SchemaInvalid &&
      error.details.code === SmartEditErrorCode.SchemaInvalid,
  );
  assert.equal(await readFile(path, 'utf8'), 'unchanged\n');
});

test('serializes relative smart_edit paths with absolute queued aliases', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pi-smart-edit-alias-'));
  const path = join(directory, 'race.txt');
  await writeFile(path, 'alpha\nbeta\n', 'utf8');

  const blockerStarted = deferred();
  const releaseBlocker = deferred();
  const blocker = withFileMutationQueue(path, async () => {
    const original = await readFile(path, 'utf8');
    blockerStarted.resolve();
    await releaseBlocker.promise;
    await writeFile(path, original.replace('alpha', 'ALPHA'), 'utf8');
  });

  await blockerStarted.promise;
  const edit = register().execute('relative-alias', {
    path: '@race.txt',
    mode: 'replace_unique',
    oldText: 'beta',
    newText: 'BETA',
  }, undefined, undefined, context(directory));

  releaseBlocker.resolve();
  await Promise.all([blocker, edit]);
  assert.equal(await readFile(path, 'utf8'), 'ALPHA\nBETA\n');
});

test('does not serialize smart_edit operations for different files', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pi-smart-edit-parallel-'));
  const blockedPath = join(directory, 'blocked.txt');
  const editablePath = join(directory, 'editable.txt');
  await Promise.all([
    writeFile(blockedPath, 'blocked\n', 'utf8'),
    writeFile(editablePath, 'old\n', 'utf8'),
  ]);

  const blockerStarted = deferred();
  const releaseBlocker = deferred();
  const blocker = withFileMutationQueue(blockedPath, async () => {
    blockerStarted.resolve();
    await releaseBlocker.promise;
  });
  await blockerStarted.promise;

  const edit = register().execute('different-file', {
    path: 'editable.txt',
    mode: 'replace_unique',
    oldText: 'old',
    newText: 'new',
  }, undefined, undefined, context(directory));
  const outcome = await Promise.race([
    edit.then(() => 'completed'),
    new Promise<'blocked'>((resolveOutcome) => setTimeout(() => resolveOutcome('blocked'), 2_000)),
  ]);

  releaseBlocker.resolve();
  await Promise.all([blocker, edit]);
  assert.equal(outcome, 'completed');
  assert.equal(await readFile(editablePath, 'utf8'), 'new\n');
});

test('holds the queue across the stale-anchor retry boundary', async () => {
  const path = await fixture('old\n');
  const firstAttemptFinished = deferred();
  const allowRetry = deferred();
  const events: string[] = [];
  const originalEdit = FilesystemPiClient.prototype.edit;
  let attempts = 0;

  FilesystemPiClient.prototype.edit = async function (params) {
    attempts += 1;
    const attempt = attempts;
    events.push(`attempt-${attempt}`);
    try {
      return await originalEdit.call(this, params);
    } finally {
      if (attempt === 1) {
        firstAttemptFinished.resolve();
        await allowRetry.promise;
      }
    }
  };

  try {
    const edit = register().execute('retry-boundary', {
      path,
      mode: 'anchored_retry',
      op: 'replace',
      pos: '1#00:old',
      lines: ['new'],
    }, undefined, undefined, context(dirname(path)));

    await firstAttemptFinished.promise;
    const competitor = withFileMutationQueue(path, async () => {
      events.push('competitor');
    });
    await waitForImmediate();
    allowRetry.resolve();

    await Promise.all([edit, competitor]);
    assert.deepEqual(events, ['attempt-1', 'attempt-2', 'competitor']);
    assert.equal(await readFile(path, 'utf8'), 'new\n');
  } finally {
    allowRetry.resolve();
    FilesystemPiClient.prototype.edit = originalEdit;
  }
});

test('releases the queue when smart_edit rejects', async () => {
  const path = await fixture('only\n');
  const readStarted = deferred();
  const allowRead = deferred();
  const competitorEntered = deferred();
  const originalRead = FilesystemPiClient.prototype.read;

  FilesystemPiClient.prototype.read = async function (params) {
    readStarted.resolve();
    await allowRead.promise;
    return originalRead.call(this, params);
  };

  try {
    const edit = register().execute('rejecting-edit', {
      path,
      mode: 'replace_between',
      startContent: 'missing-start',
      endContent: 'missing-end',
      lines: ['replacement'],
    }, undefined, undefined, context(dirname(path)));

    await readStarted.promise;
    const competitor = withFileMutationQueue(path, async () => {
      competitorEntered.resolve();
      await writeFile(path, 'released\n', 'utf8');
    });
    allowRead.resolve();

    await assert.rejects(
      edit,
      (error: unknown) => error instanceof SmartEditError && error.code === SmartEditErrorCode.BoundaryNotFound,
    );
    await competitorEntered.promise;
    await competitor;
    assert.equal(await readFile(path, 'utf8'), 'released\n');
  } finally {
    allowRead.resolve();
    FilesystemPiClient.prototype.read = originalRead;
  }
});
