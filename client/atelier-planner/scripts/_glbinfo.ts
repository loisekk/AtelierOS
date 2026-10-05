// TEMP diagnostic — GLB structure dump (delete after 14.6 probe run).
import { readFileSync, writeFileSync } from 'node:fs';

const path = 'c:/Users/yashb/Desktop/open-agents/client/atelier-planner/public/models/agent-build-v1.glb';
const buf = readFileSync(path);
const magic = buf.readUInt32LE(0), version = buf.readUInt32LE(4), len = buf.readUInt32LE(8);
console.log('magic', magic.toString(16), 'version', version, 'len', len, 'filelen', buf.length);

let off = 12;
while (off < buf.length) {
  const clen = buf.readUInt32LE(off), ctype = buf.readUInt32LE(off + 4);
  console.log('chunk', ctype.toString(16), 'len', clen);
  if (ctype === 0x4e4f534a) {
    const json = JSON.parse(buf.subarray(off + 8, off + 8 + clen).toString('utf8'));
    console.log('extensionsUsed', json.extensionsUsed);
    console.log('extensionsRequired', json.extensionsRequired);
    console.log('nodes', json.nodes?.length, 'meshes', json.meshes?.length,
      'primitives', json.meshes?.reduce((s: number, m: { primitives: unknown[] }) => s + m.primitives.length, 0));
    console.log('accessors', json.accessors?.length, 'bufferViews', json.bufferViews?.length,
      'buffers', json.buffers?.map((b: { byteLength: number }) => b.byteLength));
    console.log('images', json.images?.length, 'materials', json.materials?.length, 'scenes', json.scenes?.length);
    console.log('node0', JSON.stringify(json.nodes?.[0]).slice(0, 300));
    console.log('mesh0prim0', JSON.stringify(json.meshes?.[0]?.primitives?.[0]));
    console.log('accessor0', JSON.stringify(json.accessors?.[0]));
    console.log('matrix nodes', json.nodes?.filter((n: { matrix?: unknown }) => n.matrix).length,
      'trs nodes', json.nodes?.filter((n: { translation?: unknown; rotation?: unknown; scale?: unknown }) => n.translation || n.rotation || n.scale).length);
    console.log('animations', json.animations?.length, 'skins', json.skins?.length);
    writeFileSync('c:/Users/yashb/Desktop/open-agents/client/atelier-planner/.glbmeta.json', JSON.stringify(json));
  }
  off += 8 + clen;
}
