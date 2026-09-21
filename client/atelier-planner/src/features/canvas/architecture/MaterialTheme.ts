import * as THREE from 'three';
import { ROOM_ZONES } from './SpatialConfig';

const M = (color: number, rough = 0.85, metal = 0.0, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, envMapIntensity: 0.45, ...extra });

export const AtelierWarmMaterials = {
  wall:      M(0xEDE0CC, 0.92, 0.0, { envMapIntensity: 0.32 }),
  wallDark:  M(0x423329, 0.90, 0.0, { envMapIntensity: 0.28 }),
  floor:     M(0xC9A27A, 0.70, 0.08),
  floorDark: M(0x3E3029, 0.75, 0.08),
  wood:      M(0x9A6F4E, 0.60),
  woodDark:  M(0x654533, 0.65),
  desk:      M(0x5A4030, 0.50, 0.15),
  table:     M(0x9A6B48, 0.55),
  chair:     M(0x403A36, 0.85, 0.05),
  fabric:    M(0x53443D, 0.95),
  metal:     M(0x413730, 0.35, 0.80, { envMapIntensity: 0.9 }),
  glass:     new THREE.MeshPhysicalMaterial({ color: 0xD8DED8, transmission: 0.85, transparent: true, opacity: 0.35, roughness: 0.12, ior: 1.5, envMapIntensity: 0.8, side: THREE.DoubleSide }),
  screen:    M(0x07131A, 0.25, 0.40, { emissive: 0x5FE7F2, emissiveIntensity: 0.95, envMapIntensity: 0.6 }),
  brain:     M(0x7F5BB2, 0.30, 0.40, { emissive: 0xA75FFF, emissiveIntensity: 1.4, envMapIntensity: 0.7 }),
  plant:     M(0x3F744A, 0.90),
  pot:       M(0x9A684B, 0.75),
  stone:     M(0xD3B79D, 0.88, 0.0, { envMapIntensity: 0.35 }),
  default:   M(0xC7A98D, 0.80),
  /** v3: shared material for vertex-painted merged meshes (one for the whole building).
   *  Over-bloom fix: matte-first (roughness 0.95) + low env response (0.28) —
   *  with the equirect sky flooding the env probe, 0.88/0.42 made even "matte"
   *  walls cross the bloom threshold. */
  painted:   new THREE.MeshStandardMaterial({ color: 0xFFFFFF, vertexColors: true, roughness: 0.95, envMapIntensity: 0.28 }),
};

const BOOK_MATS = [0x7A4636, 0x5A3B2B, 0x6E4A4A, 0x4F5B43, 0x8A6245].map(c => M(c, 0.85));

// [castShadow, receiveShadow] per role — glass/screens never cast solid shadows
const SHADOW_POLICY: Record<string, [boolean, boolean]> = {
  glass: [false, false], screen: [false, true], floor: [false, true], floorDark: [false, true],
};

const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };

function classify(name: string): string | null {
  if (/brain|neuron|neural|core_/.test(name)) return 'brain';
  if (/monitor|screen|display|tv|panel_led|led/.test(name)) return 'screen';
  if (/glass|window/.test(name)) return 'glass';
  if (/plant|leaf|foliage/.test(name)) return 'plant';
  if (/pot|planter/.test(name)) return 'pot';
  if (/book/.test(name)) return 'book';
  if (/sofa|couch|lounge|cushion/.test(name)) return 'fabric';
  if (/chair|seat|stool/.test(name)) return 'chair';
  if (/desk|counter|reception/.test(name)) return 'desk';
  if (/table/.test(name)) return 'table';
  if (/shelf|cabinet|wardrobe|locker/.test(name)) return 'woodDark';
  if (/door/.test(name)) return 'woodDark';
  if (/metal|frame|leg|handle|trim|rail/.test(name)) return 'metal';
  if (/floor|ground|carpet|rug/.test(name)) return 'floor';
  if (/wall|ceiling|column|beam|partition|roof|facade/.test(name)) return 'wall';
  if (/wood|oak|walnut/.test(name)) return 'wood';
  return null;
}

/**
 * v3 — VERTEX-COLOR BAKING for merged meshes (the single `tripo_node_*`
 * building). The building is ONE mesh, so per-mesh materials can never color
 * its walls — every surface fell to the flat `default` tan. Instead we
 * classify every VERTEX by its world normal + height and paint it:
 *   up-normal & low   → oak floor
 *   up-normal & high  → warm ceiling
 *   down-normal       → soffit
 *   vertical & low    → walnut wainscot
 *   vertical & mid    → warm cream wall
 * One mesh, one draw call, full material richness. The brain-chamber dark
 * rotunda treatment also happens IN THE PAINT (the old Pass-0 name-regex
 * never matched the merged mesh, so it silently never fired).
 */
