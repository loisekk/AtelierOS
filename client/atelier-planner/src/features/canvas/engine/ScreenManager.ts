import * as THREE from 'three';

export class ScreenManager {
  public dagNodes: any[] = [];
  public hudMesh!: THREE.Mesh;
  public hudBaseY = 5;
  
  private dagMesh: THREE.Mesh | null = null;
  private hudCanvas!: HTMLCanvasElement;
  private hudCtx!: CanvasRenderingContext2D;
  private hudTexture!: THREE.CanvasTexture;
  private hudLight!: THREE.PointLight;

  initHUD(scene: THREE.Scene) {
    this.hudCanvas = document.createElement('canvas');
    this.hudCanvas.width = 512; this.hudCanvas.height = 256;
    this.hudCtx = this.hudCanvas.getContext('2d')!;
    this.hudTexture = new THREE.CanvasTexture(this.hudCanvas);

    const hudMat = new THREE.MeshBasicMaterial({ map: this.hudTexture, transparent: true, side: THREE.DoubleSide });
    this.hudMesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 2), hudMat);
    this.hudMesh.position.set(0, 5, -8.5);
    scene.add(this.hudMesh);

    this.hudLight = new THREE.PointLight(0x7C3AED, 2, 8);
    this.hudLight.position.set(0, 5, -8);
    scene.add(this.hudLight);

    this.drawSystemHUD(0, 0, 0);
  }

  public positionHUD(brain: THREE.Vector3) {
    this.hudBaseY = brain.y + 2.6;
    this.hudMesh.position.set(brain.x, this.hudBaseY, brain.z);
    this.hudLight.position.set(brain.x, this.hudBaseY - 0.2, brain.z + 0.5);
  }

  public createDAGScreen(scene: THREE.Scene, meetingAnchor: THREE.Vector3) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const texture = new THREE.CanvasTexture(canvas);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.4, 0.12), new THREE.MeshStandardMaterial({ color: 0x292827, roughness: 0.4, metalness: 0.6 }));
    frame.position.set(meetingAnchor.x, 2.3, meetingAnchor.z - 2.66);
    scene.add(frame);

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide }));
    mesh.position.set(meetingAnchor.x, 2.3, meetingAnchor.z - 2.58);
    mesh.userData.dagCtx = ctx;
    mesh.userData.dagTexture = texture;
    scene.add(mesh);

    this.dagMesh = mesh;
    this.drawDAGScreen(mesh, this.dagNodes);
  }

  public updateDAG(scene: THREE.Scene, steps: any[]) {
    this.dagNodes = steps;
    if (this.dagMesh) { this.drawDAGScreen(this.dagMesh, steps); return; }
    scene.traverse(obj => {
      if (obj instanceof THREE.Mesh && obj.userData.screenType === 'dag') this.drawDAGScreen(obj, steps);
    });
  }

  private drawDAGScreen(mesh: THREE.Mesh, steps: any[]) {
    const ctx = mesh.userData.dagCtx as CanvasRenderingContext2D;
    if (!ctx) return;
    ctx.fillStyle = '#0A0A12'; ctx.fillRect(0, 0, 1024, 512);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'; ctx.lineWidth = 1;
    for (let x = 0; x < 1024; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke(); }
    for (let y = 0; y < 512; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke(); }
    ctx.font = 'bold 32px Archivo, sans-serif'; ctx.fillStyle = '#C75D3F'; ctx.fillText('DIRECTED ACYCLIC GRAPH', 40, 60);
    ctx.font = '20px JetBrains Mono, monospace'; ctx.fillStyle = '#8A8A8A'; ctx.fillText('CEO TASK DECOMPOSITION', 40, 90);

    if (steps.length === 0) {
      ctx.fillStyle = '#4A4A52'; ctx.font = '24px Manrope, sans-serif'; ctx.fillText('Awaiting Task Dispatch...', 40, 256);
      (mesh.userData.dagTexture as THREE.CanvasTexture).needsUpdate = true; return;
    }

    const stepWidth = 180, stepHeight = 80, gap = 60;
    const startX = 512 - (steps.length * (stepWidth + gap) - gap) / 2;

    steps.forEach((step, i) => {
      const x = startX + i * (stepWidth + gap); const y = 180;
      if (i > 0) {
        const prevX = startX + (i - 1) * (stepWidth + gap) + stepWidth;
        ctx.beginPath(); ctx.moveTo(prevX, y + stepHeight / 2); ctx.lineTo(x, y + stepHeight / 2);
        ctx.strokeStyle = '#4A4A52'; ctx.lineWidth = 3; ctx.stroke();
      }
      ctx.fillStyle = step.status === 'completed' ? '#059669' : step.status === 'working' ? '#D97706' : step.status === 'error' ? '#DC2626' : '#1C1C1C';
      ctx.strokeStyle = step.status === 'pending' ? '#4A4A52' : 'transparent'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(x, y, stepWidth, stepHeight, 8); ctx.fill();
      if (step.status === 'pending') ctx.stroke();
      ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 18px Archivo, sans-serif'; ctx.fillText(step.role || 'Agent', x + 15, y + 30);
      ctx.font = '14px JetBrains Mono, monospace'; ctx.fillStyle = '#E0E0E0'; ctx.fillText(step.status?.toUpperCase(), x + 15, y + 55);
    });
    (mesh.userData.dagTexture as THREE.CanvasTexture).needsUpdate = true;
  }

  public drawSystemHUD(activeTasks: number, tokensBurned: number, totalAgents: number) {
    const ctx = this.hudCtx; ctx.clearRect(0, 0, 512, 256);
    ctx.strokeStyle = 'rgba(124, 58, 237, 0.8)'; ctx.lineWidth = 2; ctx.strokeRect(10, 10, 492, 236);
    ctx.fillStyle = 'rgba(124, 58, 237, 0.1)'; ctx.fillRect(10, 10, 492, 236);
    ctx.font = 'bold 24px Archivo, sans-serif'; ctx.fillStyle = '#7C3AED'; ctx.fillText('ATELIER OS // ANALYTICS', 25, 45);
    ctx.font = '18px JetBrains Mono, monospace'; ctx.fillStyle = '#0EA5E9';
    ctx.fillText(`ACTIVE NODES   : ${activeTasks}`, 25, 90);
    ctx.fillText(`TOKENS BURNED  : ${tokensBurned.toLocaleString()}`, 25, 120);
    ctx.fillText(`ACTIVE AGENTS  : ${totalAgents}`, 25, 150);
    ctx.strokeStyle = '#C75D3F'; ctx.lineWidth = 3; ctx.beginPath();
    ctx.moveTo(25, 200); ctx.lineTo(80, 190); ctx.lineTo(140, 210); ctx.lineTo(200, 180); ctx.lineTo(260, 160); ctx.lineTo(320, 170); ctx.lineTo(380, 140); ctx.stroke();
    this.hudTexture.needsUpdate = true;
  }

  public createScreenTexture() {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#1C1C1C'; ctx.fillRect(0, 0, 512, 256);
    const texture = new THREE.CanvasTexture(canvas); texture.needsUpdate = true;
    return { canvas, ctx, texture };
  }

  public updateAgentScreenStatus(mesh: THREE.Group, status: string) {
    const update = (c: THREE.Mesh) => {
      if (c.userData.isScreen && c.userData.screenType === 'status') {
        if (!c.userData.screenData) return;
        const { ctx, texture } = c.userData.screenData;
        ctx.fillStyle = '#1C1C1C'; ctx.fillRect(0, 0, 512, 256);
        ctx.font = 'bold 48px Archivo, sans-serif';
        ctx.fillStyle = status === 'working' ? '#059669' : status === 'error' ? '#DC2626' : status === 'waiting' ? '#D97706' : status === 'celebrate' ? '#0EA5E9' : '#8A8A8A';
        ctx.fillText(status.toUpperCase(), 20, 140);
        ctx.font = '24px Manrope, sans-serif'; ctx.fillStyle = '#4A4A4A'; ctx.fillText('ATELIER OS', 20, 50);
        texture.needsUpdate = true;
      }
    };
    mesh.traverse(c => { if (c instanceof THREE.Mesh) update(c); });
    if (mesh.userData.linkedScreens) mesh.userData.linkedScreens.forEach((s: THREE.Mesh) => update(s));
  }

  public updateAgentLog(mesh: THREE.Group, log: string) {
    const update = (c: THREE.Mesh) => {
      if (c.userData.isScreen && c.userData.screenType === 'terminal') {
        if (!c.userData.screenData) return;
        if (!c.userData.logs) c.userData.logs = [];
        c.userData.logs.push(log);
        if (c.userData.logs.length > 8) c.userData.logs.shift();
        const { ctx, texture } = c.userData.screenData;
        ctx.fillStyle = '#1C1C1C'; ctx.fillRect(0, 0, 512, 256);
        ctx.font = '20px JetBrains Mono, monospace'; ctx.fillStyle = '#0EA5E9';
        c.userData.logs.forEach((line: string, i: number) => ctx.fillText(`> ${line.substring(0, 40)}`, 10, 30 + i * 28));
        texture.needsUpdate = true;
      }
    };
    mesh.traverse(c => { if (c instanceof THREE.Mesh) update(c); });
    if (mesh.userData.linkedScreens) mesh.userData.linkedScreens.forEach((s: THREE.Mesh) => update(s));
  }
}