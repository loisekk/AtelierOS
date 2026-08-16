import * as THREE from 'three';

function createLabelTexture(text: string, subtext: string, color: string): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 200;
  const ctx = canvas.getContext('2d')!;

  // Dark Glass Background
  ctx.fillStyle = 'rgba(5, 5, 10, 0.9)';
  ctx.fillRect(0, 0, 512, 200);
  
  // Silver Border
  ctx.strokeStyle = '#4a4a52';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 192);
  
  // Inner Glow Border
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, 492, 180);

  // Header Text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px Archivo, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, 256, 80);

  // Subtitle Text
  ctx.fillStyle = color;
  ctx.font = '32px Manrope, sans-serif';
  ctx.fillText(subtext, 256, 130);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function addRoomLabels(scene: THREE.Scene) {
  const labels = [
    { text: 'CEO BRAIN CORE', sub: 'Command Intelligence', color: '#a855f7', pos: [15, 4.5, -10] },
    { text: 'HOME WORKSPACE', sub: 'CEO Private Office', color: '#f97316', pos: [-11.5, 4.5, -10] },
    { text: 'WORKSPACE SHOWCASE', sub: 'Active Projects', color: '#00f0ff', pos: [36, 4.5, -10] },
    { text: 'COMMAND HUB', sub: 'Dispatch & Monitor', color: '#00f0ff', pos: [15, 4.5, 2] },
    { text: 'AGENT SPACE', sub: 'AI Employees', color: '#10b981', pos: [-11.5, 4.5, 0] },
    { text: 'OFFICE FLOOR', sub: 'Co-Workers & Teams', color: '#ffffff', pos: [36, 4.5, 0] },
    { text: 'KNOWLEDGE HUB', sub: 'Company Memory', color: '#3b82f6', pos: [-11.5, 4.5, 10] },
    { text: 'MEETING ROOM', sub: 'Team Strategy', color: '#f59e0b', pos: [15, 4.5, 11] },
    { text: 'AI CLUB LOUNGE', sub: 'Break & Social', color: '#a855f7', pos: [36, 4.5, 10] },
    { text: 'RECEPTION', sub: 'Welcome to Atelier', color: '#fff5e8', pos: [15, 4.5, 14] },
  ];

  labels.forEach(label => {
    const texture = createLabelTexture(label.text, label.sub, label.color);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(label.pos[0], label.pos[1], label.pos[2]);
    // Made them slightly smaller to look more like integrated HUDs
    sprite.scale.set(5, 2, 1);
    scene.add(sprite);
  });
}