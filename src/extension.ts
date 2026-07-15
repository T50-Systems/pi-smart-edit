import { withFileMutationQueue } from '@earendil-works/pi-coding-agent';
import { resolve } from 'node:path';
import { Type, type Static } from 'typebox';
import { FilesystemPiClient } from './filesystem-client.js';
import { SmartEditSession } from './smart-edit.js';

const strictObjectOptions = { additionalProperties: false } as const;

const anchoredReplace = Type.Object(
  {
    path: Type.String({ description: 'File path' }),
    mode: Type.Literal('anchored_retry'),
    op: Type.Literal('replace'),
    pos: Type.String(),
    end: Type.Optional(Type.String()),
    lines: Type.Array(Type.String()),
  },
  strictObjectOptions,
);

const anchoredInsertion = (op: 'append' | 'prepend') =>
  Type.Object(
    {
      path: Type.String({ description: 'File path' }),
      mode: Type.Literal('anchored_retry'),
      op: Type.Literal(op),
      pos: Type.String(),
      lines: Type.Array(Type.String()),
    },
    strictObjectOptions,
  );

export const smartEditParameters = Type.Union([
  Type.Object(
    {
      path: Type.String({ description: 'File path' }),
      mode: Type.Literal('replace_unique'),
      oldText: Type.String(),
      newText: Type.String(),
    },
    strictObjectOptions,
  ),
  Type.Object(
    {
      path: Type.String({ description: 'File path' }),
      mode: Type.Literal('replace_between'),
      startContent: Type.String(),
      endContent: Type.String(),
      lines: Type.Array(Type.String()),
    },
    strictObjectOptions,
  ),
  anchoredReplace,
  anchoredInsertion('append'),
  anchoredInsertion('prepend'),
]);

export type SmartEditParameters = Static<typeof smartEditParameters>;

type SmartEditTool = {
  name: 'smart_edit';
  label: string;
  description: string;
  parameters: typeof smartEditParameters;
  execute(
    toolCallId: string,
    params: SmartEditParameters,
    signal: AbortSignal | undefined,
    onUpdate: unknown,
    ctx: SmartEditContext,
  ): Promise<{
    content: Array<{ type: 'text'; text: string }>;
    details: { mode: SmartEditParameters['mode']; path: string };
  }>;
};

type SmartEditContext = {
  cwd: string;
};

export type SmartEditExtensionApi = {
  registerTool(tool: SmartEditTool): void;
};

export default function (pi: SmartEditExtensionApi) {
  pi.registerTool({
    name: 'smart_edit',
    label: 'Smart Edit',
    description: 'Pi-oriented smart editing with stale-anchor recovery and semantic helpers',
    parameters: smartEditParameters,
    async execute(
      _toolCallId: string,
      params: SmartEditParameters,
      _signal: AbortSignal | undefined,
      _onUpdate: unknown,
      ctx: SmartEditContext,
    ) {
      const requestedPath = params.path.startsWith('@') ? params.path.slice(1) : params.path;
      const targetPath = resolve(ctx.cwd, requestedPath);

      return withFileMutationQueue(targetPath, async () => {
        const session = new SmartEditSession(new FilesystemPiClient());

        if (params.mode === 'replace_unique') {
          return {
            content: [
              { type: 'text' as const, text: await session.replaceUnique(targetPath, params.oldText, params.newText) },
            ],
            details: { mode: params.mode, path: params.path },
          };
        }

        if (params.mode === 'replace_between') {
          return {
            content: [
              {
                type: 'text' as const,
                text: await session.replaceBetween(
                  targetPath,
                  params.startContent,
                  params.endContent,
                  params.lines,
                ),
              },
            ],
            details: { mode: params.mode, path: params.path },
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: await session.replaceAnchoredWithRetry(targetPath, {
                op: params.op,
                pos: params.pos,
                end: params.op === 'replace' ? params.end : undefined,
                lines: params.lines,
              }),
            },
          ],
          details: { mode: params.mode, path: params.path },
        };
      });
    },
  });
}
