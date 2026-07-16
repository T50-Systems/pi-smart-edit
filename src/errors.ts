export const SmartEditErrorCode = {
  InvalidInput: 'E_INVALID_INPUT',
  SchemaInvalid: 'E_SCHEMA_INVALID',
  BoundaryNotFound: 'E_BOUNDARY_NOT_FOUND',
  StaleRecoveryFailed: 'E_STALE_RECOVERY_FAILED',
  FilesystemNotFound: 'E_FILESYSTEM_NOT_FOUND',
  FilesystemPermission: 'E_FILESYSTEM_PERMISSION',
  FilesystemIo: 'E_FILESYSTEM_IO',
  QueueFailure: 'E_QUEUE_FAILURE',
  CoreFailure: 'E_CORE_FAILURE',
  StaleAnchor: 'E_STALE_ANCHOR',
  InvalidPatch: 'E_INVALID_PATCH',
  BadReference: 'E_BAD_REF',
  RangeOutOfBounds: 'E_RANGE_OOB',
  BadOperation: 'E_BAD_OP',
  EditConflict: 'E_EDIT_CONFLICT',
  NoMatch: 'E_NO_MATCH',
  MultipleMatches: 'E_MULTI_MATCH',
  WouldEmpty: 'E_WOULD_EMPTY',
} as const;

export type SmartEditErrorCode = (typeof SmartEditErrorCode)[keyof typeof SmartEditErrorCode];

export type SmartEditErrorCategory = 'input' | 'policy' | 'filesystem' | 'queue' | 'core';

export type SmartEditErrorDetails = Readonly<{
  code: SmartEditErrorCode;
  category: SmartEditErrorCategory;
}>;

const coreCodes = new Set<SmartEditErrorCode>([
  SmartEditErrorCode.StaleAnchor,
  SmartEditErrorCode.InvalidPatch,
  SmartEditErrorCode.BadReference,
  SmartEditErrorCode.RangeOutOfBounds,
  SmartEditErrorCode.BadOperation,
  SmartEditErrorCode.EditConflict,
  SmartEditErrorCode.NoMatch,
  SmartEditErrorCode.MultipleMatches,
  SmartEditErrorCode.WouldEmpty,
]);

function categoryFor(code: SmartEditErrorCode): SmartEditErrorCategory {
  if (code === SmartEditErrorCode.InvalidInput || code === SmartEditErrorCode.SchemaInvalid) return 'input';
  if (code === SmartEditErrorCode.BoundaryNotFound || code === SmartEditErrorCode.StaleRecoveryFailed) return 'policy';
  if (
    code === SmartEditErrorCode.FilesystemNotFound ||
    code === SmartEditErrorCode.FilesystemPermission ||
    code === SmartEditErrorCode.FilesystemIo
  ) return 'filesystem';
  if (code === SmartEditErrorCode.QueueFailure) return 'queue';
  return 'core';
}

export class SmartEditError extends Error {
  readonly code: SmartEditErrorCode;
  readonly category: SmartEditErrorCategory;
  readonly details: SmartEditErrorDetails;

  constructor(code: SmartEditErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SmartEditError';
    this.code = code;
    this.category = categoryFor(code);
    this.details = Object.freeze({ code, category: this.category });
  }
}

function codeFromMessage(message: string): SmartEditErrorCode | undefined {
  const rawCode = /^\[(E_[A-Z0-9_]+)\]/.exec(message)?.[1];
  if (!rawCode) return undefined;
  return coreCodes.has(rawCode as SmartEditErrorCode)
    ? rawCode as SmartEditErrorCode
    : SmartEditErrorCode.CoreFailure;
}

function nodeErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
  return typeof error.code === 'string' ? error.code : undefined;
}

export function normalizeSmartEditError(
  error: unknown,
  fallbackCode: SmartEditErrorCode = SmartEditErrorCode.CoreFailure,
): SmartEditError {
  if (error instanceof SmartEditError) return error;

  const message = error instanceof Error ? error.message : String(error);
  const embeddedCode = codeFromMessage(message);
  if (embeddedCode) return new SmartEditError(embeddedCode, message, { cause: error });

  const systemCode = nodeErrorCode(error);
  if (systemCode === 'ENOENT') {
    return new SmartEditError(SmartEditErrorCode.FilesystemNotFound, message, { cause: error });
  }
  if (systemCode === 'EACCES' || systemCode === 'EPERM') {
    return new SmartEditError(SmartEditErrorCode.FilesystemPermission, message, { cause: error });
  }

  return new SmartEditError(fallbackCode, message, { cause: error });
}

export function normalizeSmartEditResult(result: string): string {
  const embeddedCode = codeFromMessage(result);
  if (embeddedCode) throw new SmartEditError(embeddedCode, result);
  return result;
}

export function formatSmartEditError(error: unknown): string {
  const normalized = normalizeSmartEditError(error);
  return normalized.message.startsWith(`[${normalized.code}]`)
    ? normalized.message
    : `[${normalized.code}] ${normalized.message}`;
}
