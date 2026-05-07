import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { ScreensaverHack } from './types';

class Queens3D implements ScreensaverHack {
  id = 'queens';
  name = 'Queens 3D';
  category = 'gl' as const;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private composer!: EffectComposer;
  
  private w = 0;
  private h = 0;
  private N = 8;
  private queens: number[] = []; // queens[row] = col, -1 = unplaced
  private currentRow = 0;
  private currentCol = 0;
  
  private time = 0;
  private stepTimer = 0;
  private stepInterval = 2.5; // Very slow, relaxed steps
  private solved = false;
  private solvedPause = 0;
  private conflicts: [number, number][] = [];
  private placing = true;

  // 3D Objects
  private boardGroup!: THREE.Group;
  private queenMeshes: (THREE.Mesh | null)[] = [];
  private tileMeshes: THREE.Mesh[][] = [];
  private conflictLight!: THREE.PointLight;
  private rowHighlightLight!: THREE.PointLight;
  
  // Laser Trails
  private trails: { [row: number]: { mesh: THREE.Mesh, life: number }[] } = {};

  private baseColorDark = 0x111118;
  private baseColorLight = 0x333344;
  private scanningColor = 0x3b82f6;

  init(canvas: HTMLCanvasElement, width: number, height: number) {
    this.w = width;
    this.h = height;
    
    // Setup Three.js
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setSize(this.w, this.h);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050510, 0.01);
    this.renderer.setClearColor(0x050510, 1);

    this.camera = new THREE.PerspectiveCamera(45, this.w / this.h, 1, 1000);
    this.camera.position.set(0, 40, 50);
    this.camera.lookAt(0, 0, 0);

