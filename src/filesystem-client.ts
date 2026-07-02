import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { formatAnchors, makeAnchor, parseAnchorLine } from './anchors.js';
import type { EditOp, EditParams, PiClient, ReadParams, ReplaceLikeEditOp } from './types.js';

function splitLines(text: string): string[] {
  return text.length === 0 ? [] : text.split(/\r?\n/);
}

function joinLines(lines: string[]): string {
  return lines.join('\n');
}

async function loadLines(path: string): Promise<string[]> {
  try {
    const content = await readFile(path, 'utf8');
    return splitLines(content);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

function ensureAnchorMatches(lines: string[], anchorRaw: string): { ok: true; index: number } | { ok: false; message: string } {
  const anchor = parseAnchorLine(anchorRaw);
  if (!anchor) {
    return { ok: false, message: `[E_INVALID_PATCH] Invalid anchor: ${anchorRaw}` };
  }

  const index = anchor.lineNumber - 1;
  const currentLine = lines[index];
  if (currentLine === undefined) {
    return {
      ok: false,
      message: `[E_STALE_ANCHOR] Anchor no longer exists.\n>>> ${makeAnchor(Math.max(anchor.lineNumber, 1), '').raw}`,
    };
  }

  const currentAnchor = makeAnchor(anchor.lineNumber, currentLine);
  if (currentAnchor.raw !== anchorRaw) {
    return {
      ok: false,
      message: `[E_STALE_ANCHOR] Anchor changed.\n>>> ${currentAnchor.raw}`,
    };
  }

  return { ok: true, index };
}

function applyReplaceLike(lines: string[], edit: ReplaceLikeEditOp): string[] | string {
  const next = [...lines];
  const payload = edit.lines ?? [];

  if (edit.op === 'append' && !edit.pos) {
    next.push(...payload);
    return next;
  }

  if (edit.op === 'prepend' && !edit.pos) {
    return [...payload, ...next];
  }

  if (!edit.pos) {
    return `[E_INVALID_PATCH] ${edit.op} requires pos unless appending/prepending at file boundary`;
  }

  const start = ensureAnchorMatches(next, edit.pos);
  if (!start.ok) return start.message;

  if (edit.op === 'append') {
    next.splice(start.index + 1, 0, ...payload);
    return next;
  }

  if (edit.op === 'prepend') {
    next.splice(start.index, 0, ...payload);
    return next;
  }

  if (edit.end) {
    const end = ensureAnchorMatches(next, edit.end);
    if (!end.ok) return end.message;
    next.splice(start.index, end.index - start.index + 1, ...payload);
    return next;
  }

  next.splice(start.index, 1, ...payload);
  return next;
}

function applyReplaceText(text: string, edit: Extract<EditOp, { op: 'replace_text' }>): string {
  const parts = text.split(edit.oldText);
  if (parts.length !== 2) {
    return '[E_INVALID_PATCH] replace_text requires one unique exact occurrence';
  }
  return parts.join(edit.newText);
}

export class FilesystemPiClient implements PiClient {
  async read({ path, offset = 1, limit = 2000 }: ReadParams): Promise<string> {
    const lines = await loadLines(path);
    const slice = lines.slice(offset - 1, offset - 1 + limit);
    return formatAnchors(slice, offset);
  }

  async edit({ path, edits }: EditParams): Promise<string> {
    let lines = await loadLines(path);
    let text = joinLines(lines);

    for (const edit of edits) {
      if (edit.op === 'replace_text') {
        const replaced = applyReplaceText(text, edit);
        if (replaced.startsWith('[E_INVALID_PATCH]')) return replaced;
        text = replaced;
        lines = splitLines(text);
        continue;
      }

      const replaced = applyReplaceLike(lines, edit);
      if (typeof replaced === 'string') return replaced;
      lines = replaced;
      text = joinLines(lines);
    }

    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, text, 'utf8');
    return formatAnchors(lines);
  }
}
