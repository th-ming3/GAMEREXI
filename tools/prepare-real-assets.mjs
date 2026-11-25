import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { NodeIO } from 'file:///D:/Temp/opencode/gamerexi-assets/node_modules/@gltf-transform/core/dist/index.js';
import { ALL_EXTENSIONS } from 'file:///D:/Temp/opencode/gamerexi-assets/node_modules/@gltf-transform/extensions/dist/index.js';
import { MeshoptDecoder, MeshoptEncoder } from 'file:///D:/Temp/opencode/gamerexi-assets/node_modules/meshoptimizer/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODELS = path.join(ROOT, 'assets/models');
const OUT = path.join(MODELS, 'runtime');
const NAMES = [
  'apple-tree.glb', 'beech-tree-lod1.glb', 'cherry-tree-lod1.glb',
  'meadow-grass-lod2.glb', 'wildflower-patch.glb', 'wildflower-patch-lod2.glb', 'dandelion-patch.glb',
  'cattail-lod1.glb', 'timber-frame-house.glb', 'sunken-ruins.glb',
  'temple-interior.glb',   'kelp-lod1.glb', 'seagrass-lod1.glb', 'young-spruce-lod1.glb',
  'npc-tam.glb', 'npc-ba-man.glb', 'npc-hoa.glb', 'npc-lam.glb', 'wall-lever-lod1.glb',   'porcini-mushroom-lod1.glb', 'granite-boulder-lod1.glb', 'combat-mech-lod1.glb', 'stone-feline-guardian-lod1.glb',
  'coral-lod1.glb', 'kohaku-koi.glb', 'ogon-koi.glb'
];

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
await fs.mkdir(OUT, { recursive: true });
const execFileAsync = promisify(execFile);
const KTX = 'D:/Temp/opencode/KTX-Software/bin/ktx.exe';
const report = [];
for (const name of NAMES) {
  const document = await io.read(path.join(MODELS, name));
  for (const extension of document.getRoot().listExtensionsUsed()) {
    if (extension.extensionName === 'EXT_meshopt_compression') extension.dispose();
  }
  const textures = document.getRoot().listTextures();
  for (let i = 0; i < textures.length; i++) {
    const texture = textures[i];
    if (texture.getMimeType() !== 'image/ktx2') continue;
    const source = path.join(OUT, `.${name}.${i}.ktx2`);
    const target = path.join(OUT, `.${name}.${i}.png`);
    await fs.writeFile(source, texture.getImage());
    await execFileAsync(KTX, ['extract', source, target]);
    texture.setImage(await fs.readFile(target)).setMimeType('image/png');
    if (texture.getURI()) texture.setURI(path.basename(texture.getURI()) + '.png');
    await fs.rm(source, { force: true });
    await fs.rm(target, { force: true });
  }
  for (const extension of document.getRoot().listExtensionsUsed()) {
    if (extension.extensionName === 'KHR_texture_basisu' && !textures.some(t => t.getMimeType() === 'image/ktx2')) extension.dispose();
  }
  let triangles = 0;
  const meshes = [];
  for (const mesh of document.getRoot().listMeshes()) {
    let meshTriangles = 0;
    for (const primitive of mesh.listPrimitives()) {
      const indices = primitive.getIndices();
      meshTriangles += (indices ? indices.getCount() : primitive.getAttribute('POSITION').getCount()) / 3;
    }
    triangles += meshTriangles;
    meshes.push({ name: mesh.getName(), triangles: meshTriangles });
  }
  await io.write(path.join(OUT, name), document);
  const stat = await fs.stat(path.join(OUT, name));
  report.push({ name, bytes: stat.size, triangles, meshes, animations: document.getRoot().listAnimations().map(a => a.getName()) });
  console.log(`${name}: ${triangles} tris, ${stat.size} bytes, ${meshes.length} meshes`);
}
await fs.writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(report, null, 2), 'utf8');
