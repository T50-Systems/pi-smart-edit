import { findAnchorByContent, parseReadAnchors, parseStaleAnchorError } from './anchors.js';
import type { EditOp, PiClient, ReplaceLikeEditOp } from './types.js';

export class SmartEditSession {
  constructor(private readonly client: PiClient) {}

  async readFresh(path: string, offset = 1, limit = 400): Promise<string> {
    return this.client.read({ path, offset, limit });
  }

  async replaceUnique(path: string, oldText: string, newText: string): Promise<string> {
    return this.client.edit({
      path,
      edits: [{ op: 'replace_text', oldText, newText }],
    });
  }

  async replaceAnchored(path: string, edit: EditOp): Promise<string> {
    return this.client.edit({ path, edits: [edit] });
  }

  async replaceAnchoredWithRetry(path: string, edit: ReplaceLikeEditOp): Promise<string> {
    const first = await this.client.edit({ path, edits: [edit] });
    const stale = parseStaleAnchorError(first);
    if (!stale.stale) return first;

    if (!edit.pos) {
      throw new Error('Cannot auto-recover a stale edit without a position anchor');
    }

    const originalPosContent = edit.pos.split(':')[1] ?? '';
    const replacement = findAnchorByContent(stale.suggested, originalPosContent);
    if (!replacement) {
      throw new Error(`Stale anchor detected, but no matching recovery anchor was found.\n${first}`);
    }

    const originalEndContent = edit.end?.split(':')[1] ?? '';
    const replacementEnd = edit.end
      ? findAnchorByContent(stale.suggested, originalEndContent)?.raw ?? edit.end
      : undefined;

    return this.client.edit({
      path,
      edits: [
        {
          ...edit,
          pos: replacement.raw,
          end: replacementEnd,
        },
      ],
    });
  }

  async replaceBetween(
    path: string,
    startContent: string,
    endContent: string,
    lines: string[],
  ): Promise<string> {
    const snapshot = await this.readFresh(path);
    const anchors = parseReadAnchors(snapshot);
    const start = findAnchorByContent(anchors, startContent);
    const end = findAnchorByContent(anchors, endContent);

    if (!start || !end) {
      throw new Error(`Unable to find boundary anchors in ${path}`);
    }

    return this.client.edit({
      path,
      edits: [
        {
          op: 'replace',
          pos: start.raw,
          end: end.raw,
          lines,
        },
      ],
    });
  }
}
