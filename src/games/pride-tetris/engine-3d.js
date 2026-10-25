window.PrideCore = window.PrideCore || {};

window.PrideCore.createEngine3D = function(canvas, boardWrap, COLS, ROWS) {
  var Audio = window.PrideCore.Audio;
  var useThree = (typeof window.THREE !== 'undefined');
  var renderer, scene, camera, boardGroup, blocksGroup, vfxGroup, pieceLight;
  var targetRotY = 0, currentRotY = 0;
  var cubeGeo, edgeGeo, edgeMat;
  var materialCache = {};
  var particles = [];
  var lasers = [];
  var shockwaves = [];

  if (useThree) {
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x05060a, 1);

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(40, COLS / ROWS, 0.1, 200);

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

      var fitBoard = function() {
        var w = boardWrap.clientWidth;
        var h = boardWrap.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        var t = Math.tan(camera.fov * Math.PI / 360);
        var zH = (ROWS / 2 + 0.65) / t;
        var zW = (COLS / 2 + 0.65) / (t * camera.aspect);
        camera.position.set(0, 0, Math.max(zH, zW));
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
      };
      fitBoard();
      window.addEventListener('resize', fitBoard);
      window.addEventListener('orientationchange', function() { setTimeout(fitBoard, 200); });
    } catch (e) {
      useThree = false;
    }
  }

  function gridToWorldX(gx) { return gx - COLS / 2 + 0.5; }
  function gridToWorldY(gy) { return (ROWS / 2 - 0.5) - gy; }

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

  function animate3D() {
    if (useThree && boardWrap.offsetParent !== null) {
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

  return {
    tilt: function(val) { targetRotY = val; },
    draw: function(grid, cur, ghostY) {
      if (!useThree) return;
      while (blocksGroup.children.length > 0) {
        blocksGroup.remove(blocksGroup.children[0]);
      }
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          if (grid[r][c]) add3DCube(c, r, grid[r][c].color, false);
        }
      }
      if (cur) {
        for (var dy = 0; dy < cur.shape.length; dy++) {
          for (var dx = 0; dx < cur.shape[dy].length; dx++) {
            if (cur.shape[dy][dx]) {
              if (ghostY !== cur.y) add3DCube(cur.x + dx, ghostY + dy, cur.color, true);
              add3DCube(cur.x + dx, cur.y + dy, cur.color, false);
            }
          }
        }
        if (pieceLight) {
          pieceLight.color.set(cur.color);
          pieceLight.position.set(gridToWorldX(cur.x + 1), gridToWorldY(cur.y + 1), 2.5);
        }
      }
    },
    spawnFallingTrail: function(cur, paused, over) {
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
    },
    triggerLaserRowExplosion: function(rowIdx) {
      Audio.playSfx('laser');
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
    },
    triggerSpeedSparksExplosion: function() {
      Audio.playSfx('sparks');
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
  };
};
