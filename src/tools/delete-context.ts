import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ContextStorage } from '../storage.js';
import { DeleteContextInput } from '../types.js';

export function registerDeleteContextTool(
  server: McpServer,
  storage: ContextStorage,
): void {
  server.registerTool('delete_context', {
    description: 'Delete a personal context entry by its ID.',
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
