import { BOARD_CONFIG } from './config.js';

export class Engine3D {
  constructor(canvas) {
    this.COLS = BOARD_CONFIG.COLS;
    this.ROWS = BOARD_CONFIG.ROWS;
    this.useThree = typeof window.THREE !== 'undefined';
    this.materialCache = {};
    this.particles = [];
    this.targetRotY = 0;
    this.currentRotY = 0;

    if (this.useThree) {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      this.renderer.setSize(220, 440, false);
      this.renderer.setClearColor(0x05060a, 1);

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(40, 220 / 440, 0.1, 100);
      this.camera.position.set(0, -0.6, 26.2);
      this.camera.lookAt(0, -0.2, 0);

      this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
      dirLight.position.set(8, 16, 18);
      this.scene.add(dirLight);

      this.boardGroup = new THREE.Group();
      this.scene.add(this.boardGroup);

      this.blocksGroup = new THREE.Group();
      this.boardGroup.add(this.blocksGroup);

      this.cubeGeo = new THREE.BoxGeometry(0.92, 0.92, 0.92);
      this.animate();
    }
  }

  gridToWorldX(gx) { return gx - this.COLS / 2 + 0.5; }
  gridToWorldY(gy) { return (this.ROWS / 2 - 0.5) - gy; }

  getMaterial(colorHex, isGhost) {
    const key = colorHex + (isGhost ? '_g' : '');
    if (!this.materialCache[key]) {
      this.materialCache[key] = new THREE.MeshPhongMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: isGhost ? 0.1 : 0.22,
        transparent: !!isGhost,
        opacity: isGhost ? 0.22 : 1.0
      });
    }
    return this.materialCache[key];
  }

  addCube(gx, gy, colorHex, isGhost) {
    const mesh = new THREE.Mesh(this.cubeGeo, this.getMaterial(colorHex, isGhost));
    mesh.position.set(this.gridToWorldX(gx), this.gridToWorldY(gy), isGhost ? -0.15 : 0);
    this.blocksGroup.add(mesh);
  }

  renderState(grid, cur, ghostY) {
    if (!this.useThree) return;
    while (this.blocksGroup.children.length > 0) {
      this.blocksGroup.remove(this.blocksGroup.children[0]);
    }
    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        if (grid[r][c]) this.addCube(c, r, grid[r][c].color, false);
      }
    }
    if (cur) {
      for (let dy = 0; dy < cur.shape.length; dy++) {
        for (let dx = 0; dx < cur.shape[dy].length; dx++) {
          if (cur.shape[dy][dx]) {
            if (ghostY !== cur.y) this.addCube(cur.x + dx, ghostY + dy, cur.color, true);
            this.addCube(cur.x + dx, cur.y + dy, cur.color, false);
          }
        }
      }
    }
  }

  animate() {
    if (this.useThree) {
      this.currentRotY += (this.targetRotY - this.currentRotY) * 0.15;
      this.targetRotY *= 0.9;
      this.boardGroup.rotation.y = this.currentRotY;
      this.renderer.render(this.scene, this.camera);
    }
    requestAnimationFrame(() => this.animate());
  }
}
