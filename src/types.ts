import { z } from 'zod';

export interface ContextEntry {
  id: string;
  key: string;
  value: string;
  category?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ContextStore {
  version: 1;
  entries: ContextEntry[];
}

export const UpdateContextInput = {
  key: z.string().describe('Short label for this context, e.g. "tech_stack", "wake_time"'),
  value: z.string().describe('The context content to store'),
  category: z.string().optional().describe('Category for this entry. AI should auto-infer from content. Use lowercase English names such as: work, personal, health, tech, finance, learning, preference. Create new names when none fit.'),
  tags: z.array(z.string()).optional().describe('Optional tags for easier searching'),
};

export const GetContextInput = {
  query: z.string().optional().describe('Keyword to search across key, value, and tags'),
};

export const ListContextsInput = {};

export const DeleteContextInput = {
  id: z.string().describe('The UUID of the context entry to delete'),
};
