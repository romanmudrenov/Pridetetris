(function() {
  var canvas = document.getElementById('board');
  var boardWrap = document.getElementById('boardWrap');
  var nextCan = document.getElementById('nextCanvas');
  var nextCtx = nextCan.getContext('2d');
  var pauseOverlay = document.getElementById('pauseOverlay');
  var btnPause = document.getElementById('btnPause');

  var COLS = 12;
  var ROWS = 20;

  var SERVICES = [
    { name: "Прямая (I)",     color: "#00f0ff", type: "billboard", shape: [[1,1,1,1]] },
    { name: "Т-фигура (T)",   color: "#b829ff", type: "design",    shape: [[0,1,0],[1,1,1]] },
    { name: "Зигзаг (Z)",     color: "#ff007a", type: "merch",     shape: [[1,1,0],[0,1,1]] },
    { name: "Змейка (S)",     color: "#00ff9d", type: "merch",     shape: [[0,1,1],[1,1,0]] },
    { name: "Квадрат (O)",    color: "#fcee09", type: "posm",      shape: [[1,1],[1,1]] },
    { name: "Г-фигура (L)",   color: "#ff8800", type: "print",     shape: [[1,0,0],[1,1,1]] },
    { name: "Обратная Г (J)", color: "#ff2a2a", type: "deadline",  shape: [[0,0,1],[1,1,1]] }
  ];

  var grid = [];
  var score = 0;
  var lines = 0;
  var ult = 0;
  var cur = null;
  var nextP = null;
  var over = false;
  var paused = false;
  var userPaused = false;
  var timer = null;
  var pieceId = 0;

  var currentModeName = "ASAP (Medium)";
  var baseDelay = 480;
  var speedBoostLevel = 0;

  var audioCtx = null;
  var sfxEnabled = true;
  var currentTrack = "synth";
  var synthInterval = null;
  var synthStep = 0;
  var musicStarted = false;
  var bgAudio = document.getElementById('bgAudio');

  var FREE_TRACKS = {
    "1": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    "2": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    "3": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
  };
  var TRACK_ORDER = ["synth", "1", "2", "3"];
  var TRACK_NAMES = {
    "synth": "8-Bit Synth",
    "1": "Cyber Pride",
    "2": "Neon Agency",
    "3": "Techno Rush",
    "off": "Музыка выключена"
  };

  function ensureAudio() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    if (!musicStarted && currentTrack === 'synth') {
      startMusic('synth');
    }
  }

  function playSfx(type) {
    if (!sfxEnabled) return;
    ensureAudio();
    if (!audioCtx) return;

    var now = audioCtx.currentTime;

    if (type === 'move') {
      var osc = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.04);
      g.gain.setValueAtTime(0.08, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(g); g.connect(audioCtx.destination);
      osc.start(now); osc.stop(now + 0.04);
    } else if (type === 'rotate') {
      var osc2 = audioCtx.createOscillator();
      var g2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(380, now);
      osc2.frequency.exponentialRampToValueAtTime(680, now + 0.08);
      g2.gain.setValueAtTime(0.12, now);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc2.connect(g2); g2.connect(audioCtx.destination);
      osc2.start(now); osc2.stop(now + 0.08);
    } else if (type === 'drop') {
      var osc3 = audioCtx.createOscillator();
      var g3 = audioCtx.createGain();
      osc3.type = 'sawtooth';
      osc3.frequency.setValueAtTime(160, now);
      osc3.frequency.exponentialRampToValueAtTime(45, now + 0.14);
      g3.gain.setValueAtTime(0.18, now);
      g3.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc3.connect(g3); g3.connect(audioCtx.destination);
      osc3.start(now); osc3.stop(now + 0.14);
    } else if (type === 'laser') {
      var oscL = audioCtx.createOscillator();
      var gL = audioCtx.createGain();
      oscL.type = 'sawtooth';
      oscL.frequency.setValueAtTime(980, now);
      oscL.frequency.exponentialRampToValueAtTime(90, now + 0.38);
      gL.gain.setValueAtTime(0.25, now);
      gL.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      oscL.connect(gL); gL.connect(audioCtx.destination);
      oscL.start(now); oscL.stop(now + 0.38);
    } else if (type === 'sparks') {
      var notes = [330, 440, 660, 880, 1320];
      for (var i = 0; i < notes.length; i++) {
        var o = audioCtx.createOscillator();
        var gn = audioCtx.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(notes[i], now + i * 0.045);
        o.frequency.exponentialRampToValueAtTime(notes[i] * 1.5, now + i * 0.045 + 0.12);
        gn.gain.setValueAtTime(0.12, now + i * 0.045);
        gn.gain.exponentialRampToValueAtTime(0.001, now + i * 0.045 + 0.12);
        o.connect(gn); gn.connect(audioCtx.destination);
        o.start(now + i * 0.045);
        o.stop(now + i * 0.045 + 0.12);
      }
    }
  }

  function startMusic(trackKey) {
    musicStarted = true;
    currentTrack = trackKey;
    if (synthInterval) {
      clearInterval(synthInterval);
      synthInterval = null;
    }
    bgAudio.pause();

    if (trackKey === 'off') return;

    if (trackKey === 'synth') {
      ensureAudio();
      var bassNotes = [110, 110, 130.81, 146.83, 110, 110, 164.81, 146.83];
      synthInterval = setInterval(function() {
        if (paused || over || !audioCtx || audioCtx.state !== 'running') return;
        var now = audioCtx.currentTime;
        var freq = bassNotes[synthStep % bassNotes.length];
        synthStep++;
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.035, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      }, 240);
    } else if (FREE_TRACKS[trackKey]) {
      bgAudio.src = FREE_TRACKS[trackKey];
      bgAudio.volume = 0.45;
      if (!paused) bgAudio.play().catch(function() {});
    }
  }

  function syncTrackButtons() {
    var btns = document.querySelectorAll('.track-grid .track-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('active', btns[i].getAttribute('data-track') === currentTrack);
    }
  }

  function switchTrack(dir) {
    ensureAudio();
    var idx = TRACK_ORDER.indexOf(currentTrack);
    if (idx === -1) idx = (dir > 0) ? -1 : 0;
    idx = (idx + dir + TRACK_ORDER.length) % TRACK_ORDER.length;
    var key = TRACK_ORDER[idx];
    startMusic(key);
    syncTrackButtons();
    notify("🎵 " + TRACK_NAMES[key]);
  }

  var useThree = (typeof window.THREE !== 'undefined');
  var renderer, scene, camera, boardGroup, blocksGroup, vfxGroup, pieceLight;
  var fitCamera = null;
  var targetRotY = 0, currentRotY = 0;
  var cubeGeo, edgeGeo, edgeMat;
  var materialCache = {};
  var particles = [];
  var lasers = [];
  var shockwaves = [];

  // Размер поля подгоняется под экран: максимум по ширине и высоте
function layoutBoard() {
    var vw = document.documentElement.clientWidth || window.innerWidth;
    var vh = window.innerHeight;
    var area = document.getElementById('gameArea');
    var top = area.getBoundingClientRect().top;
    if (top < 0) top = 0;
    var availW = Math.min(vw, 480) - 78 - 6 - 8 - 6;
    var availH = vh - top - 20;
    var cell = Math.floor(Math.min(availW / COLS, availH / ROWS));
    if (!(cell >= 8)) cell = 8;
    if (cell > 40) cell = 40;
    boardWrap.style.width = (cell * COLS + 6) + 'px';
    boardWrap.style.height = (cell * ROWS + 6) + 'px';
  }
  function relayout() {
    layoutBoard();
    if (fitCamera) fitCamera();
  }

  if (useThree) {
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x05060a, 1);

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(40, 12 / 20, 0.1, 200);

      scene.add(new THREE.AmbientLight(0xffffff, 0.55));

      var dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
      dirLight.position.set(8, 16, 18);
      scene.add(dirLight);

      var pinkLight = new THREE.PointLight(0xff007a, 0.7, 35);
      pinkLight.position.set(-8, -6, 10);
      scene.add(pinkLight);

      var cyanLight = new THREE.PointLight(0x00f0ff, 0.7, 35);
      cyanLight.position.set(8, 8, 10);
      scene.add(cyanLight);

      pieceLight = new THREE.PointLight(0x00f0ff, 1.2, 8);
      scene.add(pieceLight);

      boardGroup = new THREE.Group();
      scene.add(boardGroup);

      var backGeo = new THREE.PlaneGeometry(COLS, ROWS, COLS, ROWS);
      var backMat = new THREE.MeshBasicMaterial({ color: 0x1e1836, wireframe: true, transparent: true, opacity: 0.35 });
      var backMesh = new THREE.Mesh(backGeo, backMat);
      backMesh.position.set(0, 0, -0.5);
      boardGroup.add(backMesh);

      var frameGeo = new THREE.BoxGeometry(COLS + 0.2, ROWS + 0.2, 1.0);
      var frameEdges = new THREE.EdgesGeometry(frameGeo);
      var frameLine = new THREE.LineSegments(frameEdges, new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.45 }));
      boardGroup.add(frameLine);

      blocksGroup = new THREE.Group();
      boardGroup.add(blocksGroup);

      vfxGroup = new THREE.Group();
      boardGroup.add(vfxGroup);

      cubeGeo = new THREE.BoxGeometry(0.92, 0.92, 0.92);
      edgeGeo = new THREE.EdgesGeometry(cubeGeo);
      edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 });

      fitCamera = function() {
        var w = boardWrap.clientWidth;
        var h = boardWrap.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        var t = Math.tan(camera.fov * Math.PI / 360);
        var zH = (ROWS / 2 + 0.35) / t;
        var zW = (COLS / 2 + 0.35) / (t * camera.aspect);
        camera.position.set(0, 0, Math.max(zH, zW));
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
      };
    } catch (e) {
      useThree = false;
      fitCamera = null;
    }
  }

  relayout();
  window.addEventListener('resize', relayout);
  window.addEventListener('orientationchange', function() { setTimeout(relayout, 250); });
  window.addEventListener('load', relayout);
  setTimeout(relayout, 300);

  function gridToWorldX(gx) { return gx - COLS / 2 + 0.5; }
  function gridToWorldY(gy) { return (ROWS / 2 - 0.5) - gy; }

  function spawnFallingTrail() {
    if (!useThree || !cur || paused || over) return;
    for (var dy = 0; dy < cur.shape.length; dy++) {
      for (var dx = 0; dx < cur.shape[dy].length; dx++) {
        if (cur.shape[dy][dx] && Math.random() < 0.45) {
          var pGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
          var pMat = new THREE.MeshBasicMaterial({ color: cur.color, transparent: true, opacity: 0.85 });
          var pMesh = new THREE.Mesh(pGeo, pMat);
          pMesh.position.set(
            gridToWorldX(cur.x + dx) + (Math.random() - 0.5) * 0.5,
            gridToWorldY(cur.y + dy) + 0.3,
            (Math.random() - 0.5) * 0.4
          );
          vfxGroup.add(pMesh);
          particles.push({
            mesh: pMesh,
            vx: (Math.random() - 0.5) * 0.02,
            vy: 0.05 + Math.random() * 0.05,
            vz: (Math.random() - 0.5) * 0.02,
            life: 1.0,
            decay: 0.06
          });
        }
      }
    }
  }

  function triggerLaserRowExplosion(rowIdx) {
    playSfx('laser');
    boardWrap.classList.add('flash-laser');
    setTimeout(function() { boardWrap.classList.remove('flash-laser'); }, 260);

    if (!useThree) return;
    var wy = gridToWorldY(rowIdx);

    var beamGeo = new THREE.BoxGeometry(COLS + 2, 0.55, 1.4);
    var beamMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 1.0 });
    var beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.position.set(0, wy, 0.4);
    vfxGroup.add(beamMesh);
    lasers.push({ mesh: beamMesh, life: 1.0 });

    var shardColors = [0x00f0ff, 0xff007a, 0xfcee09, 0xffffff];
    for (var c = 0; c < COLS; c++) {
      for (var k = 0; k < 4; k++) {
        var sGeo = new THREE.BoxGeometry(0.32, 0.32, 0.32);
        var col = shardColors[(c + k) % shardColors.length];
        var sMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 1.0 });
        var sMesh = new THREE.Mesh(sGeo, sMat);
        sMesh.position.set(gridToWorldX(c), wy, 0.2);
        vfxGroup.add(sMesh);
        particles.push({
          mesh: sMesh,
          vx: (Math.random() - 0.5) * 0.28,
          vy: (Math.random() - 0.5) * 0.25,
          vz: 0.08 + Math.random() * 0.22,
          life: 1.0,
          decay: 0.035
        });
      }
    }
  }

  function triggerSpeedSparksExplosion() {
    playSfx('sparks');
    boardWrap.classList.add('flash-sparks');
    setTimeout(function() { boardWrap.classList.remove('flash-sparks'); }, 350);

    if (!useThree) return;

    var ringGeo = new THREE.RingGeometry(0.4, 0.85, 24);
    var ringMat = new THREE.MeshBasicMaterial({ color: 0xfcee09, side: THREE.DoubleSide, transparent: true, opacity: 1.0 });
    var ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(0, 0, 0.6);
    vfxGroup.add(ringMesh);
    shockwaves.push({ mesh: ringMesh, scale: 1.0, life: 1.0 });

    var sparkColors = [0xfcee09, 0xff8800, 0xff007a, 0x00f0ff, 0xffffff];
    for (var i = 0; i < 55; i++) {
      var spGeo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
      var spMat = new THREE.MeshBasicMaterial({
        color: sparkColors[i % sparkColors.length],
        transparent: true,
        opacity: 1.0
      });
      var spMesh = new THREE.Mesh(spGeo, spMat);
      spMesh.position.set(0, 0, 0.5);
      var angle = Math.random() * Math.PI * 2;
      var speed = 0.08 + Math.random() * 0.32;
      vfxGroup.add(spMesh);
      particles.push({
        mesh: spMesh,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: (Math.random() - 0.3) * 0.25,
        life: 1.0,
        decay: 0.025
      });
    }
  }

  function get3DMaterial(colorHex, isGhost) {
    var key = colorHex + (isGhost ? "_g" : "");
    if (!materialCache[key]) {
      materialCache[key] = new THREE.MeshPhongMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: isGhost ? 0.1 : 0.22,
        specular: 0xffffff,
        shininess: 85,
        transparent: !!isGhost,
        opacity: isGhost ? 0.22 : 1.0
      });
    }
    return materialCache[key];
  }

  function add3DCube(gx, gy, colorHex, isGhost) {
    var mesh = new THREE.Mesh(cubeGeo, get3DMaterial(colorHex, isGhost));
    mesh.position.set(gridToWorldX(gx), gridToWorldY(gy), isGhost ? -0.15 : 0);
    if (!isGhost) {
      var wire = new THREE.LineSegments(edgeGeo, edgeMat);
      mesh.add(wire);
    }
    blocksGroup.add(mesh);
  }

  function draw3DBlock2D(context, x, y, color, s) {
    var px = x * s;
    var py = y * s;
    var d = Math.max(3, Math.floor(s * 0.2));
    context.fillStyle = color;
    context.fillRect(px + 1, py + d, s - d - 1, s - d - 1);
    context.strokeStyle = "rgba(255,255,255,0.45)";
    context.strokeRect(px + 1, py + d, s - d - 1, s - d - 1);
  }

  function makeGrid() {
    grid = [];
    for (var r = 0; r < ROWS; r++) {
      var row = [];
      for (var c = 0; c < COLS; c++) row.push(null);
      grid.push(row);
    }
  }

  function cloneMatrix(m) {
    var out = [];
    for (var i = 0; i < m.length; i++) out.push(m[i].slice());
    return out;
  }

  function randPiece() {
    var s = SERVICES[Math.floor(Math.random() * SERVICES.length)];
    return {
      name: s.name,
      color: s.color,
      type: s.type,
      shape: cloneMatrix(s.shape),
      x: Math.floor(COLS / 2) - Math.ceil(s.shape[0].length / 2),
      y: 0
    };
  }

  function notify(msg) {
    var b = document.getElementById('banner');
    b.innerText = msg;
    b.style.display = 'block';
    setTimeout(function() { b.style.display = 'none'; }, 1400);
  }

  function getGhostY() {
    if (!cur) return 0;
    var gy = cur.y;
    while (!hits(cur, 0, gy - cur.y + 1)) {
      gy++;
    }
    return gy;
  }

  function draw() {
    if (!useThree) return;
    while (blocksGroup.children.length > 0) {
      blocksGroup.remove(blocksGroup.children[0]);
    }

    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (grid[r][c]) {
          add3DCube(c, r, grid[r][c].color, false);
        }
      }
    }

    if (cur) {
      var ghostY = getGhostY();
      for (var dy = 0; dy < cur.shape.length; dy++) {
        for (var dx = 0; dx < cur.shape[dy].length; dx++) {
          if (cur.shape[dy][dx]) {
            if (ghostY !== cur.y) {
              add3DCube(cur.x + dx, ghostY + dy, cur.color, true);
            }
            add3DCube(cur.x + dx, cur.y + dy, cur.color, false);
          }
        }
      }
      if (pieceLight) {
        pieceLight.color.set(cur.color);
        pieceLight.position.set(gridToWorldX(cur.x + 1), gridToWorldY(cur.y + 1), 2.5);
      }
    }
  }

  function animate3D() {
    if (useThree) {
      currentRotY += (targetRotY - currentRotY) * 0.15;
      targetRotY *= 0.9;
      boardGroup.rotation.y = currentRotY;

      for (var i = particles.length - 1; i >= 0; i--) {
        var p = particles[i];
        p.mesh.position.x += p.vx;
        p.mesh.position.y += p.vy;
        p.mesh.position.z += p.vz;
        p.mesh.rotation.x += 0.12;
        p.mesh.rotation.y += 0.12;
        p.life -= p.decay;
        p.mesh.material.opacity = Math.max(0, p.life);
        if (p.life <= 0) {
          vfxGroup.remove(p.mesh);
          particles.splice(i, 1);
        }
      }

      for (var j = lasers.length - 1; j >= 0; j--) {
        var l = lasers[j];
        l.life -= 0.08;
        l.mesh.scale.y = 0.3 + l.life * 1.5;
        l.mesh.material.opacity = Math.max(0, l.life);
        if (l.life <= 0) {
          vfxGroup.remove(l.mesh);
          lasers.splice(j, 1);
        }
      }

      for (var k = shockwaves.length - 1; k >= 0; k--) {
        var sw = shockwaves[k];
        sw.scale += 0.45;
        sw.life -= 0.05;
        sw.mesh.scale.set(sw.scale, sw.scale, 1);
        sw.mesh.material.opacity = Math.max(0, sw.life);
        if (sw.life <= 0) {
          vfxGroup.remove(sw.mesh);
          shockwaves.splice(k, 1);
        }
      }

      renderer.render(scene, camera);
    }
    requestAnimationFrame(animate3D);
  }
  requestAnimationFrame(animate3D);

  function drawNext() {
    nextCtx.clearRect(0, 0, nextCan.width, nextCan.height);
    if (!nextP) return;
    for (var dy = 0; dy < nextP.shape.length; dy++) {
      for (var dx = 0; dx < nextP.shape[dy].length; dx++) {
        if (nextP.shape[dy][dx]) {
          draw3DBlock2D(nextCtx, dx + 0.4, dy + 0.4, nextP.color, 12);
        }
      }
    }
  }

  function hits(p, ox, oy, mat) {
    var m = mat || p.shape;
    for (var r = 0; r < m.length; r++) {
      for (var c = 0; c < m[r].length; c++) {
        if (!m[r][c]) continue;
        var nx = p.x + c + ox;
        var ny = p.y + r + oy;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && grid[ny][nx]) return true;
      }
    }
    return false;
  }

  function setUlt(val) {
    ult = Math.min(100, Math.max(0, val));
    document.getElementById('ultBar').style.width = ult + "%";
    var btn = document.getElementById('btnUlt');
    if (ult >= 100) btn.className = "btn-ult active";
    else btn.className = "btn-ult";
  }

  function lockPiece() {
    playSfx('drop');
    for (var dy = 0; dy < cur.shape.length; dy++) {
      for (var dx = 0; dx < cur.shape[dy].length; dx++) {
        if (cur.shape[dy][dx] && cur.y + dy >= 0) {
          grid[cur.y + dy][cur.x + dx] = { color: cur.color, type: cur.type };
        }
      }
    }

    if (cur.type === "deadline") {
      score += 500;
      notify("🔥 ДЕДЛАЙН СДАН! +500 ₽");
    }
    if (cur.type === "merch") setUlt(ult + 25);
    else setUlt(ult + 10);

    checkLines();
    spawn();
  }

  function checkLines() {
    var count = 0;
    var designBonus = false;

    for (var r = ROWS - 1; r >= 0; r--) {
      var full = true;
      for (var c = 0; c < COLS; c++) {
        if (!grid[r][c]) { full = false; break; }
      }
      if (full) {
        triggerLaserRowExplosion(r);
        for (var k = 0; k < COLS; k++) {
          if (grid[r][k].type === "design") designBonus = true;
        }
        grid.splice(r, 1);
        var empty = [];
        for (var e = 0; e < COLS; e++) empty.push(null);
        grid.unshift(empty);
        count++;
        r++;
      }
    }

    if (count > 0) {
      var reward = count * 300 * count;
      if (designBonus) {
        reward *= 2;
        notify("🎨 ДИЗАЙН PRIDE УДВОИЛ ЧЕК! +" + reward + " ₽");
      }
      if (count >= 3) {
        reward += 1500;
        notify("🪧 МЕГА-ВЫВЕСКА! +" + reward + " ₽");
      }
      score += reward;
      lines += count;
      setUlt(ult + count * 20);

      var newBoost = Math.floor(lines / 5);
      if (newBoost > speedBoostLevel) {
        speedBoostLevel = newBoost;
        triggerSpeedSparksExplosion();
        notify("⚡ НОВАЯ СКОРОСТЬ! УРОВЕНЬ " + (speedBoostLevel + 1));
      }
    }
    updateUI();
  }

  function updateUI() {
    document.getElementById('scoreVal').innerText = score + " ₽";
    document.getElementById('linesVal').innerText = lines;
    document.getElementById('modeVal').innerText = currentModeName;
  }

  function spawn() {
    pieceId++;
    cur = nextP || randPiece();
    nextP = randPiece();
    var tag = document.getElementById('serviceName');
    tag.innerText = cur.name;
    tag.style.borderColor = cur.color;
    drawNext();

    if (hits(cur, 0, 0)) {
      over = true;
      notify("ТЕНДЕР ОКОНЧЕН! БЮДЖЕТ: " + score + " ₽");
    }
    scheduleTick();
  }

  function moveX(dir) {
    if (over || paused || !cur) return;
    if (!hits(cur, dir, 0)) {
      cur.x += dir;
      targetRotY = dir * 0.06;
      playSfx('move');
      spawnFallingTrail();
      draw();
    }
  }

  function stepDown() {
    if (over || paused || !cur) return;
    if (!hits(cur, 0, 1)) {
      cur.y++;
      spawnFallingTrail();
    } else {
      lockPiece();
    }
    draw();
  }

  function dropFast() {
    if (over || paused || !cur) return;
    while (!hits(cur, 0, 1)) {
      cur.y++;
      score += 5;
      spawnFallingTrail();
    }
    lockPiece();
    updateUI();
    draw();
  }

  function rotate() {
    if (over || paused || !cur) return;
    var s = cur.shape;
    var rot = [];
    for (var c = 0; c < s[0].length; c++) {
      var newRow = [];
      for (var r = s.length - 1; r >= 0; r--) {
        newRow.push(s[r][c]);
      }
      rot.push(newRow);
    }
    // пробуем повернуть с небольшими сдвигами (у стен и у дна)
    var kicks = [[0,0],[-1,0],[1,0],[-2,0],[2,0],[0,-1],[-1,-1],[1,-1]];
    for (var i = 0; i < kicks.length; i++) {
      if (!hits(cur, kicks[i][0], kicks[i][1], rot)) {
        cur.x += kicks[i][0];
        cur.y += kicks[i][1];
        cur.shape = rot;
        targetRotY = 0.08;
        playSfx('rotate');
        spawnFallingTrail();
        draw();
        return;
      }
    }
  }

  function useUlt() {
    if (ult < 100 || over || paused) return;
    triggerLaserRowExplosion(ROWS - 1);
    triggerLaserRowExplosion(ROWS - 2);
    triggerLaserRowExplosion(ROWS - 3);
    grid.splice(ROWS - 3, 3);
    for (var i = 0; i < 3; i++) {
      var empty = [];
      for (var c = 0; c < COLS; c++) empty.push(null);
      grid.unshift(empty);
    }
    setUlt(0);
    score += 1200;
    lines += 3;
    updateUI();
    notify("🦁 СДАНО ПОД КЛЮЧ! -3 РЯДА & +1200 ₽");
    draw();
  }

  function scheduleTick() {
    if (timer) clearTimeout(timer);
    if (over || paused) return;
    var speedFactor = Math.max(140, baseDelay - speedBoostLevel * 30);
    var delay = (cur && cur.type === "deadline") ? Math.max(120, Math.floor(speedFactor * 0.55)) : speedFactor;
    timer = setTimeout(function() {
      stepDown();
      scheduleTick();
    }, delay);
  }

  // Пауза: silent = true для меню (без надписи «ПАУЗА»)
  function setPaused(v, silent) {
    paused = v;
    userPaused = v && !silent;
    pauseOverlay.style.display = userPaused ? 'flex' : 'none';
    btnPause.innerText = userPaused ? '▶' : '⏸';
    if (v) {
      if (timer) clearTimeout(timer);
      bgAudio.pause();
    } else {
      if (musicStarted && currentTrack !== 'synth' && currentTrack !== 'off') {
        bgAudio.play().catch(function() {});
      }
      scheduleTick();
    }
  }

  function togglePause() {
    if (over) return;
    if (document.getElementById('menuModal').style.display === 'flex') return;
    ensureAudio();
    setPaused(!paused, false);
  }

  function startGame() {
    makeGrid();
    score = 0;
    lines = 0;
    speedBoostLevel = 0;
    over = false;
    paused = false;
    userPaused = false;
    pauseOverlay.style.display = 'none';
    btnPause.innerText = '⏸';
    setUlt(0);
    updateUI();
    nextP = randPiece();
    spawn();
    draw();
    notify("🚀 MODE: " + currentModeName);
  }

  // Кнопки: срабатывают на отпускание пальца (так работает и звук), без двойных нажатий
  function bindBtn(id, fn) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchend', function(e) {
      e.preventDefault();
      e.stopPropagation();
      ensureAudio();
      fn();
    }, {passive: false});
    el.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      ensureAudio();
      fn();
    });
  }

  bindBtn('btnUlt', function() { useUlt(); });
  bindBtn('btnRestart', function() { startGame(); });
  bindBtn('btnPause', function() { togglePause(); });
  bindBtn('btnPrevTrack', function() { switchTrack(-1); });
  bindBtn('btnNextTrack', function() { switchTrack(1); });

  // ===== Сенсорное управление полем =====
  var g = { active: false, id: null, sx: 0, sy: 0, lx: 0, ly: 0, t: 0, moved: false, pid: 0 };

  function cellPx() { return boardWrap.clientWidth / COLS; }

  function findTouch(list) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].identifier === g.id) return list[i];
    }
    return null;
  }

  boardWrap.addEventListener('touchstart', function(e) {
    e.preventDefault();
    ensureAudio();
    if (userPaused) { setPaused(false, false); return; }
    if (over || paused || g.active) return;
    var t = e.changedTouches[0];
    g.active = true;
    g.id = t.identifier;
    g.sx = g.lx = t.clientX;
    g.sy = g.ly = t.clientY;
    g.t = Date.now();
    g.moved = false;
    g.pid = pieceId;
  }, {passive: false});

  boardWrap.addEventListener('touchmove', function(e) {
    if (!g.active) return;
    e.preventDefault();
    if (over || paused) return;
    var t = findTouch(e.changedTouches);
    if (!t) return;

    var cell = cellPx();
    var stepX = cell * 0.85;
    var stepY = cell * 0.9;

    if (Math.abs(t.clientX - g.sx) > 10 || Math.abs(t.clientY - g.sy) > 10) g.moved = true;

    while (t.clientX - g.lx >= stepX) { moveX(1); g.lx += stepX; }
    while (g.lx - t.clientX >= stepX) { moveX(-1); g.lx -= stepX; }

    if (t.clientY < g.ly) g.ly = t.clientY;
    if (g.pid === pieceId) {
      var stepped = false;
      while (g.pid === pieceId && t.clientY - g.ly >= stepY) {
        stepDown();
        score += 1;
        g.ly += stepY;
        stepped = true;
      }
      if (stepped) updateUI();
    } else {
      g.ly = t.clientY;
    }
  }, {passive: false});

  function endTouch(e) {
    if (!g.active) return;
    e.preventDefault();
    var t = findTouch(e.changedTouches);
    if (!t) return;
    g.active = false;
    if (e.type === 'touchcancel' || over || paused) return;

    var dt = Date.now() - g.t;
    var dx = t.clientX - g.sx;
    var dy = t.clientY - g.sy;
    var cell = cellPx();

    // быстрый свайп вниз: мгновенный сброс
    if (dy > cell * 5 && dt < 300 && Math.abs(dx) < dy * 0.6 && g.pid === pieceId) {
      dropFast();
      return;
    }
    // обычный тап: поворот
    if (!g.moved && dt < 500) {
      rotate();
    }
  }
  boardWrap.addEventListener('touchend', endTouch, {passive: false});
  boardWrap.addEventListener('touchcancel', endTouch, {passive: false});

  // для компьютера: клик мышью = поворот
  if (!('ontouchstart' in window)) {
    boardWrap.addEventListener('click', function() {
      ensureAudio();
      if (userPaused) { setPaused(false, false); return; }
      if (!over && !paused) rotate();
    });
  }

  // ===== Меню =====
  var menuModal = document.getElementById('menuModal');
  document.getElementById('btnMenu').onclick = function(e) {
    e.stopPropagation();
    ensureAudio();
    setPaused(true, true);
    menuModal.style.display = 'flex';
  };

  document.getElementById('btnCloseMenu').onclick = function(e) {
    e.stopPropagation();
    ensureAudio();
    menuModal.style.display = 'none';
    if (currentTrack === 'synth' && !synthInterval) startMusic('synth');
    setPaused(false, false);
  };

  var modeBtns = document.querySelectorAll('.mode-btn');
  for (var i = 0; i < modeBtns.length; i++) {
    modeBtns[i].onclick = function(e) {
      e.stopPropagation();
      ensureAudio();
      for (var j = 0; j < modeBtns.length; j++) modeBtns[j].classList.remove('selected');
      this.classList.add('selected');
      currentModeName = this.getAttribute('data-mode');
      baseDelay = parseInt(this.getAttribute('data-speed'), 10);
      updateUI();
      menuModal.style.display = 'none';
      setPaused(false, false);
      triggerSpeedSparksExplosion();
      notify("💥 SPEED MODE: " + currentModeName);
    };
  }

  var animalOpts = document.querySelectorAll('.animal-opt');
  for (var a = 0; a < animalOpts.length; a++) {
    animalOpts[a].onclick = function(e) {
      e.stopPropagation();
      for (var b = 0; b < animalOpts.length; b++) animalOpts[b].classList.remove('selected');
      this.classList.add('selected');
      var emoji = this.getAttribute('data-animal');
      document.getElementById('menuAvatarPreview').innerText = emoji;
      document.getElementById('headerAvatar').innerText = emoji;
      playSfx('rotate');
    };
  }

  var colorDots = document.querySelectorAll('.color-dot');
  for (var c = 0; c < colorDots.length; c++) {
    colorDots[c].onclick = function(e) {
      e.stopPropagation();
      var col = this.getAttribute('data-color');
      document.getElementById('menuAvatarPreview').style.background = col;
      document.getElementById('headerAvatar').style.background = col;
      playSfx('move');
    };
  }

  var trackBtns = document.querySelectorAll('.track-grid .track-btn');
  for (var t = 0; t < trackBtns.length; t++) {
    trackBtns[t].onclick = function(e) {
      e.stopPropagation();
      ensureAudio();
      var tr = this.getAttribute('data-track');
      startMusic(tr);
      syncTrackButtons();
    };
  }

  var btnToggleSfx = document.getElementById('btnToggleSfx');
  btnToggleSfx.onclick = function(e) {
    e.stopPropagation();
    sfxEnabled = !sfxEnabled;
    this.innerText = sfxEnabled ? "ВКЛ" : "ВЫКЛ";
    this.classList.toggle('active', sfxEnabled);
    if (sfxEnabled) playSfx('rotate');
  };

  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft') moveX(-1);
    else if (e.key === 'ArrowRight') moveX(1);
    else if (e.key === 'ArrowDown') stepDown();
    else if (e.key === 'ArrowUp') rotate();
    else if (e.key === 'p' || e.key === 'P') togglePause();
    else if (e.key === ' ') { e.preventDefault(); dropFast(); }
  });

  document.addEventListener('touchend', ensureAudio, {passive: true});
  document.addEventListener('click', ensureAudio);

  startGame();
})();
