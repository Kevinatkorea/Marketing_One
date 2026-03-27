import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

// Vercel Serverless Functions have read-only filesystem except /tmp.
// Use /tmp/data for writable storage; copy seed data on first access.
const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR = IS_VERCEL ? '/tmp/data' : resolve(process.cwd(), 'data');
const SEED_DIR = resolve(process.cwd(), 'data', 'seed');

const seededFiles = new Set<string>();

async function ensureSeeded(filePath: string, fileName: string): Promise<void> {
  if (!IS_VERCEL || seededFiles.has(fileName)) return;
  seededFiles.add(fileName);
  try {
    await access(filePath);
  } catch {
    // File doesn't exist in /tmp yet — try to copy from seed
    await mkdir(dirname(filePath), { recursive: true });
    try {
      // Read from bundled seed data and extract the relevant array
      const seedPath = resolve(SEED_DIR, 'sample-data.json');
      const raw = await readFile(seedPath, 'utf-8');
      const seed = JSON.parse(raw);
      const key = fileName.replace('.json', '');
      if (seed[key] && Array.isArray(seed[key])) {
        await writeFile(filePath, JSON.stringify(seed[key], null, 2), 'utf-8');
      } else {
        await writeFile(filePath, '[]', 'utf-8');
      }
    } catch {
      await writeFile(filePath, '[]', 'utf-8');
    }
  }
}

// Simple in-memory file lock to prevent concurrent writes to the same file
const fileLocks = new Map<string, Promise<void>>();

async function acquireLock(filePath: string): Promise<() => void> {
  // Wait for any existing lock on this file
  while (fileLocks.has(filePath)) {
    await fileLocks.get(filePath);
  }

  let releaseLock: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  fileLocks.set(filePath, lockPromise);

  return () => {
    fileLocks.delete(filePath);
    releaseLock!();
  };
}

/**
 * Base JSON file-backed repository.
 *
 * Each entity collection is stored as a JSON array in a single file
 * under the /data/ directory (e.g. data/projects.json).
 */
export abstract class JsonRepository<T extends { id: string }> {
  protected readonly filePath: string;
  protected readonly idPrefix: string;

  protected readonly fileName: string;

  constructor(fileName: string, idPrefix: string) {
    this.fileName = fileName;
    this.filePath = resolve(DATA_DIR, fileName);
    this.idPrefix = idPrefix;
  }

  // ------------------------------------------------------------------
  // Lock helper
  // ------------------------------------------------------------------

  protected async acquireFileLock(): Promise<() => void> {
    return acquireLock(this.filePath);
  }

  protected async withLock<R>(fn: () => Promise<R>): Promise<R> {
    const release = await this.acquireFileLock();
    try {
      return await fn();
    } finally {
      release();
    }
  }

  // ------------------------------------------------------------------
  // File I/O helpers
  // ------------------------------------------------------------------

  /** Read all items (acquires lock). Safe for read-only callers. */
  protected async readAll(): Promise<T[]> {
    return this.readAllRaw();
  }

  /** Read all items without acquiring lock (for use inside withLock). */
  protected async readAllRaw(): Promise<T[]> {
    try {
      await ensureSeeded(this.filePath, this.fileName);
      const raw = await readFile(this.filePath, 'utf-8');
      return JSON.parse(raw) as T[];
    } catch {
      // File doesn't exist yet -- return empty collection
      return [];
    }
  }

  /** Write all items (acquires lock). Safe for standalone writes. */
  protected async writeAll(items: T[]): Promise<void> {
    const release = await this.acquireFileLock();
    try {
      await this.writeAllRaw(items);
    } finally {
      release();
    }
  }

  /** Write all items without acquiring lock (for use inside withLock). */
  protected async writeAllRaw(items: T[]): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(items, null, 2), 'utf-8');
  }

  // ------------------------------------------------------------------
  // ID generation  "prefix_001", "prefix_002", ...
  // ------------------------------------------------------------------

  protected generateIdFromItems(items: T[]): string {
    if (items.length === 0) {
      return `${this.idPrefix}_001`;
    }

    let maxNum = 0;
    for (const item of items) {
      const match = item.id.match(/_(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }

    const nextNum = maxNum + 1;
    return `${this.idPrefix}_${String(nextNum).padStart(3, '0')}`;
  }

  protected async generateId(): Promise<string> {
    const items = await this.readAll();
    return this.generateIdFromItems(items);
  }

  // ------------------------------------------------------------------
  // Shared CRUD
  // ------------------------------------------------------------------

  async findById(id: string): Promise<T | null> {
    const items = await this.readAll();
    return items.find((item) => item.id === id) ?? null;
  }

  async deleteById(id: string): Promise<boolean> {
    return this.withLock(async () => {
      const items = await this.readAllRaw();
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) return false;
      items.splice(index, 1);
      await this.writeAllRaw(items);
      return true;
    });
  }

  protected async insertOne(item: T): Promise<T> {
    return this.withLock(async () => {
      const items = await this.readAllRaw();
      items.push(item);
      await this.writeAllRaw(items);
      return item;
    });
  }

  protected async updateOne(id: string, data: Partial<T>): Promise<T | null> {
    return this.withLock(async () => {
      const items = await this.readAllRaw();
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) return null;
      const updated = { ...items[index], ...data, id } as T; // id is immutable
      items[index] = updated;
      await this.writeAllRaw(items);
      return updated;
    });
  }
}