function paintMergedMesh(mesh: THREE.Mesh, brainC: THREE.Vector3 | null, brainR: number) {
  const geometry = mesh.geometry;
  if (!geometry.attributes.normal) geometry.computeVertexNormals();
  const pos = geometry.attributes.position;
  const nor = geometry.attributes.normal;
  const colors = new Float32Array(pos.count * 3);

  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  const normalMat = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);

  const C = {
    floor:     new THREE.Color(0xC9A27A),
    wallLow:   new THREE.Color(0x6B4E3A),
    wall:      new THREE.Color(0xEFE3D0),
    wallHigh:  new THREE.Color(0xE0D0B8),
    ceiling:   new THREE.Color(0xB9AA93),
    soffit:    new THREE.Color(0x7A6A58),
    brainDark: new THREE.Color(0x352B3E), // dusk violet — the rotunda mood
  };
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
    n.fromBufferAttribute(nor, i).applyMatrix3(normalMat).normalize();
    const y = v.y, ny = n.y;

    let c: THREE.Color;
    if (ny > 0.55)       c = y < 1.2 ? C.floor : (y > 2.8 ? C.ceiling : C.wall);
    else if (ny < -0.55) c = C.soffit;
    else if (y < 0.9)    c = C.wallLow;
    else                 c = y > 3.6 ? C.wallHigh : C.wall;

    // Brain-chamber darkening — zone-based (the dead name-regex is gone)
    if (brainC && y < 4.2 && Math.hypot(v.x - brainC.x, v.z - brainC.z) < brainR) {
      tmp.copy(c).lerp(C.brainDark, 0.72);
      c = tmp;
    }

    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

export function applyMaterialTheme(model: THREE.Object3D) {
  model.updateMatrixWorld(true);

  // Brain chamber center — ZONE-BASED (v3). The old name-regex never matched
  // the merged tripo mesh, so the dark rotunda treatment silently never ran.
  const zone = ROOM_ZONES.find(z => z.id === 'brain_chamber');
  const brainC = zone
    ? new THREE.Vector3((zone.minX + zone.maxX) / 2, 0, (zone.minZ + zone.maxZ) / 2)
    : null;
  const brainR = zone ? Math.max(zone.maxX - zone.minX, zone.maxZ - zone.minZ) * 0.55 : 0;

  const modelBox = new THREE.Box3().setFromObject(model);
  const modelSize = modelBox.getSize(new THREE.Vector3());

  let unclassified = 0; const samples: string[] = [];
  const _box = new THREE.Box3(); const _size = new THREE.Vector3(); const _wp = new THREE.Vector3();

  model.traverse(node => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    const name = (mesh.name || '').toLowerCase();
    let role = classify(name);

    if (!role) {
      _box.setFromObject(mesh); _box.getSize(_size); mesh.getWorldPosition(_wp);
      const isBigMerged = _size.x > modelSize.x * 0.6 && _size.z > modelSize.z * 0.6;
      if (isBigMerged) {
        // The whole-building mesh → vertex-paint it (floors/walls/ceiling/
        // wainscot in ONE mesh, ONE draw call) instead of flat default tan.
        paintMergedMesh(mesh, brainC, brainR);
        mesh.material = AtelierWarmMaterials.painted;
        mesh.castShadow = true; mesh.receiveShadow = true;
        return;
      }
      // Geometry heuristics when names are useless (the "all white" fallback)
      const flat = _size.y < 0.15 && _size.x * _size.z > 4;
      if (flat && _box.min.y < 0.35) role = 'floor';
      else if (flat && _box.min.y > 1.8) role = 'wall';
      else if (Math.min(_size.x, _size.z) < 0.35 && _size.y > 1.5 && Math.max(_size.x, _size.z) > 2) role = 'wall';
      else if (_size.y < 0.9 && _size.x > 1.2 && _size.z > 0.5 && _wp.y > 0.3 && _wp.y < 0.9) role = 'desk';
    }

    if (!role) {
      role = 'default'; unclassified++;
      if (samples.length < 12 && name) samples.push(name);
    }

    // SHARED material instances — never clone per mesh (draw-call/GC friendly)
    mesh.material = role === 'book' ? BOOK_MATS[hash(mesh.name) % BOOK_MATS.length] : (AtelierWarmMaterials as Record<string, THREE.Material>)[role];
    const [cast, recv] = SHADOW_POLICY[role] ?? [true, true];
    mesh.castShadow = cast; mesh.receiveShadow = recv;
  });

  console.log(`Material Theme v3 applied (vertex-paint + zone brain chamber). Unclassified: ${unclassified}`,
    samples.length ? `Rename these meshes for better mapping: ${samples.join(', ')}` : '');
}