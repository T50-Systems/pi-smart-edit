#!/usr/bin/env node

import { fileURLToPath } from 'node:url';
import { FilesystemPiClient } from './filesystem-client.js';
import { SmartEditSession } from './smart-edit.js';

const usage = 'Usage: pi-smart-edit <replace-unique|replace-between|anchored-retry> --path <file> ...';

function arg(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  const value = index >= 0 ? args[index + 1] : undefined;
  return value && !value.startsWith('--') ? value : undefined;
}

function requiredArg(args: string[], name: string): string {
  const value = arg(args, name);
  if (value === undefined) throw new Error(`Missing ${name}`);
  return value;
}

function linesArg(args: string[]): string[] {
  const source = arg(args, '--lines-json') ?? '[]';
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw new Error('--lines-json must be valid JSON');
  }
  if (!Array.isArray(value) || value.some((line) => typeof line !== 'string')) {
    throw new Error('--lines-json must be a JSON array of strings');
  }
  return value;
}

export async function runCli(args: string[]): Promise<string> {
  const command = args[0];
  const path = arg(args, '--path');
  if (!command || !path) throw new Error(usage);

  const session = new SmartEditSession(new FilesystemPiClient());

  if (command === 'replace-unique') {
    return session.replaceUnique(path, requiredArg(args, '--old'), requiredArg(args, '--new'));
  }

  if (command === 'replace-between') {
    return session.replaceBetween(
      path,
      requiredArg(args, '--start'),
      requiredArg(args, '--end'),
      linesArg(args),
    );
  }

  if (command === 'anchored-retry') {
    const op = arg(args, '--op') ?? 'replace';
    if (op !== 'replace' && op !== 'append' && op !== 'prepend') {
      throw new Error('--op must be one of: replace, append, prepend');
    }
    return session.replaceAnchoredWithRetry(path, {
      op,
      pos: requiredArg(args, '--pos'),
      end: arg(args, '--end'),
      lines: linesArg(args),
    });
  }

  throw new Error(`Unknown command: ${command}. ${usage}`);
}

export async function main(args = process.argv.slice(2)): Promise<void> {
  try {
    console.log(await runCli(args));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const invokedAsScript = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedAsScript) {
  await main();
}