    // Post-Processing (Bloom)
    const renderScene = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(this.w, this.h), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.2;
    bloomPass.strength = 1.2;
    bloomPass.radius = 0.5;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(bloomPass);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xaabbff, 0.8);
    dirLight.position.set(20, 50, 20);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    this.conflictLight = new THREE.PointLight(0xff0044, 0, 40);
    this.scene.add(this.conflictLight);
    
    this.rowHighlightLight = new THREE.PointLight(this.scanningColor, 1, 40);
    this.scene.add(this.rowHighlightLight);

    this.buildSkybox();
    this.buildBoard();
    this.reset();
  }

  private buildSkybox() {
    // Generate beautiful starfield / nebula points
    const starGeo = new THREE.BufferGeometry();
    const starPos = [];
    const starColors = [];
    for(let i=0; i<1500; i++) {
        const r = 100 + Math.random() * 100;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);
        starPos.push(x, y, z);
        
        // Nebula colors (purples, blues, pinks)
        const hue = 0.6 + Math.random() * 0.3;
        const color = new THREE.Color().setHSL(hue, 0.8, 0.8);
        starColors.push(color.r, color.g, color.b);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({ size: 1.5, vertexColors: true, transparent: true, opacity: 0.8 });
    const stars = new THREE.Points(starGeo, starMat);
    this.scene.add(stars);
  }

  private buildBoard() {
    this.boardGroup = new THREE.Group();
    this.scene.add(this.boardGroup);

    const tileSize = 4;
    const boardSize = tileSize * this.N;
    const offset = -boardSize / 2 + tileSize / 2;

    // Procedural Marble Texture (Canvas)
    const marbleSize = 256;
    const canvas = document.createElement('canvas');
    canvas.width = marbleSize;
    canvas.height = marbleSize;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, marbleSize, marbleSize);
    for(let i=0; i<100; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * marbleSize, Math.random() * marbleSize);
        ctx.lineTo(Math.random() * marbleSize, Math.random() * marbleSize);
        ctx.strokeStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
        ctx.lineWidth = Math.random() * 3;
        ctx.stroke();
    }
    const marbleTex = new THREE.CanvasTexture(canvas);
    marbleTex.wrapS = THREE.RepeatWrapping;
    marbleTex.wrapT = THREE.RepeatWrapping;

    const geo = new THREE.BoxGeometry(tileSize * 0.95, 1, tileSize * 0.95);
    // Highly reflective physical material
    const matDark = new THREE.MeshPhysicalMaterial({ 
        color: this.baseColorDark, 
        roughness: 0.05, 
        metalness: 0.1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        map: marbleTex
    });
    const matLight = new THREE.MeshPhysicalMaterial({ 
        color: this.baseColorLight, 
        roughness: 0.05, 
        metalness: 0.1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        map: marbleTex
    });

    for (let r = 0; r < this.N; r++) {
      this.tileMeshes[r] = [];
      for (let c = 0; c < this.N; c++) {
        const isDark = (r + c) % 2 === 1;
        const mesh = new THREE.Mesh(geo, isDark ? matDark : matLight);
        mesh.position.set(c * tileSize + offset, 0, r * tileSize + offset);
        mesh.receiveShadow = true;
        this.boardGroup.add(mesh);
        this.tileMeshes[r].push(mesh);
      }
    }

    // Base of the board
    const baseGeo = new THREE.BoxGeometry(boardSize + 2, 2, boardSize + 2);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x11111a, roughness: 0.8 });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -1.5;
    baseMesh.receiveShadow = true;
    this.boardGroup.add(baseMesh);

    // Glowing Queens
    const queenGeo = new THREE.CylinderGeometry(0.1, 1.2, 4, 16);
    const headGeo = new THREE.SphereGeometry(0.8, 16, 16);
    headGeo.translate(0, 2.5, 0);
    
    // High emissive for bloom
    const matQueen = new THREE.MeshStandardMaterial({ 
      color: 0x000000, 
      roughness: 0.2, 
      metalness: 0.8,
      emissive: 0x88bbff, // Glows blue/white
      emissiveIntensity: 2.0
    });

    for (let i = 0; i < this.N; i++) {
      const qGroup = new THREE.Group();
      
      const body = new THREE.Mesh(queenGeo, matQueen);
      body.castShadow = true;
      qGroup.add(body);
      
      const head = new THREE.Mesh(headGeo, matQueen);
      head.castShadow = true;
      qGroup.add(head);

      qGroup.visible = false;
      this.scene.add(qGroup);
      this.queenMeshes[i] = qGroup as any as THREE.Mesh; 
      this.trails[i] = [];
    }
  }

  private reset() {
    this.queens = Array(this.N).fill(-1);
    this.currentRow = 0;
    this.currentCol = 0;
    this.solved = false;
    this.solvedPause = 0;
    this.conflicts = [];
    this.placing = true;
    
    this.queenMeshes.forEach(q => { if (q) q.visible = false; });
    this.conflictLight.intensity = 0;

    // Clear trails
    for (const row in this.trails) {
        this.trails[row].forEach(t => {
            this.scene.remove(t.mesh);
            t.mesh.geometry.dispose();
            (t.mesh.material as THREE.Material).dispose();
        });
        this.trails[row] = [];
    }
  }

  private isSafe(row: number, col: number): boolean {
    this.conflicts = [];
    let safe = true;
    for (let r = 0; r < row; r++) {
      const c = this.queens[r];
      if (c === -1) continue;
      if (c === col || Math.abs(c - col) === Math.abs(r - row)) {
        this.conflicts.push([r, c]);
        safe = false;
      }
    }
    return safe;
  }

  private step() {
    if (this.solved) {
      this.solvedPause += this.stepInterval;
      if (this.solvedPause > 5) this.reset();
      return;
    }
    if (this.currentRow >= this.N) {
      this.solved = true;
      this.conflicts = [];
      return;
    }
    if (this.currentRow < 0) {
      this.reset();
      return;
    }

    if (this.placing) {
      if (this.currentCol >= this.N) {
        this.queens[this.currentRow] = -1;
        this.currentRow--;
        if (this.currentRow >= 0) {
          this.currentCol = this.queens[this.currentRow] + 1;
          this.queens[this.currentRow] = -1;
        }
        return;
      }
      if (this.isSafe(this.currentRow, this.currentCol)) {
        this.queens[this.currentRow] = this.currentCol;
        this.currentRow++;
        this.currentCol = 0;
      } else {
        this.currentCol++;
      }
    }
  }

  private spawnTrail(row: number, pos: THREE.Vector3) {
      const trailMat = new THREE.MeshBasicMaterial({
          color: 0x4488ff,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending
      });
      const trailGeo = new THREE.SphereGeometry(0.5, 8, 8);
      const mesh = new THREE.Mesh(trailGeo, trailMat);
      mesh.position.copy(pos);
      this.scene.add(mesh);
      this.trails[row].push({ mesh, life: 1.0 });
  }

  draw(_time: number, dt: number) {
    if (!this.renderer || !this.composer) return;

    this.time += dt;

    this.stepTimer += dt;
    while (this.stepTimer >= this.stepInterval) {
      this.stepTimer -= this.stepInterval;
      this.step();
    }

    this.boardGroup.rotation.y = this.time * 0.1;
    
    const tileSize = 4;
    const boardSize = tileSize * this.N;
    const offset = -boardSize / 2 + tileSize / 2;

    for (let r = 0; r < this.N; r++) {
      const q = this.queenMeshes[r];
      if (!q) continue;

      let targetC = this.queens[r];
      let isScanning = false;

      if (targetC === -1 && r === this.currentRow) {
        targetC = this.currentCol;
        isScanning = true;
      }

      if (targetC !== -1 && targetC < this.N) {
        q.visible = true;
        
        const tx = targetC * tileSize + offset;
        const tz = r * tileSize + offset;
        
        const localPos = new THREE.Vector3(tx, 2, tz);
        localPos.applyMatrix4(this.boardGroup.matrixWorld);

        const oldPos = q.position.clone();
        q.position.lerp(localPos, 1.5 * dt);

        if (oldPos.distanceTo(q.position) > 0.1 && !this.solved) {
            this.spawnTrail(r, q.position);
        }

        if (isScanning) {
          q.position.y = 4 + Math.sin(this.time * 2) * 0.5;
        } else {
          q.position.y = 2; 
        }
        
        let conflictIntensity = 0;
        if (isScanning && this.conflicts.length > 0) {
            conflictIntensity = 5;
            this.conflictLight.position.copy(q.position);
            this.conflictLight.position.y += 2;
        }
        this.conflictLight.intensity = THREE.MathUtils.lerp(this.conflictLight.intensity, conflictIntensity, 2 * dt);

      } else {
        q.visible = false;
      }

      // Update trails
      for (let i = this.trails[r].length - 1; i >= 0; i--) {
          const t = this.trails[r][i];
          t.life -= dt * 0.5; // slow fade speed
          if (t.life <= 0) {
              this.scene.remove(t.mesh);
              t.mesh.geometry.dispose();
              (t.mesh.material as THREE.Material).dispose();
              this.trails[r].splice(i, 1);
          } else {
              (t.mesh.material as THREE.MeshBasicMaterial).opacity = t.life;
              t.mesh.scale.setScalar(t.life);
          }
      }
    }

    if (this.currentRow < this.N && !this.solved) {
        const localPos = new THREE.Vector3(0, 4, this.currentRow * tileSize + offset);
        localPos.applyMatrix4(this.boardGroup.matrixWorld);
        this.rowHighlightLight.position.lerp(localPos, 2 * dt);
        this.rowHighlightLight.intensity = 2.0 + Math.sin(this.time * 2) * 0.5;
    } else {
        this.rowHighlightLight.intensity = 0;
    }

    for (let r = 0; r < this.N; r++) {
        for (let c = 0; c < this.N; c++) {
            const mesh = this.tileMeshes[r][c];
            const mat = mesh.material as THREE.MeshPhysicalMaterial;
            const isDark = (r + c) % 2 === 1;
            
            let targetColor = new THREE.Color(isDark ? this.baseColorDark : this.baseColorLight);
            
            if (!this.solved && r === this.currentRow && c === this.currentCol) {
                targetColor.setHex(this.scanningColor);
            } else if (this.solved) {
                const dist = Math.sqrt(r*r + c*c);
                if (Math.abs(Math.sin(this.time * 5 - dist * 0.5)) > 0.8) {
                    targetColor.setHex(0x4ade80); // Success green glow
                }
            }

            mat.color.lerp(targetColor, 2 * dt);
            mat.emissive.copy(mat.color).multiplyScalar(0.2); // slight glow to tiles
        }
    }

    this.composer.render();
  }

  resize(width: number, height: number) {
    this.w = width;
    this.h = height;
    if (this.camera) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }
    if (this.renderer) {
        this.renderer.setSize(width, height);
    }
    if (this.composer) {
        this.composer.setSize(width, height);
    }
  }

  destroy() {
    if (this.renderer) this.renderer.dispose();
    this.scene?.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
            object.geometry.dispose();
            if (Array.isArray(object.material)) {
                object.material.forEach((m: THREE.Material) => m.dispose());
            } else {
                object.material.dispose();
            }
        }
    });
  }
}

export const queens = new Queens3D();
