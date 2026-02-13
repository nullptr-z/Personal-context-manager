import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { WorkflowEntry, WorkflowStore } from './workflow-types.js';

const START_MARKER = '<!-- project-workflow-start -->';
const END_MARKER = '<!-- project-workflow-end -->';
const MAX_DONE_IN_SYNC = 5;

export interface WorkflowUpsertResult {
  entry: WorkflowEntry;
  action: 'created' | 'updated';
}

function findProjectRoot(startDir: string): string | null {
  let dir = startDir;
  while (dir !== '/') {
    if (existsSync(join(dir, '.git'))) return dir;
    dir = dirname(dir);
  }
  return null;
}

function getGitRemote(projectRoot: string): string | null {
  try {
    return execSync('git remote get-url origin', {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}

function remoteToProjectId(remote: string): string {
  // git@github.com:user/repo.git → repo
  // https://github.com/user/repo.git → repo
  const match = remote.match(/\/([^/]+?)(?:\.git)?$/);
  if (match) return match[1].toLowerCase();
  // fallback for ssh short form: git@github.com:user/repo.git
  const sshMatch = remote.match(/:.*\/([^/]+?)(?:\.git)?$/);
  return (sshMatch?.[1] ?? 'unknown').toLowerCase();
}

export class WorkflowStorage {
  private filePath: string | null = null;
  private projectRoot: string | null = null;
  private projectId: string | null = null;
  private projectRemote: string | null = null;

  constructor(dataDir?: string) {
    this.projectRoot = findProjectRoot(process.cwd());
    if (!this.projectRoot) return;

    this.projectRemote = getGitRemote(this.projectRoot);
    if (!this.projectRemote) return;

    this.projectId = remoteToProjectId(this.projectRemote);

    const baseDir =
      dataDir ??
      process.env.CONTEXT_MANAGER_DATA_DIR ??
      join(homedir(), '.personal-context-manager');

    this.filePath = join(baseDir, 'workflows', this.projectId, 'workflow.json');
  }

  isAvailable(): boolean {
    return this.filePath !== null;
  }

  getProjectInfo(): { remote: string; id: string; root: string } | null {
    if (!this.projectRemote || !this.projectId || !this.projectRoot) return null;
    return { remote: this.projectRemote, id: this.projectId, root: this.projectRoot };
  }

  private ensureFile(): void {
    if (!this.filePath) throw new Error('Workflow storage not available (no git project detected)');
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    if (!existsSync(this.filePath)) {
      const empty: WorkflowStore = { version: 1, project: this.projectRemote!, entries: [] };
      writeFileSync(this.filePath, JSON.stringify(empty, null, 2), 'utf-8');
    }
  }

  private readStore(): WorkflowStore {
    this.ensureFile();
    const raw = readFileSync(this.filePath!, 'utf-8').trim();
    if (!raw) {
      const empty: WorkflowStore = { version: 1, project: this.projectRemote!, entries: [] };
      this.writeStore(empty);
      return empty;
    }
    return JSON.parse(raw) as WorkflowStore;
  }

  private writeStore(store: WorkflowStore): void {
    this.ensureFile();
    const tmp = this.filePath! + '.tmp';
    writeFileSync(tmp, JSON.stringify(store, null, 2), 'utf-8');
    renameSync(tmp, this.filePath!);
  }

  upsert(
    type: WorkflowEntry['type'],
    title: string,
    content: string,
    tags?: string[],
  ): WorkflowUpsertResult {
    const store = this.readStore();
    const now = new Date().toISOString();
    const existing = store.entries.find((e) => e.title === title && e.type === type);

    if (existing) {
      existing.content = content;
      existing.tags = tags ?? existing.tags;
      existing.updatedAt = now;
      this.writeStore(store);
      this.syncToClaudeMd();
      return { entry: existing, action: 'updated' };
    }

    const entry: WorkflowEntry = {
      id: randomUUID(),
      type,
      title,
      content,
      status: 'active',
      tags: tags ?? [],
      createdAt: now,
      updatedAt: now,
    };
    store.entries.push(entry);
    this.writeStore(store);
    this.syncToClaudeMd();
    return { entry, action: 'created' };
  }

  markDone(id: string): WorkflowEntry | null {
    const store = this.readStore();
    const entry = store.entries.find((e) => e.id === id);
    if (!entry) return null;
    entry.status = 'done';
    entry.updatedAt = new Date().toISOString();
    this.writeStore(store);
    this.syncToClaudeMd();
    return entry;
  }

  list(type?: string, status?: string): WorkflowEntry[] {
    const store = this.readStore();
    let results = store.entries;

    const filterStatus = status ?? 'active';
    results = results.filter((e) => e.status === filterStatus);

    if (type) {
      results = results.filter((e) => e.type === type);
    }

    return results.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  private syncToClaudeMd(): void {
    if (!this.projectRoot) return;

    const claudeMdPath = join(this.projectRoot, 'CLAUDE.md');
    const store = this.readStore();

    const active = store.entries.filter((e) => e.status === 'active');
    const done = store.entries
      .filter((e) => e.status === 'done')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, MAX_DONE_IN_SYNC);

    const activeTasks = active.filter((e) => e.type === 'task');
    const decisions = active.filter((e) => e.type === 'decision');
    const insights = active.filter((e) => e.type === 'insight');

    // Build markdown
    const lines: string[] = [START_MARKER, '# Project Workflow', ''];

    if (activeTasks.length > 0) {
      lines.push('## Active Tasks', '');
      for (const e of activeTasks) {
        lines.push(`- **${e.title}**: ${e.content}`);
      }
      lines.push('');
    }

    if (decisions.length > 0) {
      lines.push('## Decisions', '');
      for (const e of decisions) {
        lines.push(`- **${e.title}**: ${e.content}`);
      }
      lines.push('');
    }

    if (insights.length > 0) {
      lines.push('## Insights', '');
      for (const e of insights) {
        lines.push(`- **${e.title}**: ${e.content}`);
      }
      lines.push('');
    }

    if (done.length > 0) {
      lines.push('## Done', '');
      for (const e of done) {
        lines.push(`- ~~${e.title}~~`);
      }
      lines.push('');
    }

    lines.push(END_MARKER);
    const content = lines.join('\n');

    // No active or done entries → remove block
    if (active.length === 0 && done.length === 0) {
      if (existsSync(claudeMdPath)) {
        let text = readFileSync(claudeMdPath, 'utf-8');
        const startIdx = text.indexOf(START_MARKER);
        const endIdx = text.indexOf(END_MARKER);
        if (startIdx !== -1 && endIdx !== -1) {
          const before = text.substring(0, startIdx).replace(/\n+$/, '');
          const after = text.substring(endIdx + END_MARKER.length).replace(/^\n+/, '');
          text = before + (after ? '\n' + after : '');
          writeFileSync(claudeMdPath, text, 'utf-8');
        }
      }
      return;
    }

    // Write or update CLAUDE.md
    if (!existsSync(claudeMdPath)) {
      writeFileSync(claudeMdPath, content + '\n', 'utf-8');
      return;
    }

    let text = readFileSync(claudeMdPath, 'utf-8');
    const startIdx = text.indexOf(START_MARKER);
    const endIdx = text.indexOf(END_MARKER);

    if (startIdx !== -1 && endIdx !== -1) {
      // Replace existing block
      const before = text.substring(0, startIdx);
      const after = text.substring(endIdx + END_MARKER.length);
      text = before + content + after;
      writeFileSync(claudeMdPath, text, 'utf-8');
    } else {
      // Append
      text = text.replace(/\n*$/, '\n\n') + content + '\n';
      writeFileSync(claudeMdPath, text, 'utf-8');
    }
  }
}
