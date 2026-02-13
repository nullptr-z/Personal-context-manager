#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ContextStorage } from './storage.js';
import { registerUpdateContextTool } from './tools/update-context.js';
import { registerGetContextTool } from './tools/get-context.js';
import { registerListContextsTool } from './tools/list-contexts.js';
import { registerDeleteContextTool } from './tools/delete-context.js';

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

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Personal Context Manager MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
