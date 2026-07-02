import { Type } from 'typebox';
import { FilesystemPiClient } from './filesystem-client.js';
import { SmartEditSession } from './smart-edit.js';

export default function (pi: any) {
  pi.registerTool({
    name: 'smart_edit',
    label: 'Smart Edit',
    description: 'Pi-oriented smart editing with stale-anchor recovery and semantic helpers',
    parameters: Type.Object({
      path: Type.String({ description: 'File path' }),
      mode: Type.String({ description: 'replace_unique | replace_between | anchored_retry' }),
      oldText: Type.Optional(Type.String()),
      newText: Type.Optional(Type.String()),
      startContent: Type.Optional(Type.String()),
      endContent: Type.Optional(Type.String()),
      lines: Type.Optional(Type.Array(Type.String())),
      op: Type.Optional(Type.String()),
      pos: Type.Optional(Type.String()),
      end: Type.Optional(Type.String()),
    }),
    async execute(_toolCallId: string, params: any) {
      const session = new SmartEditSession(new FilesystemPiClient());

      if (params.mode === 'replace_unique') {
        return {
          content: [{ type: 'text', text: await session.replaceUnique(params.path, params.oldText, params.newText) }],
          details: { mode: params.mode, path: params.path },
        };
      }

      if (params.mode === 'replace_between') {
        return {
          content: [
            {
              type: 'text',
              text: await session.replaceBetween(
                params.path,
                params.startContent,
                params.endContent,
                params.lines ?? [],
              ),
            },
          ],
          details: { mode: params.mode, path: params.path },
        };
      }

      if (params.mode === 'anchored_retry') {
        return {
          content: [
            {
              type: 'text',
              text: await session.replaceAnchoredWithRetry(params.path, {
                op: params.op ?? 'replace',
                pos: params.pos,
                end: params.end,
                lines: params.lines ?? [],
              }),
            },
          ],
          details: { mode: params.mode, path: params.path },
        };
      }

      throw new Error(`Unsupported smart_edit mode: ${params.mode}`);
    },
  });
}
