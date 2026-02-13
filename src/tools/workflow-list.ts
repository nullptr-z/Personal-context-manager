import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { WorkflowStorage } from '../workflow-storage.js';
import { WorkflowListInput } from '../workflow-types.js';

export function registerWorkflowListTool(
  server: McpServer,
  storage: WorkflowStorage,
): void {
  server.registerTool('workflow_list', {
    description:
      'List workflow entries for the current git project. Returns entries filtered by type and/or status (defaults to active). PROACTIVE: Call this tool at the START of every conversation to load project context — understand what tasks are in progress, what decisions have been made, and what insights have been recorded.',
    inputSchema: WorkflowListInput,
  }, async (args) => {
    const project = storage.getProjectInfo();
    if (!project) {
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ status: 'error', message: 'No git project detected in current directory' }, null, 2),
        }],
        isError: true,
      };
    }

    const results = storage.list(args.type, args.status);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          status: 'ok',
          project: project.id,
          count: results.length,
          entries: results.map((e) => ({
            id: e.id,
            type: e.type,
            title: e.title,
            content: e.content.length > 200 ? e.content.substring(0, 200) + '...' : e.content,
            status: e.status,
            tags: e.tags,
          })),
        }, null, 2),
      }],
    };
  });
}
