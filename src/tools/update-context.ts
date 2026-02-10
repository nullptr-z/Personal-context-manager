import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ContextStorage } from '../storage.js';
import { UpdateContextInput } from '../types.js';

export function registerUpdateContextTool(
  server: McpServer,
  storage: ContextStorage,
): void {
  server.registerTool('update_context', {
    description:
      'Add or update a personal context entry. If an entry with the same key already exists, it will be updated. IMPORTANT: Before creating a new entry, use get_context or list_contexts to check if a similar entry already exists, and reuse its exact key to avoid duplicates.',
    inputSchema: UpdateContextInput,
  }, async (args) => {
    const { entry, action } = storage.upsert(
      args.key,
      args.value,
      args.tags,
    );

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              status: 'ok',
              action,
              entry: {
                key: entry.key,
                value: entry.value,
                tags: entry.tags,
              },
            },
            null,
            2,
          ),
        },
      ],
    };
  });
}
