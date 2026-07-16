import { findAnchorByContent, parseReadAnchors, parseStaleAnchorError } from './anchors.js';
import {
  normalizeSmartEditError,
  normalizeSmartEditResult,
  SmartEditError,
  SmartEditErrorCode,
  type SmartEditErrorCode as SmartEditErrorCodeValue,
} from './errors.js';
import type { EditOp, EditParams, PiClient, ReplaceLikeEditOp } from './types.js';

export class SmartEditSession {
  constructor(private readonly client: PiClient) {}

  private async edit(params: EditParams, fallbackCode: SmartEditErrorCodeValue = SmartEditErrorCode.CoreFailure): Promise<string> {
    try {
      return normalizeSmartEditResult(await this.client.edit(params));
    } catch (error) {
      throw normalizeSmartEditError(error, fallbackCode);
    }
  }

  async readFresh(path: string, offset = 1, limit = 400): Promise<string> {
    try {
      return await this.client.read({ path, offset, limit });
    } catch (error) {
      throw normalizeSmartEditError(error, SmartEditErrorCode.FilesystemIo);
    }
  }

  async replaceUnique(path: string, oldText: string, newText: string): Promise<string> {
    return this.edit({
      path,
      edits: [{ op: 'replace_text', oldText, newText }],
    });
  }

  async replaceAnchored(path: string, edit: EditOp): Promise<string> {
    return this.edit({ path, edits: [edit] });
  }

  async replaceAnchoredWithRetry(path: string, edit: ReplaceLikeEditOp): Promise<string> {
    let first: string;
    try {
      first = await this.edit({ path, edits: [edit] });
    } catch (error) {
      const normalized = normalizeSmartEditError(error);
      if (normalized.code !== SmartEditErrorCode.StaleAnchor) throw normalized;
      first = normalized.message;
    }

    const stale = parseStaleAnchorError(first);
    if (!stale.stale) return first;

    if (!edit.pos) {
      throw new SmartEditError(
        SmartEditErrorCode.StaleRecoveryFailed,
        'Cannot auto-recover a stale edit without a position anchor',
      );
    }

    const originalPosContent = edit.pos.split(':')[1] ?? '';
    const replacement = findAnchorByContent(stale.suggested, originalPosContent);
    if (!replacement) {
      throw new SmartEditError(
        SmartEditErrorCode.StaleRecoveryFailed,
        `Stale anchor detected, but no matching recovery anchor was found.\n${first}`,
      );
    }

    const originalEndContent = edit.end?.split(':')[1] ?? '';
    const replacementEnd = edit.end
      ? findAnchorByContent(stale.suggested, originalEndContent)?.raw ?? edit.end
      : undefined;

    return this.edit({
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
      throw new SmartEditError(
        SmartEditErrorCode.BoundaryNotFound,
        `Unable to find boundary anchors in ${path}`,
      );
    }

    return this.edit({
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
