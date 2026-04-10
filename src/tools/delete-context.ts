import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ContextStorage } from '../storage.js';
import { DeleteContextInput } from '../types.js';

export function registerDeleteContextTool(
  server: McpServer,
  storage: ContextStorage,
): void {
  server.registerTool('delete_context', {
    description: 'Delete a personal memory entry by ID. Use when: 1) User asks to forget something. 2) Entry is outdated/contradicted by newer info. Always use get_context or list_contexts first to find the entry ID.',
    inputSchema: DeleteContextInput,
  }, async (args) => {
    const deleted = storage.delete(args.id);

    if (!deleted) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                status: 'error',
                message: `No context entry found with id: ${args.id}`,
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              status: 'ok',
              message: `Context entry ${args.id} deleted.`,
            },
            null,
            2,
          ),
        },
      ],
    };
  });
}
