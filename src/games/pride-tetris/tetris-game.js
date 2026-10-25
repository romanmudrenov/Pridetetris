(function() {
  var Config = window.PrideCore.TetrisConfig;
  var Audio = window.PrideCore.Audio;
  var Hub = window.PrideCore.Hub;

  var canvas = document.getElementById('board');
  var boardWrap = document.getElementById('boardWrap');
  var nextCan = document.getElementById('nextCanvas');
  var nextCtx = nextCan ? nextCan.getContext('2d') : null;

  if (!Config || !canvas || !boardWrap) return;

  var COLS = Config.COLS;
  var ROWS = Config.ROWS;
  var SERVICES = Config.SERVICES;

  var engine3D = window.PrideCore.createEngine3D(canvas, boardWrap, COLS, ROWS);

  var grid = [];
  var score = 0;
  var lines = 0;
  var ult = 0;
  var cur = null;
  var nextP = null;
  var over = false;
  var paused = true;
  var inGame = false;
  var timer = null;

  var currentModeName = "ASAP (Medium)";
  var baseDelay = 480;
  var speedBoostLevel = 0;

  Audio.setPauseChecker(function() { return inGame && (paused || over); });

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
    if (!b) return;
    b.innerText = msg;
    b.style.display = 'block';
    setTimeout(function() { b.style.display = 'none'; }, 1400);
  }

  function submitCurrent(announce) {
    if (score <= 0) return;
    var isRecord = Hub.submitScore('tetris', score);
    if (isRecord && announce) {
      var s = score;
      setTimeout(function() { notify("🏆 НОВЫЙ РЕКОРД: " + s + " ₽"); }, 1500);
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

  function getGhostY() {
    if (!cur) return 0;
    var gy = cur.y;
    while (!hits(cur, 0, gy - cur.y + 1)) gy++;
    return gy;
  }

  function draw() {
    engine3D.draw(grid, cur, getGhostY());
  }

  function drawNext() {
    if (!nextCtx) return;
    nextCtx.clearRect(0, 0, nextCan.width, nextCan.height);
    if (!nextP) return;
    var s = 14;
    var d = Math.max(2, Math.floor(s * 0.2));
    for (var dy = 0; dy < nextP.shape.length; dy++) {
      for (var dx = 0; dx < nextP.shape[dy].length; dx++) {
        if (nextP.shape[dy][dx]) {
          var px = (dx + 0.3) * s;
          var py = (dy + 0.3) * s;
          nextCtx.fillStyle = nextP.color;
          nextCtx.fillRect(px + 1, py + d, s - d - 1, s - d - 1);
          nextCtx.strokeStyle = "rgba(255,255,255,0.45)";
          nextCtx.strokeRect(px + 1, py + d, s - d - 1, s - d - 1);
        }
      }
    }
  }

  function setUlt(val) {
    ult = Math.min(100, Math.max(0, val));
    var bar = document.getElementById('ultBar');
    if (bar) bar.style.width = ult + "%";
    var btn = document.getElementById('btnUlt');
    if (btn) btn.className = ult >= 100 ? "btn-ult active" : "btn-ult";
  }

  function updateUI() {
    var sVal = document.getElementById('scoreVal');
    var lVal = document.getElementById('linesVal');
    var mVal = document.getElementById('modeVal');
    if (sVal) sVal.innerText = score + " ₽";
    if (lVal) lVal.innerText = lines;
    if (mVal) mVal.innerText = currentModeName;
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
        engine3D.triggerLaserRowExplosion(r);
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
        engine3D.triggerSpeedSparksExplosion();
        notify("⚡ НОВАЯ СКОРОСТЬ! УРОВЕНЬ " + (speedBoostLevel + 1));
      }
    }
    updateUI();
  }

  function lockPiece() {
    Audio.playSfx('drop');
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
    setUlt(ult + (cur.type === "merch" ? 25 : 10));
    checkLines();
    spawn();
  }

  function spawn() {
    cur = nextP || randPiece();
    nextP = randPiece();
    var tag = document.getElementById('serviceName');
    if (tag) {
      tag.innerText = cur.name;
      tag.style.borderColor = cur.color;
    }
    drawNext();

    if (hits(cur, 0, 0)) {
      over = true;
      submitCurrent(true);
      notify("ТЕНДЕР ОКОНЧЕН, " + Hub.getPlayerName() + "! БЮДЖЕТ: " + score + " ₽");
    }
    scheduleTick();
  }

  function moveX(dir) {
    if (over || paused || !cur) return;
    if (!hits(cur, dir, 0)) {
      cur.x += dir;
      engine3D.tilt(dir * 0.12);
      Audio.playSfx('move');
      engine3D.spawnFallingTrail(cur, paused, over);
      draw();
    }
  }

  function stepDown() {
    if (over || paused || !cur) return;
    if (!hits(cur, 0, 1)) {
      cur.y++;
      engine3D.spawnFallingTrail(cur, paused, over);
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
      engine3D.spawnFallingTrail(cur, paused, over);
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

    var kicks = [[0,0], [-1,0], [1,0], [-2,0], [2,0], [0,-1], [0,1], [-1,-1], [1,-1]];
    var rotated = false;
    for (var i = 0; i < kicks.length; i++) {
      var ox = kicks[i][0], oy = kicks[i][1];
      if (!hits(cur, ox, oy, rot)) {
        cur.x += ox;
        cur.y += oy;
        cur.shape = rot;
        rotated = true;
        break;
      }
    }

    if (rotated) {
      engine3D.tilt(0.16);
      Audio.playSfx('rotate');
      engine3D.spawnFallingTrail(cur, paused, over);
      draw();
    }
  }

  function setPauseButton(isPaused) {
    var btnP = document.getElementById('btnPause');
    if (!btnP) return;
    btnP.innerText = isPaused ? "▶ ПУСК" : "⏸ ПАУЗА";
    btnP.classList.toggle('paused', isPaused);
  }

  function togglePause() {
    if (over) return;
    paused = !paused;
    var bgAudio = document.getElementById('bgAudio');
    if (paused) {
      if (timer) clearTimeout(timer);
      if (bgAudio && !bgAudio.paused) bgAudio.pause();
      setPauseButton(true);
      notify("⏸ ПАУЗА");
    } else {
      if (Audio.isMp3Track(Audio.getCurrentTrack()) && bgAudio) {
        bgAudio.play().catch(function() {});
      }
      setPauseButton(false);
      var b = document.getElementById('banner');
      if (b) b.style.display = 'none';
      scheduleTick();
    }
  }

  function useUlt() {
    if (ult < 100 || over || paused) return;
    engine3D.triggerLaserRowExplosion(ROWS - 1);
    engine3D.triggerLaserRowExplosion(ROWS - 2);
    engine3D.triggerLaserRowExplosion(ROWS - 3);
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

  function startGame(keepPaused) {
    makeGrid();
    score = 0;
    lines = 0;
    speedBoostLevel = 0;
    over = false;
    paused = !!keepPaused;
    setPauseButton(paused);
    setUlt(0);
    updateUI();
    nextP = randPiece();
    spawn();
    draw();
  }

  function bindBtn(id, fn) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart', function(e) {
      e.preventDefault();
      e.stopPropagation();
      Audio.ensureAudio();
      fn();
    }, {passive: false});
    el.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      Audio.ensureAudio();
      fn();
    });
  }

  bindBtn('btnLeft', function() { moveX(-1); });
  bindBtn('btnRight', function() { moveX(1); });
  bindBtn('btnDown', function() { stepDown(); });
  bindBtn('btnRot', function() { rotate(); });
  bindBtn('btnDrop', function() { dropFast(); });
  bindBtn('btnUlt', function() { useUlt(); });
  bindBtn('btnRestart', function() { submitCurrent(false); startGame(false); });
  bindBtn('btnPause', function() { togglePause(); });

  var touchStartX = 0, touchStartY = 0, touchStartTime = 0;
  var lastDragX = 0, lastDragY = 0, wasDragged = false;
  var lastTouchEndTime = 0;

  if (boardWrap) {
    boardWrap.addEventListener('touchstart', function(e) {
      Audio.ensureAudio();
      if (over || paused) return;
      var t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      lastDragX = touchStartX;
      lastDragY = touchStartY;
      touchStartTime = Date.now();
      wasDragged = false;
    }, {passive: true});

    boardWrap.addEventListener('touchmove', function(e) {
      if (over || paused) return;
      e.preventDefault();
      var t = e.touches[0];
      var dx = t.clientX - lastDragX;
      var dy = t.clientY - lastDragY;

      if (Math.abs(dx) > 22) {
        moveX(dx > 0 ? 1 : -1);
        lastDragX = t.clientX;
        wasDragged = true;
      }
      if (dy > 26) {
        stepDown();
        lastDragY = t.clientY;
        wasDragged = true;
      }
    }, {passive: false});

    boardWrap.addEventListener('touchend', function(e) {
      lastTouchEndTime = Date.now();
      if (over || paused) return;
      var dt = lastTouchEndTime - touchStartTime;
      var ch = e.changedTouches[0];
      var totalDx = Math.abs(ch.clientX - touchStartX);
      var totalDy = ch.clientY - touchStartY;

      if (totalDy > 90 && dt < 220) {
        dropFast();
        return;
      }
      if (!wasDragged && totalDx < 30 && Math.abs(totalDy) < 30) {
        rotate();
      }
    }, {passive: true});

    boardWrap.addEventListener('click', function() {
      if (Date.now() - lastTouchEndTime < 450) return;
      Audio.ensureAudio();
      if (!over && !paused) rotate();
    });
  }

  var menuModal = document.getElementById('menuModal');
  var btnMenu = document.getElementById('btnMenu');
  if (btnMenu && menuModal) {
    btnMenu.onclick = function(e) {
      e.stopPropagation();
      Audio.ensureAudio();
      paused = true;
      if (timer) clearTimeout(timer);
      menuModal.style.display = 'flex';
    };
  }

  var btnCloseMenu = document.getElementById('btnCloseMenu');
  if (btnCloseMenu && menuModal) {
    btnCloseMenu.onclick = function(e) {
      e.stopPropagation();
      Audio.ensureAudio();
      menuModal.style.display = 'none';
      paused = false;
      setPauseButton(false);
      var b = document.getElementById('banner');
      if (b) b.style.display = 'none';
      scheduleTick();
    };
  }

  var btnToMain = document.getElementById('btnToMain');
  if (btnToMain && menuModal) {
    btnToMain.onclick = function(e) {
      e.stopPropagation();
      Audio.ensureAudio();
      menuModal.style.display = 'none';
      Hub.exitToMenu();
    };
  }

  var modeBtns = document.querySelectorAll('.mode-btn');
  for (var i = 0; i < modeBtns.length; i++) {
    modeBtns[i].onclick = function(e) {
      e.stopPropagation();
      Audio.ensureAudio();
      for (var j = 0; j < modeBtns.length; j++) modeBtns[j].classList.remove('selected');
      this.classList.add('selected');
      currentModeName = this.getAttribute('data-mode');
      baseDelay = parseInt(this.getAttribute('data-speed'), 10);
      updateUI();
      if (menuModal) menuModal.style.display = 'none';
      paused = false;
      setPauseButton(false);
      engine3D.triggerSpeedSparksExplosion();
      notify("💥 SPEED MODE: " + currentModeName);
      scheduleTick();
    };
  }

  document.addEventListener('keydown', function(e) {
    if (!inGame) return;
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
    if (e.key === 'ArrowLeft') moveX(-1);
    else if (e.key === 'ArrowRight') moveX(1);
    else if (e.key === 'ArrowDown') stepDown();
    else if (e.key === 'ArrowUp') rotate();
    else if (e.key === ' ') { e.preventDefault(); dropFast(); }
    else if (e.key === 'p' || e.key === 'P') togglePause();
  });

  Hub.registerGame('tetris', {
    onOpen: function() {
      inGame = true;
      if (over) {
        startGame(false);
      } else {
        paused = false;
        setPauseButton(false);
        var b = document.getElementById('banner');
        if (b) b.style.display = 'none';
        scheduleTick();
      }
      engine3D.triggerSpeedSparksExplosion();
      draw();
    },
    onClose: function() {
      submitCurrent(false);
      inGame = false;
      paused = true;
      if (timer) clearTimeout(timer);
      setPauseButton(true);
      var bgAudio = document.getElementById('bgAudio');
      if (bgAudio && Audio.isMp3Track(Audio.getCurrentTrack())) {
        bgAudio.play().catch(function() {});
      }
    },
    onReset: function() {
      inGame = false;
      if (timer) clearTimeout(timer);
      startGame(true);
    }
  });
})();
