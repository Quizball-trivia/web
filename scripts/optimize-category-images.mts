/**
 * One-off: optimize the World Cup category card images in the Supabase
 * `imgs/categories/` bucket. The original upload put 2.2-3.4 MB raw PNGs next
 * to the existing 3-36 KB webp convention. For each categories/*.png:
 *   1. download the original (backed up to ./backup-category-pngs/)
 *   2. resize to max 800px wide + encode webp q72 (sharp)
 *   3. upload as categories/<name>.webp (upsert, image/webp)
 * Prints a before/after table + the SQL to repoint categories.image_url.
 * PNG originals are left in place so any cached/in-flight URLs keep working.
 *
 * Run from frontend-web-next (sharp lives there):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/optimize-category-images.mts
 */
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !KEY) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');

const BACKUP_DIR = '/tmp/qb-debug/backup-category-pngs';
mkdirSync(BACKUP_DIR, { recursive: true });

interface BucketItem { name: string; metadata?: { size?: number } }

async function listPngs(): Promise<BucketItem[]> {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/imgs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix: 'categories/', limit: 500, sortBy: { column: 'name', order: 'asc' } }),
  });
  if (!res.ok) throw new Error(`list failed: ${res.status}`);
  const items = (await res.json()) as BucketItem[];
  return items.filter((it) => it.name.endsWith('.png'));
}

async function run(): Promise<void> {
  const pngs = await listPngs();
  console.log(`Found ${pngs.length} PNGs to optimize\n`);
  const sqlLines: string[] = [];
  let beforeTotal = 0;
  let afterTotal = 0;

  for (const item of pngs) {
    const path = `categories/${item.name}`;
    const dl = await fetch(`${SUPABASE_URL}/storage/v1/object/imgs/${path}`, {
      headers: { Authorization: `Bearer ${KEY}` },
    });
    if (!dl.ok) { console.error(`SKIP ${item.name}: download ${dl.status}`); continue; }
    const original = Buffer.from(await dl.arrayBuffer());
    writeFileSync(`${BACKUP_DIR}/${item.name}`, original);

    const webp = await sharp(original)
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer();

    const webpName = item.name.replace(/\.png$/, '.webp');
    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/imgs/categories/${webpName}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'image/webp',
        'x-upsert': 'true',
        'Cache-Control': 'max-age=31536000',
      },
      body: webp,
    });
    if (!up.ok) { console.error(`FAIL upload ${webpName}: ${up.status} ${await up.text()}`); continue; }

    beforeTotal += original.length;
    afterTotal += webp.length;
    console.log(
      `${(original.length / 1024).toFixed(0).padStart(6)} KB -> ${(webp.length / 1024).toFixed(0).padStart(4)} KB  ${webpName}`,
    );
    sqlLines.push(
      `UPDATE categories SET image_url = replace(image_url, '/categories/${item.name}', '/categories/${webpName}') WHERE image_url LIKE '%/categories/${item.name}';`,
    );
  }

  console.log(`\nTotal: ${(beforeTotal / 1024 / 1024).toFixed(1)} MB -> ${(afterTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Backups in ${BACKUP_DIR}\n`);
  writeFileSync('/tmp/qb-debug/repoint-category-images.sql', sqlLines.join('\n') + '\n');
  console.log('SQL written to /tmp/qb-debug/repoint-category-images.sql');
}

run().catch((e) => { console.error(e); process.exit(1); });
