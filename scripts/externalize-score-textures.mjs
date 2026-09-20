/** Run after build-score-rig.mjs. Serve embedded eye textures as same-origin
 * images: ImageBitmapLoader fetches blob URLs, which the site's CSP blocks. */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const directory = 'public/assets/demos/score';
const file = path.join(directory, 'player-body.glb');
const input = await readFile(file);
const jsonLength = input.readUInt32LE(12);
const document = JSON.parse(input.subarray(20, 20 + jsonLength).toString());
const binary = input.subarray(28 + jsonLength);
let changed = false;
for (const image of document.images ?? []) {
  if (image.bufferView === undefined) continue;
  const view = document.bufferViews[image.bufferView];
  const bytes = binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  if (image.mimeType !== 'image/png') throw new Error('Expected PNG eye texture');
  const name = `player-eyes-${hash}.png`;
  await writeFile(path.join(directory, name), bytes);
  image.uri = name;
  delete image.bufferView;
  changed = true;
}
if (changed) {
  // Preserve all geometry, skeleton and animation bytes exactly.
  const json = Buffer.from(JSON.stringify(document));
  const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20);
  json.copy(padded);
  const header = Buffer.from(input.subarray(0, 20));
  header.writeUInt32LE(20 + padded.length + 8 + binary.length, 8);
  header.writeUInt32LE(padded.length, 12);
  await writeFile(file, Buffer.concat([header, padded, input.subarray(20 + jsonLength, 28 + jsonLength), binary]));
}
