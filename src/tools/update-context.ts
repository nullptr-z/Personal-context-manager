import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ContextStorage } from '../storage.js';
import { UpdateContextInput } from '../types.js';

export function registerUpdateContextTool(
  server: McpServer,
  storage: ContextStorage,
): void {
  server.registerTool('update_context', {
    description:
      'Add or update a personal context entry. PROACTIVE: When the user mentions personal preferences, habits, facts about themselves, or anything worth remembering long-term, AUTOMATICALLY call this tool to save it WITHOUT being asked. Examples: food preferences, daily routines, tech stack, work info, health conditions, hobbies, etc. If an entry with the same key already exists, it will be updated. CONFLICT RESOLUTION: Before creating a new entry, use get_context or list_contexts to check if a similar entry already exists. If found, reuse its exact key to update it instead of creating a duplicate. If the new information CONTRADICTS an existing entry (e.g. user used to like tofu but now dislikes it), you MUST use delete_context to remove the outdated entry, then create/update the correct one. Do NOT leave contradictory entries coexisting. CATEGORIZATION: Always provide a category to classify the entry. Infer the category from content automatically. Use lowercase English names such as: work, personal, health, tech, finance, learning, preference. You may create new category names when none of the above fit. TAGS: Always include both English and Chinese generic/parent-category tags for better searchability. For example, if the user likes shrimp, tags should include both "food" and "食物", "shrimp" and "虾".',
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
