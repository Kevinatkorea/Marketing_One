import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Redis } from '@upstash/redis';

// ---------------------------------------------------------------------------
// Storage backend: Redis (Vercel) or filesystem (local dev)
// ---------------------------------------------------------------------------

const USE_REDIS = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const DATA_DIR = resolve(process.cwd(), 'data');
const SEED_DIR = resolve(process.cwd(), 'data', 'seed');

let redis: Redis | null = null;
function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

// Track which collections have been seeded (per cold start)
const seededKeys = new Set<string>();

async function loadSeedData(collectionName: string): Promise<unknown[]> {
  try {
    const seedPath = resolve(SEED_DIR, 'sample-data.json');
    const raw = await readFile(seedPath, 'utf-8');
    const seed = JSON.parse(raw);
    if (seed[collectionName] && Array.isArray(seed[collectionName])) {
      return seed[collectionName];
    }
  } catch { /* seed file missing */ }
  return [];
}

// Simple in-memory lock to prevent concurrent writes
const locks = new Map<string, Promise<void>>();

async function acquireLock(key: string): Promise<() => void> {
  while (locks.has(key)) {
    await locks.get(key);
  }
  let release: () => void;
  const p = new Promise<void>((r) => { release = r; });
  locks.set(key, p);
  return () => { locks.delete(key); release!(); };
}

/**
 * Base repository backed by Upstash Redis (Vercel) or JSON files (local).
 *
 * Each collection is stored as a JSON array under a single Redis key
 * (e.g. "marketing:projects") or a single file (e.g. data/projects.json).
 */
export abstract class JsonRepository<T extends { id: string }> {
  protected readonly fileName: string;
  protected readonly filePath: string;
  protected readonly idPrefix: string;
  private readonly redisKey: string;
  private readonly collectionName: string;

  constructor(fileName: string, idPrefix: string) {
    this.fileName = fileName;
    this.filePath = resolve(DATA_DIR, fileName);
    this.idPrefix = idPrefix;
    this.collectionName = fileName.replace('.json', '');
    this.redisKey = `marketing:${this.collectionName}`;
  }

  // ------------------------------------------------------------------
  // Lock helper
  // ------------------------------------------------------------------

  protected async withLock<R>(fn: () => Promise<R>): Promise<R> {
    const release = await acquireLock(this.redisKey);
    try {
      return await fn();
    } finally {
      release();
    }
  }

  // ------------------------------------------------------------------
  // Storage I/O
  // ------------------------------------------------------------------

  protected async readAll(): Promise<T[]> {
    return this.readAllRaw();
  }

  protected async readAllRaw(): Promise<T[]> {
    if (USE_REDIS) {
      return this.readFromRedis();
    }
    return this.readFromFile();
  }

  protected async writeAll(items: T[]): Promise<void> {
    const release = await acquireLock(this.redisKey);
    try {
      await this.writeAllRaw(items);
    } finally {
      release();
    }
  }

  protected async writeAllRaw(items: T[]): Promise<void> {
    if (USE_REDIS) {
      await getRedis().set(this.redisKey, JSON.stringify(items));
    } else {
      await mkdir(dirname(this.filePath), { recursive: true });
      await writeFile(this.filePath, JSON.stringify(items, null, 2), 'utf-8');
    }
  }

  // --- Redis ---

  private async readFromRedis(): Promise<T[]> {
    const r = getRedis();

    // Auto-seed on first access per cold start
    if (!seededKeys.has(this.collectionName)) {
      seededKeys.add(this.collectionName);
      const exists = await r.exists(this.redisKey);
      if (!exists) {
        const seedData = await loadSeedData(this.collectionName);
        if (seedData.length > 0) {
          await r.set(this.redisKey, JSON.stringify(seedData));
        }
        return seedData as T[];
      }
    }

    const raw = await r.get<string>(this.redisKey);
    if (!raw) return [];
    // Upstash may return parsed object or string
    if (typeof raw === 'string') return JSON.parse(raw) as T[];
    if (Array.isArray(raw)) return raw as T[];
    return [];
  }

  // --- File ---

  private async readFromFile(): Promise<T[]> {
    try {
      const raw = await readFile(this.filePath, 'utf-8');
      return JSON.parse(raw) as T[];
    } catch {
      return [];
    }
  }

  // ------------------------------------------------------------------
  // ID generation  "prefix_001", "prefix_002", ...
  // ------------------------------------------------------------------

  protected generateIdFromItems(items: T[]): string {
    if (items.length === 0) return `${this.idPrefix}_001`;
    let maxNum = 0;
    for (const item of items) {
      const match = item.id.match(/_(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    return `${this.idPrefix}_${String(maxNum + 1).padStart(3, '0')}`;
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
      const updated = { ...items[index], ...data, id } as T;
      items[index] = updated;
      await this.writeAllRaw(items);
      return updated;
    });
  }
}
