```javascript
(function() {
  var Config = window.PrideCore.TetrisConfig;
  var Audio = window.PrideCore.Audio;
  var Hub = window.PrideCore.Hub;

  function safeEl(id) { return document.getElementById(id); }

  var canvas = safeEl('board');
  var boardWrap = safeEl('boardWrap');
  var nextCan = safeEl('nextCanvas');
  var nextCtx = nextCan ? nextCan.getContext('2d') : null;

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

  var Music = window.PrideCore.Music;

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
    var b = safeEl('banner');
    if (!b) return;
    b.innerText = msg;
    b.classList.add('show');
    b.style.display = 'block';
    setTimeout(function() {
      b.classList.remove('show');
      b.style.display = 'none';
    }, 1400);
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
    if (!nextCtx || !nextCan || !nextP) return;
    nextCtx.clearRect(0, 0, nextCan.width, nextCan.height);
    var s = 10;
    var d = 2;
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

  // ЗАЩИТА: безопасное обновление ульты (строка 124 больше никогда не вызовет ошибку!)
  function setUlt(val) {
    ult = Math.min(100, Math.max(0, val));
    var bar = safeEl('ultBar');
    if (bar) bar.style.width = ult + "%";
    var btn = safeEl('btnUlt');
    if (btn) btn.className = ult >= 100 ? "btn-ult active" : "btn-ult";
  }

  function fmtScore(n) {
    if (n < 10000) return String(n);
    if (n < 1000000) return (n / 1000).toFixed(n < 100000 ? 1 : 0).replace('.0', '') + 'к';
    return (n / 1000000).toFixed(2).replace(/0$/, '') + 'М';
  }

  function updateUI() {
    var sc = safeEl('scoreVal');
    if (sc) sc.innerText = fmtScore(score);
    var ln = safeEl('linesVal');
    if (ln) ln.innerText = lines;
    var md = safeEl('modeVal');
    if (md) md.innerText = currentModeName.split(' ')[0];
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
    var tag = safeEl('serviceName');
    if (tag) {
      var letter = /\((.)\)/.exec(cur.name);
      tag.innerText = letter ? letter[1] : cur.name;
      tag.title = cur.name;
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
    var btnP = safeEl('btnPause');
    if (!btnP) return;
    btnP.innerText = isPaused ? "▶" : "⏸";
    btnP.classList.toggle('paused', isPaused);
  }

  function togglePause() {
    if (over) return;
    paused = !paused;
    if (paused) {
      if (timer) clearTimeout(timer);
      setPauseButton(true);
      notify("⏸ ПАУЗА");
    } else {
      setPauseButton(false);
      var b = safeEl('banner');
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
    if (!paused) notify("🚀 ВПЕРЁД, " + Hub.getPlayerName() + "!");
  }

  function bindBtn(id, fn) {
    var el = safeEl(id);
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

  function musicAction(name) {
    if (!Music) { notify('Музыка не загрузилась'); return; }
    var label = Music[name]();
    if (label) notify(label);
  }
  bindBtn('btnPrevTrack', function() { musicAction('prev'); });
  bindBtn('btnPlayPauseTrack', function() { musicAction('toggle'); });
  bindBtn('btnNextTrack', function() { musicAction('next'); });

  // Сенсорное управление пальцем по игровому полю
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
      var t = e.touches[0];
      var dx = t.clientX - lastDragX;
      var dy = t.clientY - lastDragY;

      if (Math.abs(dx) > 18) {
        moveX(dx > 0 ? 1 : -1);
        lastDragX = t.clientX;
        wasDragged = true;
      }
      if (dy > 22) {
        stepDown();
        lastDragY = t.clientY;
        wasDragged = true;
      }
    }, {passive: true});

    boardWrap.addEventListener('touchend', function(e) {
      lastTouchEndTime = Date.now();
      if (over || paused) return;
      var dt = lastTouchEndTime - touchStartTime;
      var ch = e.changedTouches[0];
      var totalDx = Math.abs(ch.clientX - touchStartX);
      var totalDy = ch.clientY - touchStartY;

      // Быстрый свайп вниз — мгновенный сброс
      if (totalDy > 75 && dt < 250) {
        dropFast();
        return;
      }
      // Короткий тап — поворот
      if (!wasDragged && totalDx < 25 && Math.abs(totalDy) < 25) {
        rotate();
      }
    }, {passive: true});

    boardWrap.addEventListener('click', function() {
      if (Date.now() - lastTouchEndTime < 450) return;
      Audio.ensureAudio();
      if (!over && !paused) rotate();
    });
  }

  // Меню внутри игры
  var menuModal = safeEl('menuModal');
  var btnMenu = safeEl('btnMenu');
  if (btnMenu && menuModal) {
    btnMenu.onclick = function(e) {
      e.stopPropagation();
      Audio.ensureAudio();
      paused = true;
      if (timer) clearTimeout(timer);
      menuModal.classList.add('open');
      menuModal.style.display = 'flex';
    };
  }

  var btnCloseMenu = safeEl('btnCloseMenu');
  if (btnCloseMenu && menuModal) {
    btnCloseMenu.onclick = function(e) {
      e.stopPropagation();
      Audio.ensureAudio();
      menuModal.classList.remove('open');
      menuModal.style.display = 'none';
      paused = false;
      setPauseButton(false);
      var b = safeEl('banner');
      if (b) b.style.display = 'none';
      scheduleTick();
    };
  }

  var btnToMain = safeEl('btnToMain');
  if (btnToMain && menuModal) {
    btnToMain.onclick = function(e) {
      e.stopPropagation();
      Audio.ensureAudio();
      menuModal.classList.remove('open');
      menuModal.style.display = 'none';
      Hub.exitToMenu();
    };
  }

  var modeBtns = document.querySelectorAll('.mode-btn');
  for (var i = 0; i < modeBtns.length; i++) {
    modeBtns[i].onclick = function(e) {
      if (this.id === 'btnModeTouch' || this.id === 'btnModeButtons') return;
      e.stopPropagation();
      Audio.ensureAudio();
      for (var j = 0; j < modeBtns.length; j++) {
        if (modeBtns[j].id !== 'btnModeTouch' && modeBtns[j].id !== 'btnModeButtons') {
          modeBtns[j].classList.remove('selected');
        }
      }
      this.classList.add('selected');
      currentModeName = this.getAttribute('data-mode');
      baseDelay = parseInt(this.getAttribute('data-speed'), 10);
      updateUI();
      if (menuModal) {
        menuModal.classList.remove('open');
        menuModal.style.display = 'none';
      }
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

  // Подключение к порталу
  Hub.registerGame('tetris', {
    onOpen: function() {
      inGame = true;
      // При открытии экрана делаем перерасчет 3D холста под реальный размер экрана телефона
      setTimeout(function() {
        if (engine3D && engine3D.fit) engine3D.fit();
      }, 50);
      setTimeout(function() {
        if (engine3D && engine3D.fit) engine3D.fit();
      }, 250);

      if (over) {
        startGame(false);
      } else {
        paused = false;
        setPauseButton(false);
        var b = safeEl('banner');
        if (b) b.style.display = 'none';
        scheduleTick();
        notify("🦁 В ИГРЕ: " + Hub.getPlayerName() + "!");
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
    },
    onReset: function() {
      inGame = false;
      if (timer) clearTimeout(timer);
      startGame(true);
    }
  });

  startGame(true);
})();
```
