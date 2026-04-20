#!/usr/bin/env node

import { createInterface } from 'readline';
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
import { buildPrompt, registerGeneratePromptTool } from './tools/generate-prompt.js';

const args = process.argv.slice(2);
let dataDir: string | undefined;
const dataDirIdx = args.indexOf('--data-dir');
if (dataDirIdx !== -1 && args[dataDirIdx + 1]) {
  dataDir = args[dataDirIdx + 1];
}

const workflowStorage = new WorkflowStorage(dataDir);

if (args.includes('--prompt')) {
  runPromptCli();
} else {
  runMcpServer();
}

function runPromptCli(): void {
  const hasWorkflow = workflowStorage.isAvailable();
  const prompt = buildPrompt(hasWorkflow);

  const homeDir = process.env.HOME || process.env.USERPROFILE || '~';
  const cwd = process.cwd();
  const options = [
    { label: `~/.claude/CLAUDE.md (全局)`, path: `${homeDir}/.claude/CLAUDE.md` },
    { label: `${cwd}/CLAUDE.md (当前项目)`, path: `${cwd}/CLAUDE.md` },
    { label: `stdout (仅打印)`, path: '' },
  ];

  console.log('\n生成的 Prompt 将告诉 AI 如何使用 PCM 工具。\n');
  console.log('保存到哪里？');
  options.forEach((opt, i) => console.log(`  ${i + 1}. ${opt.label}`));
  console.log('');

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  rl.question('请选择 [1/2/3]: ', (answer: string) => {
    if (!answer.trim() || answer.trim() === '3') {
      console.log('\n' + prompt);
    } else {
      const choice = parseInt(answer.trim(), 10);
      const selected = options[choice - 1];
      if (selected?.path) {
        console.log('\n' + prompt);
        console.log(`\n→ 请将以上内容粘贴到 ${selected.path}`);
      } else {
        console.log('\n' + prompt);
      }
    }

    rl.close();
    process.exit(0);
  });
}

function runMcpServer(): void {
  const server = new McpServer({
    name: 'personal-context-manager',
    version: '1.0.0',
  });

  const storage = new ContextStorage(dataDir);

  registerUpdateContextTool(server, storage);
  registerGetContextTool(server, storage);
  registerListContextsTool(server, storage);
  registerDeleteContextTool(server, storage);

  if (workflowStorage.isAvailable()) {
    registerWorkflowLogTool(server, workflowStorage);
    registerWorkflowListTool(server, workflowStorage);
    registerWorkflowDoneTool(server, workflowStorage);
  }

  registerGeneratePromptTool(server, workflowStorage);

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
}
