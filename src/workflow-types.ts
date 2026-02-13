import { z } from 'zod';

export interface WorkflowEntry {
  id: string;
  type: 'task' | 'decision' | 'insight';
  title: string;
  content: string;
  status: 'active' | 'done' | 'archived';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowStore {
  version: 1;
  project: string;
  entries: WorkflowEntry[];
}

export const WorkflowLogInput = {
  type: z.enum(['task', 'decision', 'insight']).describe(
    'Entry type: "task" for work items, "decision" for architecture/design choices, "insight" for discovered knowledge or pitfalls',
  ),
  title: z.string().describe('Short title for this entry, used as upsert key'),
  content: z.string().describe('Detailed description'),
  tags: z.array(z.string()).optional().describe('Optional tags for categorization'),
};

export const WorkflowListInput = {
  type: z.enum(['task', 'decision', 'insight']).optional().describe('Filter by entry type'),
  status: z.enum(['active', 'done', 'archived']).optional().describe('Filter by status. Defaults to "active"'),
};

export const WorkflowDoneInput = {
  id: z.string().describe('The UUID of the workflow entry to mark as done'),
};
