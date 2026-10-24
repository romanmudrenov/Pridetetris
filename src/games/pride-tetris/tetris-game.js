import { BOARD_CONFIG, SERVICES } from './config.js';
import { Engine3D } from './engine-3d.js';

export class PrideTetrisGame {
  constructor({ audio, onGameOver }) {
    this.audio = audio;
    this.onGameOver = onGameOver;
    this.COLS = BOARD_CONFIG.COLS;
    this.ROWS = BOARD_CONFIG.ROWS;
    this.engine3d = new Engine3D(document.getElementById('board'));
    this.nextCan = document.getElementById('nextCanvas');
    this.nextCtx = this.nextCan.getContext('2d');

    this.grid = [];
    this.score = 0;
    this.lines = 0;
    this.ult = 0;
    this.cur = null;
    this.nextP = null;
    this.over = false;
    this.paused = false;
    this.timer = null;
    this.currentModeName = "ASAP (Medium)";
    this.baseDelay = 480;

    this.bindControls();
  }

  makeGrid() {
    this.grid = Array.from({ length: this.ROWS }, () => Array(this.COLS).fill(null));
  }

  randPiece() {
    const s = SERVICES[Math.floor(Math.random() * SERVICES.length)];
    return {
      name: s.name,
      color: s.color,
      type: s.type,
      shape: s.shape.map(row => [...row]),
      x: Math.floor(this.COLS / 2) - Math.ceil(s.shape[0].length / 2),
      y: 0
    };
  }

  hits(p, ox, oy, mat) {
    const m = mat || p.shape;
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m[r].length; c++) {
        if (!m[r][c]) continue;
        const nx = p.x + c + ox;
        const ny = p.y + r + oy;
        if (nx < 0 || nx >= this.COLS || ny >= this.ROWS) return true;
        if (ny >= 0 && this.grid[ny][nx]) return true;
      }
    }
    return false;
  }

  getGhostY() {
    if (!this.cur) return 0;
    let gy = this.cur.y;
    while (!this.hits(this.cur, 0, gy - this.cur.y + 1)) gy++;
    return gy;
  }

  draw() {
    this.engine3d.renderState(this.grid, this.cur, this.getGhostY());
  }

  spawn() {
    this.cur = this.nextP || this.randPiece();
    this.nextP = this.randPiece();
    const tag = document.getElementById('serviceName');
    if (tag) tag.innerText = this.cur.name;

    if (this.hits(this.cur, 0, 0)) {
      this.over = true;
      if (this.onGameOver) this.onGameOver(this.score, this.lines, this.currentModeName);
      return;
    }
    this.scheduleTick();
  }

  stepDown() {
    if (this.over || this.paused || !this.cur) return;
    if (!this.hits(this.cur, 0, 1)) {
      this.cur.y++;
    } else {
      this.lockPiece();
    }
    this.draw();
  }

  lockPiece() {
    this.audio.playSfx('drop');
    for (let dy = 0; dy < this.cur.shape.length; dy++) {
      for (let dx = 0; dx < this.cur.shape[dy].length; dx++) {
        if (this.cur.shape[dy][dx] && this.cur.y + dy >= 0) {
          this.grid[this.cur.y + dy][this.cur.x + dx] = { color: this.cur.color, type: this.cur.type };
        }
      }
    }
    this.checkLines();
    this.spawn();
  }

  checkLines() {
    let count = 0;
    for (let r = this.ROWS - 1; r >= 0; r--) {
      if (this.grid[r].every(cell => cell !== null)) {
        this.grid.splice(r, 1);
        this.grid.unshift(Array(this.COLS).fill(null));
        count++;
        r++;
      }
    }
    if (count > 0) {
      this.audio.playSfx('laser');
      this.score += count * 300 * count;
      this.lines += count;
      document.getElementById('scoreVal').innerText = `${this.score} ₽`;
      document.getElementById('linesVal').innerText = this.lines;
    }
  }

  moveX(dir) {
    if (this.over || this.paused || !this.cur) return;
    if (!this.hits(this.cur, dir, 0)) {
      this.cur.x += dir;
      this.engine3d.targetRotY = dir * 0.12;
      this.audio.playSfx('move');
      this.draw();
    }
  }

  rotate() {
    if (this.over || this.paused || !this.cur) return;
    const s = this.cur.shape;
    const rot = s[0].map((_, c) => s.map(row => row[c]).reverse());
    if (!this.hits(this.cur, 0, 0, rot)) {
      this.cur.shape = rot;
      this.audio.playSfx('rotate');
      this.draw();
    }
  }

  dropFast() {
    if (this.over || this.paused || !this.cur) return;
    while (!this.hits(this.cur, 0, 1)) {
      this.cur.y++;
      this.score += 5;
    }
    this.lockPiece();
    document.getElementById('scoreVal').innerText = `${this.score} ₽`;
    this.draw();
  }

  scheduleTick() {
    if (this.timer) clearTimeout(this.timer);
    if (this.over || this.paused) return;
    this.timer = setTimeout(() => {
      this.stepDown();
      this.scheduleTick();
    }, this.baseDelay);
  }

  bindControls() {
    const bind = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.onclick = () => { this.audio.unlockOnFirstTouch(); fn(); };
    };
    bind('btnLeft', () => this.moveX(-1));
    bind('btnRight', () => this.moveX(1));
    bind('btnDown', () => this.stepDown());
    bind('btnRot', () => this.rotate());
    bind('btnDrop', () => this.dropFast());
    bind('btnRestart', () => this.start());
    bind('btnPlayPause', () => this.audio.togglePlayPause());
    bind('btnPrevTrack', () => this.audio.loadAndPlayTrack(this.audio.currentTrackIndex - 1));
    bind('btnNextTrack', () => this.audio.loadAndPlayTrack(this.audio.currentTrackIndex + 1));
  }

  start() {
    this.makeGrid();
    this.score = 0;
    this.lines = 0;
    this.over = false;
    this.nextP = this.randPiece();
    this.spawn();
    this.draw();
  }
}
