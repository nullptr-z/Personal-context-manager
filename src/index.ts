#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ContextStorage } from './storage.js';
import { registerUpdateContextTool } from './tools/update-context.js';
import { registerGetContextTool } from './tools/get-context.js';
import { registerListContextsTool } from './tools/list-contexts.js';
import { registerDeleteContextTool } from './tools/delete-context.js';
import { WorkflowStorage } from './workflow-storage.js';
import { registerWorkflowLogTool } from './tools/workflow-log.js';
import { registerWorkflowListTool } from './tools/workflow-list.js';
import { registerWorkflowDoneTool } from './tools/workflow-done.js';

const server = new McpServer({
  name: 'personal-context-manager',
  version: '1.0.0',
});

const args = process.argv.slice(2);
let dataDir: string | undefined;
const dataDirIdx = args.indexOf('--data-dir');
if (dataDirIdx !== -1 && args[dataDirIdx + 1]) {
  dataDir = args[dataDirIdx + 1];
}

const storage = new ContextStorage(dataDir);

registerUpdateContextTool(server, storage);
registerGetContextTool(server, storage);
registerListContextsTool(server, storage);
registerDeleteContextTool(server, storage);

// Workflow tools (project-scoped)
const workflowStorage = new WorkflowStorage(dataDir);
if (workflowStorage.isAvailable()) {
  registerWorkflowLogTool(server, workflowStorage);
  registerWorkflowListTool(server, workflowStorage);
  registerWorkflowDoneTool(server, workflowStorage);
}

// Resource: expose context summary so AI can proactively see what memories exist
server.registerResource(
  'context-summary',
  'context://summary',
  { description: 'Summary of all stored personal context entries (keys and tags)' },
  async (uri) => {
    const entries = storage.list();
    if (entries.length === 0) {
      return {
        contents: [{ uri: uri.href, mimeType: 'text/plain', text: 'No personal context entries stored yet.' }],
      };
    }

    const lines = entries.map((e) => {
      const tags = e.tags.length > 0 ? ` [${e.tags.join(', ')}]` : '';
      return `- ${e.key}${tags}`;
    });

    return {
      contents: [{
        uri: uri.href,
        mimeType: 'text/plain',
        text: `Personal Context (${entries.length} entries):\n${lines.join('\n')}`,
      }],
    };
  },
);

// Resource: expose workflow summary so AI can see project context
if (workflowStorage.isAvailable()) {
  const projectInfo = workflowStorage.getProjectInfo();
  server.registerResource(
    'workflow-summary',
    'workflow://summary',
    { description: `Active workflow entries for project "${projectInfo?.id}": tasks in progress, architecture decisions, and discovered insights. Read this at conversation start to understand project context.` },
    async (uri) => {
      const active = workflowStorage.list();
      if (active.length === 0) {
        return {
          contents: [{ uri: uri.href, mimeType: 'text/plain', text: 'No active workflow entries for this project.' }],
        };
      }

      const sections: string[] = [];
      const tasks = active.filter((e) => e.type === 'task');
      const decisions = active.filter((e) => e.type === 'decision');
      const insights = active.filter((e) => e.type === 'insight');

      if (tasks.length > 0) {
        sections.push('## Active Tasks');
        for (const e of tasks) sections.push(`- **${e.title}**: ${e.content}`);
      }
      if (decisions.length > 0) {
        sections.push('## Decisions');
        for (const e of decisions) sections.push(`- **${e.title}**: ${e.content}`);
      }
      if (insights.length > 0) {
        sections.push('## Insights');
        for (const e of insights) sections.push(`- **${e.title}**: ${e.content}`);
      }

      return {
        contents: [{
          uri: uri.href,
          mimeType: 'text/plain',
          text: `Project Workflow (${active.length} active entries):\n\n${sections.join('\n')}`,
        }],
      };
    },
  );
}

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Personal Context Manager MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
