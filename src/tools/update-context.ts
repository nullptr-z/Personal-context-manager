import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ContextStorage } from '../storage.js';
import { UpdateContextInput } from '../types.js';

export function registerUpdateContextTool(
  server: McpServer,
  storage: ContextStorage,
): void {
  server.registerTool('update_context', {
    description:
      'Personal memory system: save user preferences, habits, and facts for personalized assistance across conversations. '
      + 'PROACTIVE: Auto-call when user reveals personal info. '
      + 'Triggers — EN: "like/love/prefer/hate/always/never/I am/I use/my...is" ZH: "喜欢/讨厌/偏好/习惯/每天/总是/从不/我是/我用". '
      + 'Upserts by key. Check existing entries first to avoid duplicates; delete contradicted entries before updating. '
      + 'Auto-infer category (work/personal/health/tech/preference/etc). '
      + 'Tags: include both EN and ZH (e.g. "food"+"食物").',
    inputSchema: UpdateContextInput,
  }, async (args) => {
    const { entry, action } = storage.upsert(
      args.key,
      args.value,
      args.category,
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
                category: entry.category,
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
