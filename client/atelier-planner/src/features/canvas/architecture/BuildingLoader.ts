import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { applyMaterialTheme } from './MaterialTheme';
import { WORLD } from './SpatialConfig';

/**
 * Shoots multiple rays from the sky down through the building.
 * Examines ALL intersections to find the LOWEST horizontal surface = the interior floor.
 */
function detectFloorHeight(model: THREE.Object3D): number {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  
  const meshes: THREE.Mesh[] = [];
  model.traverse((node) => {
    if ((node as THREE.Mesh).isMesh) meshes.push(node as THREE.Mesh);
  });
  
  const rayPositions = [
    new THREE.Vector3(center.x, box.max.y + 10, center.z),
    new THREE.Vector3(center.x + 5, box.max.y + 10, center.z + 5),
    new THREE.Vector3(center.x - 5, box.max.y + 10, center.z - 5),
    new THREE.Vector3(center.x + 5, box.max.y + 10, center.z - 5),
    new THREE.Vector3(center.x - 5, box.max.y + 10, center.z + 5),
  ];
  
  let lowestFloorY = Infinity;
  
  for (const rayPos of rayPositions) {
    const raycaster = new THREE.Raycaster(rayPos, new THREE.Vector3(0, -1, 0));
    const intersects = raycaster.intersectObjects(meshes, false);
    
    for (const intersect of intersects) {
      // FIX: Changed > 0.1 to >= 0 so we don't skip floors located exactly at Y=0
      if (intersect.point.y >= 0 && intersect.point.y < lowestFloorY) {
        lowestFloorY = intersect.point.y;
      }
    }
  }
  
  if (lowestFloorY !== Infinity) {
    console.log(`🎯 Multi-raycast floor detection found Y: ${lowestFloorY.toFixed(3)}`);
    return lowestFloorY;
  }
  
  const fallbackY = size.y * 0.2;
  console.warn(`⚠️ Raycast failed, using fallback Y: ${fallbackY.toFixed(3)}`);
  return fallbackY;
}

export async function loadBuildingGLB(url: string): Promise<THREE.Group> {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene;

        // 1. Apply Scale FIRST
        const originalBox = new THREE.Box3().setFromObject(model);
        const originalSize = originalBox.getSize(new THREE.Vector3());
        const targetWidth = 45;
        const scale = targetWidth / originalSize.x;
        model.scale.setScalar(scale);

        // 2. Recalculate Bounding Box AFTER scaling
        const scaledBox = new THREE.Box3().setFromObject(model);
        const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

        // 3. Center (X, Z) and drop to plinth (Y=0)
        model.position.x -= scaledCenter.x;
        model.position.z -= scaledCenter.z;
        model.position.y -= scaledBox.min.y;

        // 4. Apply Warm PBR Material Theme
        applyMaterialTheme(model);

        // 5. Detect the interior floor height using Multi-Raycast
        const detectedY = detectFloorHeight(model);
        WORLD.floorY = detectedY;
        model.userData.floorY = detectedY;
        
        console.log(`🏗️ Building loaded. Interior floor height detected: ${detectedY.toFixed(3)}`);

        resolve(model);
      },
      undefined,
      (error) => reject(error)
    );
  });
}