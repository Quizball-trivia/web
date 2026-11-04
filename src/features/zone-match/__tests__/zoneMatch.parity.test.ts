import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The zone-match engine lives twice: here (authoritative) and as a byte-identical copy (import paths apart) in the
 * backend's src/modules/room/games/zone-match/engine — the server settles matches this client predicts. PARITY.json
 * holds the agreed hashes and is committed, identical, in both repos. A failure here means an engine file changed
 * without regenerating it: run `npx tsx scripts/zone-engine-parity.ts --web <this-repo> --write` in the backend repo
 * (it syncs the manifest into both) after copying the change across.
 */
describe('zone-match engine parity', () => {
  it('the engine files match the committed manifest', () => {
    const root = resolve(import.meta.dirname, '../../../..');
    const manifest = JSON.parse(readFileSync(resolve(root, 'src/features/zone-match/PARITY.json'), 'utf8')) as Record<string, string>;
    const hashes = Object.fromEntries(
      Object.keys(manifest).map((webPath) => [
        webPath,
        createHash('sha256').update(readFileSync(resolve(root, webPath), 'utf8')).digest('hex'),
      ]),
    );
    expect(hashes).toEqual(manifest);
  });
});
