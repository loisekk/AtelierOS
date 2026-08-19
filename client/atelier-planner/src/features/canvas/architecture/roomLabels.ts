import * as THREE from 'three';
import { ROOM_LABELS } from './SpatialConfig';

function createLabelTexture(text: string, subtext: string, accent: string): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 200;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(245, 232, 214, 0.97)';                       // warm cream panel
  ctx.beginPath(); ctx.roundRect(8, 8, 496, 184, 22); ctx.fill();
  ctx.strokeStyle = '#D7C2A8'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.roundRect(8, 8, 496, 184, 22); ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#4D382A';
  ctx.font = 'bold 44px Archivo, sans-serif';
  ctx.fillText(text, 256, 88);
  ctx.fillStyle = accent;
  ctx.font = '28px Manrope, sans-serif';
  ctx.fillText(subtext, 256, 138);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function addRoomLabels(scene: THREE.Scene) {
  ROOM_LABELS.forEach(label => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: createLabelTexture(label.text, label.sub, label.accent), transparent: true, depthWrite: false }));
    sprite.position.set(...label.pos);
    sprite.scale.set(4.8, 1.9, 1);
    scene.add(sprite);
  });
}