import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { ScreensaverHack } from './types';

class FlyingToasters3D implements ScreensaverHack {
  id = 'flying-toasters';
  name = 'Flying Toasters 3D';
  category = 'gl' as const;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private composer!: EffectComposer;
  
  private w = 0;
  private h = 0;
  private time = 0;

  private toasters: { group: THREE.Group, wings: THREE.Group[], isToast: boolean, speed: number, rotSpeed: number }[] = [];
  
  private toasterMat!: THREE.MeshStandardMaterial;
  private wingMat!: THREE.MeshStandardMaterial;
  private toastMat!: THREE.MeshStandardMaterial;

  private lights: THREE.PointLight[] = [];

  init(canvas: HTMLCanvasElement, width: number, height: number) {
    this.w = width;
    this.h = height;
    
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setSize(this.w, this.h);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.scene = new THREE.Scene();
    this.renderer.setClearColor(0x0a0a1a);

    this.camera = new THREE.PerspectiveCamera(50, this.w / this.h, 1, 500);
    this.camera.position.set(0, 0, 50);

    // Post-Processing
    const renderScene = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(this.w, this.h), 1.2, 0.4, 0.85);
    bloomPass.threshold = 0.1;
    bloomPass.strength = 1.5;
    bloomPass.radius = 0.8;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(bloomPass);

    // Environment Map for Chrome Reflection
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();
    const envScene = new THREE.Scene();
    
    // Create a procedural nebula skybox for reflections
    const envGeo = new THREE.SphereGeometry(100, 32, 32);
    // Inside out sphere
    envGeo.scale(-1, 1, 1);
    
    // Create a texture using canvas for the environment
    const envCanvas = document.createElement('canvas');
    envCanvas.width = 512;
    envCanvas.height = 512;
    const envCtx = envCanvas.getContext('2d')!;
    const grad = envCtx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#ff00aa');
    grad.addColorStop(0.5, '#000033');
    grad.addColorStop(1, '#00ccff');
    envCtx.fillStyle = grad;
    envCtx.fillRect(0, 0, 512, 512);
    // Draw some bright "stars" for sharp reflections
    for(let i=0; i<100; i++) {
        envCtx.fillStyle = '#ffffff';
        envCtx.beginPath();
        envCtx.arc(Math.random()*512, Math.random()*512, Math.random()*3+1, 0, Math.PI*2);
        envCtx.fill();
    }
    const envTex = new THREE.CanvasTexture(envCanvas);
    envTex.colorSpace = THREE.SRGBColorSpace;
    const envMat = new THREE.MeshBasicMaterial({ map: envTex });
    const envSphere = new THREE.Mesh(envGeo, envMat);
    envScene.add(envSphere);

