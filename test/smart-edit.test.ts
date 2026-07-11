import test from 'node:test';
import assert from 'node:assert/strict';
import { SmartEditSession } from '../src/smart-edit.js';
import type { EditParams, PiClient, ReadParams } from '../src/types.js';

class FakeClient implements PiClient {
  calls = 0;
  received: EditParams[] = [];

  async read(_params: ReadParams): Promise<string> {
    return '1#AAAA1111:start\n2#BBBB2222:end';
  }

  async edit(params: EditParams): Promise<string> {
    this.calls += 1;
    this.received.push(params);
    if (this.calls === 1) {
      return '[E_STALE_ANCHOR]\n>>> 2#FFFF9999:target\n>>> 3#EEEE8888:end';
    }
    return '2#FFFF9999:patched';
  }
}

test('replaceUnique forwards an exact semantic operation', async () => {
  let received: EditParams | undefined;
  const session = new SmartEditSession({
    read: async () => '',
    edit: async (params) => {
      received = params;
      return 'ok';
    },
  });

  assert.equal(await session.replaceUnique('x.txt', 'old', 'new'), 'ok');
  assert.deepEqual(received?.edits, [{ op: 'replace_text', oldText: 'old', newText: 'new' }]);
});

test('readFresh forwards default and explicit windows', async () => {
  const reads: ReadParams[] = [];
  const session = new SmartEditSession({
    read: async (params) => {
      reads.push(params);
      return 'snapshot';
    },
    edit: async () => 'ok',
  });

  assert.equal(await session.readFresh('x.txt'), 'snapshot');
  assert.equal(await session.readFresh('x.txt', 10, 20), 'snapshot');
  assert.deepEqual(reads, [
    { path: 'x.txt', offset: 1, limit: 400 },
    { path: 'x.txt', offset: 10, limit: 20 },
  ]);
});

test('anchored operations return a non-stale result without retrying', async () => {
  let calls = 0;
  const session = new SmartEditSession({
    read: async () => '',
    edit: async () => {
      calls += 1;
      return 'ok';
    },
  });

  assert.equal(await session.replaceAnchored('x.txt', { op: 'replace', pos: '1#AAAA1111:x' }), 'ok');
  assert.equal(
    await session.replaceAnchoredWithRetry('x.txt', { op: 'replace', pos: '1#AAAA1111:x' }),
    'ok',
  );
  assert.equal(calls, 2);
});

test('replaceAnchoredWithRetry refreshes position and end anchors once', async () => {
  const client = new FakeClient();
  const session = new SmartEditSession(client);
  const result = await session.replaceAnchoredWithRetry('x.txt', {
    op: 'replace',
    pos: '2#BBBB2222:target',
    end: '9#DDDD7777:end',
    lines: ['patched'],
  });

  assert.equal(result, '2#FFFF9999:patched');
  assert.equal(client.calls, 2);
  assert.equal((client.received[1]?.edits[0] as any)?.pos, '2#FFFF9999:target');
  assert.equal((client.received[1]?.edits[0] as any)?.end, '3#EEEE8888:end');
});

test('replaceAnchoredWithRetry preserves an unmatched end anchor', async () => {
  const responses = ['[E_STALE_ANCHOR]\n>>> 2#FFFF9999:target', 'ok'];
  let received: EditParams | undefined;
  const session = new SmartEditSession({
    read: async () => '',
    edit: async (params) => {
      received = params;
      return responses.shift() ?? 'ok';
    },
  });

  await session.replaceAnchoredWithRetry('x.txt', {
    op: 'replace',
    pos: '2#BBBB2222:target',
    end: '9#DDDD7777:end',
  });

  assert.equal((received?.edits[0] as any)?.end, '9#DDDD7777:end');
});

test('replaceAnchoredWithRetry requires a position anchor for recovery', async () => {
  const session = new SmartEditSession(new FakeClient());
  await assert.rejects(
    session.replaceAnchoredWithRetry('x.txt', { op: 'replace', lines: ['patched'] }),
    /without a position anchor/,
  );
});

test('replaceAnchoredWithRetry stops when suggestions cannot identify the original content', async () => {
  const session = new SmartEditSession(new FakeClient());
  await assert.rejects(
    session.replaceAnchoredWithRetry('x.txt', {
      op: 'replace',
      pos: '2#BBBB2222:missing',
      lines: ['patched'],
    }),
    /no matching recovery anchor/,
  );
});

test('replaceBetween resolves anchors from read snapshot', async () => {
  let received: EditParams | undefined;
  const client: PiClient = {
    read: async () => '1#AAAA1111:start\n2#BBBB2222:middle\n3#CCCC3333:end',
    edit: async (params) => {
      received = params;
      return 'ok';
    },
  };

  const session = new SmartEditSession(client);
  await session.replaceBetween('x.txt', 'start', 'end', ['new']);

  assert.equal(received?.edits[0]?.op, 'replace');
  assert.equal((received?.edits[0] as any)?.pos, '1#AAAA1111:start');
  assert.equal((received?.edits[0] as any)?.end, '3#CCCC3333:end');
});

test('replaceBetween reports missing boundaries without editing', async () => {
  let edited = false;
  const session = new SmartEditSession({
    read: async () => '1#AAAA1111:start',
    edit: async () => {
      edited = true;
      return 'unexpected';
    },
  });

  await assert.rejects(session.replaceBetween('x.txt', 'start', 'end', ['new']), /x\.txt/);
  assert.equal(edited, false);
});
