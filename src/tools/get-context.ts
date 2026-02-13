import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ContextStorage } from '../storage.js';
import { GetContextInput } from '../types.js';

export function registerGetContextTool(
  server: McpServer,
  storage: ContextStorage,
): void {
  server.registerTool('get_context', {
    description:
      'Search and retrieve personal context entries by keyword. Returns matching entries sorted by most recently updated.',
    inputSchema: GetContextInput,
  }, async (args) => {
    const results = storage.search(args.query);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              status: 'ok',
              count: results.length,
              results: results.map((e) => ({
                id: e.id,
                key: e.key,
                value: e.value,
                category: e.category,
                tags: e.tags,
              })),
            },
            null,
            2,
          ),
        },
      ],
    };
  });
}
