import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { WorkflowStorage } from '../workflow-storage.js';
import { WorkflowDoneInput } from '../workflow-types.js';

export function registerWorkflowDoneTool(
  server: McpServer,
  storage: WorkflowStorage,
): void {
  server.registerTool('workflow_done', {
    description:
      'Mark a workflow entry as done. Use this when a task is completed or a tracked item is resolved. Use workflow_list first to find the entry ID.',
    inputSchema: WorkflowDoneInput,
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

    const entry = storage.markDone(args.id);
    if (!entry) {
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ status: 'error', message: `No workflow entry found with id: ${args.id}` }, null, 2),
        }],
        isError: true,
      };
    }

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          status: 'ok',
          project: project.id,
          entry: {
            id: entry.id,
            type: entry.type,
            title: entry.title,
            status: entry.status,
          },
        }, null, 2),
      }],
    };
  });
}
