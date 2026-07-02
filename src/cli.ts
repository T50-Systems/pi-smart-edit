#!/usr/bin/env node

import { FilesystemPiClient } from './filesystem-client.js';
import { SmartEditSession } from './smart-edit.js';

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const command = process.argv[2];
  const path = arg('--path');
  if (!command || !path) {
    console.error('Usage: pi-smart-edit <replace-unique|replace-between|anchored-retry> --path <file> ...');
    process.exit(1);
  }

  const session = new SmartEditSession(new FilesystemPiClient());

  if (command === 'replace-unique') {
    const oldText = arg('--old');
    const newText = arg('--new');
    if (!oldText || newText === undefined) throw new Error('Missing --old or --new');
    console.log(await session.replaceUnique(path, oldText, newText));
    return;
  }

  if (command === 'replace-between') {
    const start = arg('--start');
    const end = arg('--end');
    const linesJson = arg('--lines-json') ?? '[]';
    if (!start || !end) throw new Error('Missing --start or --end');
    console.log(await session.replaceBetween(path, start, end, JSON.parse(linesJson) as string[]));
    return;
  }

  if (command === 'anchored-retry') {
    const pos = arg('--pos');
    const end = arg('--end');
    const op = (arg('--op') ?? 'replace') as 'replace' | 'append' | 'prepend';
    const linesJson = arg('--lines-json') ?? '[]';
    if (!pos) throw new Error('Missing --pos');
    console.log(
      await session.replaceAnchoredWithRetry(path, {
        op,
        pos,
        end,
        lines: JSON.parse(linesJson) as string[],
      }),
    );
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
