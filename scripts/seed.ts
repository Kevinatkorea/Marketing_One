/**
 * Seed script -- copies sample data into the /data/ directory as
 * individual JSON DB files, one per entity collection.
 *
 * Usage:  npx tsx scripts/seed.ts
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

const SEED_FILE = resolve(PROJECT_ROOT, 'data', 'seed', 'sample-data.json');
const DATA_DIR = resolve(PROJECT_ROOT, 'data');

interface SeedData {
  projects: unknown[];
  products: unknown[];
  guides: unknown[];
  virals: unknown[];
  comments: unknown[];
}

const FILE_MAP: { key: keyof SeedData; file: string }[] = [
  { key: 'projects', file: 'projects.json' },
  { key: 'products', file: 'products.json' },
  { key: 'guides', file: 'guides.json' },
  { key: 'virals', file: 'virals.json' },
  { key: 'comments', file: 'comments.json' },
];

async function seed(): Promise<void> {
  console.log('Seeding database...\n');

  // Ensure data directory exists
  await mkdir(DATA_DIR, { recursive: true });

  // Read seed data
  const raw = await readFile(SEED_FILE, 'utf-8');
  const seedData: SeedData = JSON.parse(raw);

  // Write each collection to its own JSON file
  for (const { key, file } of FILE_MAP) {
    const items = seedData[key];
    if (!items) {
      console.warn(`  [SKIP] No data for "${key}"`);
      continue;
    }

    const filePath = resolve(DATA_DIR, file);
    await writeFile(filePath, JSON.stringify(items, null, 2), 'utf-8');
    console.log(`  [OK] ${file} -- ${items.length} record(s)`);
  }

  console.log('\nSeed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