    // Render environment to texture
    const renderTarget = pmremGenerator.fromScene(envScene);
    this.scene.environment = renderTarget.texture;

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5); // Soft white
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(10, 20, 30);
    this.scene.add(dirLight);

    // Dynamic colored point lights to make chrome pop
    const colors = [0xff0055, 0x00aaff, 0x55ff00];
    for(let i=0; i<3; i++) {
        const light = new THREE.PointLight(colors[i], 1.5, 100);
        this.scene.add(light);
        this.lights.push(light);
    }

    // Materials
    this.toasterMat = new THREE.MeshStandardMaterial({ 
        color: 0xdddddd, 
        metalness: 1.0, 
        roughness: 0.05,
        envMapIntensity: 1.5
    });
    
    this.wingMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0.8,
        side: THREE.DoubleSide,
        emissive: 0x111111
    });

    this.toastMat = new THREE.MeshStandardMaterial({
        color: 0xd29d5b,
        metalness: 0.05,
        roughness: 0.9,
        bumpScale: 0.02
    });

    // Create stars
    const starsGeo = new THREE.BufferGeometry();
    const starsVertices = [];
    for (let i = 0; i < 300; i++) {
        const x = (Math.random() - 0.5) * 300;
        const y = (Math.random() - 0.5) * 300;
        const z = -50 - Math.random() * 150;
        starsVertices.push(x, y, z);
    }
    starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const starsMat = new THREE.PointsMaterial({ 
        color: 0xffffff, 
        size: 0.8,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    const stars = new THREE.Points(starsGeo, starsMat);
    this.scene.add(stars);

    // Create instances
    for (let i = 0; i < 15; i++) {
        this.spawn(Math.random() > 0.3, true);
    }
  }

  private createToasterMesh(): { group: THREE.Group, wings: THREE.Group[] } {
    const group = new THREE.Group();
    
    // Body - Use rounded box for better reflections
    const bodyGeo = new THREE.BoxGeometry(4, 3, 2, 4, 4, 4);
    // Smooth the normals
    bodyGeo.computeVertexNormals();
    const body = new THREE.Mesh(bodyGeo, this.toasterMat);
    group.add(body);

    // Slots
    const slotGeo = new THREE.BoxGeometry(3, 0.5, 0.2);
    const slotMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
    const slot1 = new THREE.Mesh(slotGeo, slotMat);
    slot1.position.set(0, 1.5, 0.4);
    group.add(slot1);
    const slot2 = new THREE.Mesh(slotGeo, slotMat);
    slot2.position.set(0, 1.5, -0.4);
    group.add(slot2);

    // Dial
    const dialGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
    dialGeo.rotateX(Math.PI / 2);
    const dial = new THREE.Mesh(dialGeo, new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.5, roughness: 0.5 }));
    dial.position.set(1.5, -0.5, 1.0);
    group.add(dial);

    // Wings
    const wings: THREE.Group[] = [];
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.quadraticCurveTo(1.5, 0.5, 2, 0);
    wingShape.quadraticCurveTo(1.5, -0.5, 0, -0.2);
    wingShape.lineTo(0, 0);

    const wingGeo = new THREE.ShapeGeometry(wingShape);
    
    const leftWingPivot = new THREE.Group();
    const leftWing = new THREE.Mesh(wingGeo, this.wingMat);
    leftWing.position.set(0, 0, 0);
    leftWing.rotation.x = -Math.PI / 2;
    leftWingPivot.add(leftWing);
    leftWingPivot.position.set(0, 1, 1);
    group.add(leftWingPivot);
    wings.push(leftWingPivot);

    const rightWingPivot = new THREE.Group();
    const rightWing = new THREE.Mesh(wingGeo, this.wingMat);
    rightWing.position.set(0, 0, 0);
    rightWing.rotation.x = Math.PI / 2;
    rightWingPivot.add(rightWing);
    rightWingPivot.position.set(0, 1, -1);
    group.add(rightWingPivot);
    wings.push(rightWingPivot);

    return { group, wings };
  }

  private createToastMesh(): THREE.Group {
    const group = new THREE.Group();
    const toastGeo = new THREE.BoxGeometry(2.5, 3, 0.4, 4, 4, 1);
    
    // Add some noise to toast geometry
    const pos = toastGeo.attributes.position;
    for(let i=0; i<pos.count; i++) {
        if (Math.abs(pos.getZ(i)) > 0.1) {
            pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * 0.05);
        }
    }
    toastGeo.computeVertexNormals();

    const toast = new THREE.Mesh(toastGeo, this.toastMat);
    group.add(toast);

    // Crust
    const crustGeo = new THREE.BoxGeometry(2.6, 3.1, 0.3);
    const crustMat = new THREE.MeshStandardMaterial({ color: 0x4a2a10, roughness: 0.95 });
    const crust = new THREE.Mesh(crustGeo, crustMat);
    group.add(crust);

    return group;
  }

  private spawn(isToaster: boolean, initial: boolean = false) {
    let group: THREE.Group;
    let wings: THREE.Group[] = [];

    if (isToaster) {
        const t = this.createToasterMesh();
        group = t.group;
        wings = t.wings;
    } else {
        group = this.createToastMesh();
    }

    const scale = isToaster ? 1 + Math.random() * 0.5 : 0.8 + Math.random() * 0.4;
    group.scale.setScalar(scale);

    const startX = 40 + Math.random() * 30;
    const startY = initial ? (Math.random() - 0.5) * 60 : 30 + Math.random() * 30;
    const startZ = (Math.random() - 0.5) * 40;

    group.position.set(startX, startY, startZ);

    // Toasters fly diagonally down-left
    group.rotation.y = -Math.PI / 4; 
    group.rotation.z = Math.PI / 8;

    this.scene.add(group);

    this.toasters.push({
        group,
        wings,
        isToast: !isToaster,
        speed: 3 + Math.random() * 5,
        rotSpeed: isToaster ? 0 : (Math.random() - 0.5) * 0.5
    });
  }

  draw(_time: number, dt: number) {
    if (!this.renderer || !this.composer) return;
    this.time += dt;

    // Animate lights
    for(let i=0; i<this.lights.length; i++) {
        const light = this.lights[i];
        light.position.x = Math.sin(this.time * 0.5 + i * 2) * 40;
        light.position.y = Math.cos(this.time * 0.3 + i * 3) * 30;
        light.position.z = Math.sin(this.time * 0.4 + i) * 20;
    }

    for (let i = this.toasters.length - 1; i >= 0; i--) {
        const t = this.toasters[i];
        
        // Move diagonally
        t.group.position.x -= t.speed * dt;
        t.group.position.y -= t.speed * 0.8 * dt;

        if (t.isToast) {
            t.group.rotation.x += t.rotSpeed * dt;
            t.group.rotation.y += t.rotSpeed * dt;
        } else {
            // Flap wings
            const flap = Math.sin(this.time * 5 + i) * 0.4;
            t.wings[0].rotation.z = flap;
            t.wings[1].rotation.z = flap;
        }

        // Remove and respawn if off screen
        if (t.group.position.x < -60 || t.group.position.y < -50) {
            this.scene.remove(t.group);
            t.group.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.geometry.dispose();
                }
            });
            this.toasters.splice(i, 1);
            this.spawn(Math.random() > 0.3);
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
    this.toasters = [];
  }
}

export const flyingToasters = new FlyingToasters3D();
