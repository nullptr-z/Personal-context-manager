import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { WorkflowStorage } from '../workflow-storage.js';
import { WorkflowLogInput } from '../workflow-types.js';

export function registerWorkflowLogTool(
  server: McpServer,
  storage: WorkflowStorage,
): void {
  server.registerTool('workflow_log', {
    description:
      'Log a project workflow entry. PROACTIVE: You MUST automatically call this tool (without being asked) when any of these happen: (1) User requests a multi-step task → log type "task" with what needs doing. (2) A design/architecture choice is made between alternatives → log type "decision" with rationale. (3) You discover something non-obvious and project-specific (e.g. undocumented behavior, workaround needed) → log type "insight". Core question: "Would this be useful in a FUTURE conversation about this project?" If yes, log it. If only relevant now, skip it. WHEN TO LOG each type: type "task" — User requests a multi-step task (not a one-liner fix). Log when starting (what needs doing) and when partially complete (what is done, what remains). Do NOT log trivial single-step changes. type "decision" — A choice was made between alternatives (e.g. Redis vs local cache, library A vs B). Include the rationale: WHY this approach was chosen. Do NOT log obvious defaults with no alternatives considered. type "insight" — Discovered something PROJECT-SPECIFIC that is not obvious from docs or code (e.g. an API has an undocumented rate limit, a specific query is slow, a workaround was needed). Do NOT log general programming knowledge that applies to all projects. If an entry with the same title and type exists, it will be updated (upsert). Data is scoped to the current git project and auto-synced to the project CLAUDE.md.',
    inputSchema: WorkflowLogInput,
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

    const { entry, action } = storage.upsert(args.type, args.title, args.content, args.tags);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          status: 'ok',
          action,
          project: project.id,
          entry: {
            id: entry.id,
            type: entry.type,
            title: entry.title,
            content: entry.content,
            status: entry.status,
            tags: entry.tags,
          },
        }, null, 2),
      }],
    };
  });
}
