import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import type { ContextEntry, ContextStore } from './types.js';

export interface UpsertResult {
  entry: ContextEntry;
  action: 'created' | 'updated';
}

export class ContextStorage {
  private filePath: string;

  constructor(dataDir?: string) {
    const dir =
      dataDir ??
      process.env.CONTEXT_MANAGER_DATA_DIR ??
      join(homedir(), '.personal-context-manager');
    this.filePath = join(dir, 'contexts.json');
  }

  private ensureFile(): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    if (!existsSync(this.filePath)) {
      const empty: ContextStore = { version: 1, entries: [] };
      writeFileSync(this.filePath, JSON.stringify(empty, null, 2), 'utf-8');
    }
  }

  private readStore(): ContextStore {
    this.ensureFile();
    const raw = readFileSync(this.filePath, 'utf-8').trim();
    if (!raw) {
      const empty: ContextStore = { version: 1, entries: [] };
      this.writeStore(empty);
      return empty;
    }
    return JSON.parse(raw) as ContextStore;
  }

  private writeStore(store: ContextStore): void {
    this.ensureFile();
    const tmp = this.filePath + '.tmp';
    writeFileSync(tmp, JSON.stringify(store, null, 2), 'utf-8');
    renameSync(tmp, this.filePath);
  }

  upsert(
    key: string,
    value: string,
    category?: string,
    tags?: string[],
  ): UpsertResult {
    const store = this.readStore();
    const now = new Date().toISOString();
    const existing = store.entries.find((e) => e.key === key);

    if (existing) {
      existing.value = value;
      existing.category = category ?? existing.category;
      existing.tags = tags ?? existing.tags;
      existing.updatedAt = now;
      this.writeStore(store);
      return { entry: existing, action: 'updated' };
    }

    const entry: ContextEntry = {
      id: randomUUID(),
      key,
      value,
      category,
      tags: tags ?? [],
      createdAt: now,
      updatedAt: now,
    };
    store.entries.push(entry);
    this.writeStore(store);
    return { entry, action: 'created' };
  }

  search(query?: string): ContextEntry[] {
    const store = this.readStore();
    let results = store.entries;

    if (query) {
      const keywords = query.toLowerCase().split(/\s+/).filter(Boolean);
      results = results.filter((e) => {
        const hay = [
          e.key.toLowerCase(),
          e.value.toLowerCase(),
          (e.category ?? '').toLowerCase(),
          ...e.tags.map((t) => t.toLowerCase()),
        ].join(' ');
        return keywords.some((kw) => hay.includes(kw));
      });
    }

    return results.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  list(): ContextEntry[] {
    const store = this.readStore();
    return store.entries.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  delete(id: string): boolean {
    const store = this.readStore();
    const idx = store.entries.findIndex((e) => e.id === id);
    if (idx === -1) return false;
    store.entries.splice(idx, 1);
    this.writeStore(store);
    return true;
  }
}
