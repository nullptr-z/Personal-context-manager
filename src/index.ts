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

const storage = new ContextStorage();

registerUpdateContextTool(server, storage);
registerGetContextTool(server, storage);
registerListContextsTool(server, storage);
registerDeleteContextTool(server, storage);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Personal Context Manager MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
