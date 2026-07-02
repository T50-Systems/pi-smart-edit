import test from 'node:test';
import assert from 'node:assert/strict';
import { SmartEditSession } from '../src/smart-edit.js';
import type { EditParams, PiClient, ReadParams } from '../src/types.js';

class FakeClient implements PiClient {
  calls = 0;

  async read(_params: ReadParams): Promise<string> {
    return '1#AAAA1111:start\n2#BBBB2222:end';
  }

  async edit(_params: EditParams): Promise<string> {
    this.calls += 1;
    if (this.calls === 1) {
      return '[E_STALE_ANCHOR]\n>>> 2#FFFF9999:target';
    }
    return '2#FFFF9999:patched';
  }
}

test('replaceAnchoredWithRetry retries on stale anchor', async () => {
  const session = new SmartEditSession(new FakeClient());
  const result = await session.replaceAnchoredWithRetry('x.txt', {
    op: 'replace',
    pos: '2#BBBB2222:target',
    lines: ['patched'],
  });

  assert.equal(result, '2#FFFF9999:patched');
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
