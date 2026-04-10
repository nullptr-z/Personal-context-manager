import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ContextStorage } from '../storage.js';
import { ListContextsInput } from '../types.js';

export function registerListContextsTool(
  server: McpServer,
  storage: ContextStorage,
): void {
  server.registerTool('list_contexts', {
    description:
      'List all entries in personal memory. Returns summary of stored user preferences, habits, and facts.',
    inputSchema: ListContextsInput,
  }, async () => {
    const entries = storage.list();

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              status: 'ok',
              totalEntries: entries.length,
              entries: entries.map((e) => ({
                id: e.id,
                key: e.key,
                value:
                  e.value.length > 100
                    ? e.value.substring(0, 100) + '...'
                    : e.value,
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
