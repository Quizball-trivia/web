/** Run after the Blender export; retain the editable originals in the .blend. */
import fs from 'node:fs/promises';
import { NodeIO } from '@gltf-transform/core';
import { dedup, prune, resample } from '@gltf-transform/functions';
const file = 'public/assets/demos/score/footballer/footballer.gltf';
const io = new NodeIO();
const document = await io.read(file);
for (const animation of document.getRoot().listAnimations()) {
  if (['idle', 'kick'].includes(animation.getName())) animation.dispose();
}
// Blender exports constant bind-pose translation/scale channels for every
// bone. Remove only channels identical to the node's default transform.
let removed = 0;
for (const animation of document.getRoot().listAnimations()) {
  for (const channel of animation.listChannels()) {
    const node = channel.getTargetNode();
    const path = channel.getTargetPath();
    const output = channel.getSampler()?.getOutput()?.getArray();
    if (!node || !output || !['translation', 'rotation', 'scale'].includes(path)) continue;
    const rest = path === 'translation' ? node.getTranslation() : path === 'rotation' ? node.getRotation() : node.getScale();
    if (output.every((value, index) => Math.abs(value - rest[index % rest.length]) < 1e-6)) {
      channel.dispose();
      removed++;
    }
  }
}
console.log(`Removed ${removed} redundant bind-pose channels.`);
await document.transform(resample({ tolerance: 1e-5 }), dedup(), prune());
await io.write(file, document);
// Compact JSON is easier on mobile downloads; keep the source .blend editable.
await fs.writeFile(file, JSON.stringify(JSON.parse(await fs.readFile(file, 'utf8'))));
console.log(`Optimized the runtime footballer; retained ${document.getRoot().listAnimations().length} authored clips.`);
