import { FilesystemPiClient as CoreFilesystemPiClient } from 'pi-anchor-edit-core';
import { normalizeSmartEditError, normalizeSmartEditResult, SmartEditErrorCode } from './errors.js';
import type { EditParams, ReadParams } from './types.js';

export class FilesystemPiClient extends CoreFilesystemPiClient {
  override async read(params: ReadParams): Promise<string> {
    try {
      return await super.read(params);
    } catch (error) {
      throw normalizeSmartEditError(error, SmartEditErrorCode.FilesystemIo);
    }
  }

  override async edit(params: EditParams): Promise<string> {
    try {
      return normalizeSmartEditResult(await super.edit(params));
    } catch (error) {
      throw normalizeSmartEditError(error, SmartEditErrorCode.FilesystemIo);
    }
  }
}
