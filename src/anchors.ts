import { createHash } from 'node:crypto';
import type { AnchorLine, StaleAnchorInfo } from './types.js';

const ANCHOR_RE = /^(\d+)#([^:]+):(.*)$/;

export function makeAnchor(lineNumber: number, content: string): AnchorLine {
  const hash = createHash('sha1').update(content).digest('hex').slice(0, 8).toUpperCase();
  const raw = `${lineNumber}#${hash}:${content}`;
  return { lineNumber, hash, content, raw };
}

export function parseAnchorLine(line: string): AnchorLine | null {
  const match = line.match(ANCHOR_RE);
  if (!match) return null;
  return {
    lineNumber: Number(match[1]),
    hash: match[2],
    content: match[3],
    raw: line,
  };
}

export function parseReadAnchors(text: string): AnchorLine[] {
  return text
    .split(/\r?\n/)
    .map(parseAnchorLine)
    .filter((v): v is AnchorLine => Boolean(v));
}

export function formatAnchors(lines: string[], offset = 1): string {
  return lines.map((line, idx) => makeAnchor(offset + idx, line).raw).join('\n');
}

export function parseStaleAnchorError(text: string): StaleAnchorInfo {
  const suggested = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^>>>\s*/, ''))
    .map(parseAnchorLine)
    .filter((v): v is AnchorLine => Boolean(v));

  return {
    stale: text.includes('[E_STALE_ANCHOR]'),
    suggested,
    raw: text,
  };
}

export function findAnchorByContent(
  anchors: AnchorLine[],
  content: string,
): AnchorLine | undefined {
  return anchors.find((a) => a.content === content);
}
