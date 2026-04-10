import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ContextStorage } from '../storage.js';
import { GetContextInput } from '../types.js';

export function registerGetContextTool(
  server: McpServer,
  storage: ContextStorage,
): void {
  server.registerTool('get_context', {
    description:
      'Search personal memory by keyword. Returns stored user preferences, habits, and facts sorted by most recently updated. '
      + 'PROACTIVE: Auto-call at the START of coding tasks to retrieve relevant conventions, and when user mentions code quality/style/review. '
      + 'Triggers — EN: "check/review/convention/lint/format/best practice" ZH: "检查/规范/风格/命名/写法/单测". '
      + 'Extract topic keywords from user message to search (e.g. "单测" → search "测试").',
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
