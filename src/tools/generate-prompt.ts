import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { WorkflowStorage } from '../workflow-storage.js';
import { z } from 'zod';
import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export function buildPrompt(hasWorkflow: boolean): string {
  const lines: string[] = [];

  lines.push(`# Personal Context Manager (PCM)`);
  lines.push(``);
  lines.push(`You have access to a Personal Context Manager MCP server that provides persistent memory across conversations. Use it to remember user preferences, track project workflow, and deliver personalized assistance.`);
  lines.push(``);

  lines.push(`## Personal Memory Tools`);
  lines.push(``);
  lines.push(`| Tool | When to use |`);
  lines.push(`|------|-------------|`);
  lines.push(`| \`update_context\` | User reveals personal info (preferences, habits, facts). Auto-save without being asked. Upserts by key — check existing entries first to avoid duplicates. |`);
  lines.push(`| \`get_context\` | Search memory by keyword. Call proactively at the start of coding tasks and when user mentions code quality/style/conventions. |`);
  lines.push(`| \`list_contexts\` | List all stored entries. Use to review what you already know before saving new entries. |`);
  lines.push(`| \`delete_context\` | Delete an entry by ID. Use when user asks to forget something or info is outdated/contradicted. |`);
  lines.push(``);

  lines.push(`### Proactive triggers`);
  lines.push(``);
  lines.push(`**Save** when user message contains: "like", "love", "prefer", "hate", "always", "never", "I am", "I use", "my...is", "喜欢", "讨厌", "偏好", "习惯", "每天", "总是", "从不", "我是", "我用".`);
  lines.push(``);
  lines.push(`**Search** when user message contains: "check", "review", "convention", "lint", "format", "best practice", "检查", "规范", "风格", "命名", "写法", "单测".`);
  lines.push(``);

  if (hasWorkflow) {
    lines.push(`## Project Workflow Tools`);
    lines.push(``);
    lines.push(`Workflow entries are scoped to the current git project and auto-synced to the project CLAUDE.md.`);
    lines.push(``);
    lines.push(`| Tool | When to use |`);
    lines.push(`|------|-------------|`);
    lines.push(`| \`workflow_log\` | Log a task, decision, or insight. Auto-call when: (1) user requests a multi-step task → type "task", (2) a design choice is made → type "decision", (3) you discover something non-obvious → type "insight". |`);
    lines.push(`| \`workflow_list\` | List workflow entries. Call at the START of every conversation to load project context. |`);
    lines.push(`| \`workflow_done\` | Mark a workflow entry as done when a task is completed. |`);
    lines.push(``);
  }

  lines.push(`## Guidelines`);
  lines.push(``);
  lines.push(`- Always check existing entries before saving to avoid duplicates.`);
  lines.push(`- Include both EN and ZH tags when saving (e.g. "food" + "食物").`);
  lines.push(`- Auto-infer category (work/personal/health/tech/preference/etc).`);
  lines.push(`- Delete contradicted entries before updating with new info.`);
  if (hasWorkflow) {
    lines.push(`- Only log workflow entries that would be useful in a FUTURE conversation. Skip ephemeral details.`);
  }

  return lines.join('\n');
}

function savePromptToFile(filePath: string, prompt: string): string {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  if (existsSync(filePath)) {
    const existing = readFileSync(filePath, 'utf-8');
    const pcmStart = existing.indexOf('# Personal Context Manager (PCM)');
    if (pcmStart !== -1) {
      const afterStart = existing.indexOf('\n', pcmStart);
      const nextHeading = existing.slice(afterStart + 1).search(/^# [^#]/m);
      const pcmEnd = nextHeading === -1 ? existing.length : afterStart + 1 + nextHeading;
      const updated = existing.slice(0, pcmStart) + prompt + '\n' + existing.slice(pcmEnd);
      writeFileSync(filePath, updated);
      return `已替换 ${filePath} 中的 PCM 模块`;
    } else {
      appendFileSync(filePath, '\n\n' + prompt + '\n');
      return `已追加到 ${filePath}`;
    }
  } else {
    writeFileSync(filePath, prompt + '\n');
    return `已写入 ${filePath}`;
  }
}

export function registerGeneratePromptTool(
  server: McpServer,
  workflowStorage: WorkflowStorage,
): void {
  server.registerTool('generate_prompt', {
    description:
      'Generate the PCM system prompt and optionally save it to a file (e.g. CLAUDE.md). '
      + 'If output_path is provided, writes/replaces the PCM section in that file. '
      + 'If omitted, returns the prompt text directly.',
    inputSchema: {
      output_path: z.string().optional().describe('File path to save the prompt to. If the file already contains a PCM section, it will be replaced. If omitted, returns prompt as text.'),
    },
  }, async (args) => {
    const hasWorkflow = workflowStorage.isAvailable();
    const prompt = buildPrompt(hasWorkflow);

    if (args.output_path) {
      const message = savePromptToFile(args.output_path, prompt);
      return {
        content: [{ type: 'text' as const, text: message }],
      };
    }

    return {
      content: [{ type: 'text' as const, text: prompt }],
    };
  });
}
