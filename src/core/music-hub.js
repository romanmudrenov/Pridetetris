window.PrideCore = window.PrideCore || {};

(function() {
  var Audio = window.PrideCore.Audio;
  if (!Audio || !Audio.getMusicVolume || !Audio.setExternalStopper) {
    alert('music-hub.js: нужна новая версия audio-player.js. Обнови файл и открой сайт с новым ?v=');
    return;
  }

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }

  // =============== НАСТРОЙКИ (можно менять) ===============
  var MUSIC_DIR = 'music';       // папка с треками в репозитории
  var BG_DIR = 'player-bg';      // папка с фоновыми картинками плеера
  var BRANCH = 'main';
  var CACHE_MS = 5 * 60 * 1000;  // список файлов кэшируется на 5 минут
  var AUDIO_EXT = ['mp3', 'm4a', 'ogg', 'oga', 'wav', 'aac', 'flac', 'opus', 'weba'];
  var IMG_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];

  // Радиостанции. Ссылки должны начинаться с https://
  // Если станция не играет — замени ссылку или удали строку.
  var RU = 'Россия';
  var WORLD = 'Мировое радио';
  var STATIONS = [
    { group: RU, icon: '🎙', name: 'Европа Плюс', genre: 'Pop', url: 'https://ep128.hostingradio.ru:8030/ep128' },
    { group: RU, icon: '📻', name: 'Ретро FM', genre: 'Ретро', url: 'https://retroserver.streamr.ru:8043/retro128.mp3' },
    { group: RU, icon: '💿', name: 'Радио Рекорд', genre: 'Dance', url: 'https://radiorecord.hostingradio.ru/rr_main96.aacp' },
    { group: RU, icon: '🕺', name: 'DFM', genre: 'Dance', url: 'https://dfm.hostingradio.ru/dfm96.aacp' },
    { group: RU, icon: '🇷🇺', name: 'Русское радио', genre: 'Русская музыка', url: 'https://rusradio.hostingradio.ru/rusradio128.mp3' },
    { group: RU, icon: '🤘', name: 'Наше радио', genre: 'Рок', url: 'https://nashe1.hostingradio.ru/nashe-128.mp3' },
    { group: RU, icon: '🔥', name: 'Хит FM', genre: 'Хиты', url: 'https://hitfm.hostingradio.ru/hitfm96.aacp' },
    { group: RU, icon: '🎤', name: 'Радио Шансон', genre: 'Шансон', url: 'https://chanson.hostingradio.ru:8041/chanson128.mp3' },
    { group: RU, icon: '🚗', name: 'Дорожное радио', genre: 'Хиты в дорогу', url: 'https://dorognoe.hostingradio.ru:8000/radio' },

    { group: WORLD, icon: '🌈', name: 'Radio Paradise: Main Mix', genre: 'Eclectic', url: 'https://stream.radioparadise.com/mp3-128' },
    { group: WORLD, icon: '🌙', name: 'Radio Paradise: Mellow', genre: 'Mellow', url: 'https://stream.radioparadise.com/mellow-128' },
    { group: WORLD, icon: '🎸', name: 'Radio Paradise: Rock', genre: 'Rock', url: 'https://stream.radioparadise.com/rock-128' }
  ];

  var KEY_CUSTOM = 'pride_radio_custom_v1';
  var KEY_LAST_SRC = 'pride_last_src_v1';

  // =============== УТИЛИТЫ ===============
  function readCache(key) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  }
  function writeCache(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  function naturalSort(a, b) {
    return a.localeCompare(b, 'ru', { numeric: true, sensitivity: 'base' });
  }
  function extOf(n) {
    var i = n.lastIndexOf('.');
    return i < 0 ? '' : n.slice(i + 1).toLowerCase();
  }
  function prettyTitle(n) {
    var i = n.lastIndexOf('.');
    var b = i > 0 ? n.slice(0, i) : n;
    return b.replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function fmt(s) {
    if (!isFinite(s) || s < 0) s = 0;
    var m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return m + ':' + ('0' + sec).slice(-2);
  }
  function paintRange(r) {
    var min = parseFloat(r.min) || 0;
    var max = parseFloat(r.max) || 100;
    var pct = ((parseFloat(r.value) - min) / (max - min)) * 100;
    if (isNaN(pct)) pct = 0;
    r.style.setProperty('--pct', pct + '%');
  }
  function repoInfo() {
    var host = location.hostname;
    var owner = 'romanmudrenov', repo = 'Pridetetris';
    if (host.indexOf('.github.io') > 0) {
      owner = host.split('.')[0];
      var parts = location.pathname.split('/').filter(function(p) { return p; });
      if (parts.length && parts[0].indexOf('.') < 0) repo = parts[0];
    }
    return { owner: owner, repo: repo };
  }

  // =============== СПИСОК ФАЙЛОВ С GITHUB ===============
  function fetchManifest() {
    return fetch('./' + MUSIC_DIR + '/playlist.json?t=' + Date.now(), { cache: 'no-store' }).then(function(r) {
      if (!r.ok) throw new Error('no manifest');
      return r.json();
    });
  }

  function listFiles(dir, exts, manifestKey, force) {
    var ck = 'pride_dir_v1_' + dir;
    var cached = readCache(ck);
    if (!force && cached && (Date.now() - cached.t) < CACHE_MS) {
      return Promise.resolve({ files: cached.files, source: 'cache' });
    }
    var info = repoInfo();
    var url = 'https://api.github.com/repos/' + info.owner + '/' + info.repo + '/contents/' + encodeURIComponent(dir) + '?ref=' + BRANCH;
    return fetch(url).then(function(r) {
      if (r.status === 404) return { files: [], source: 'api' };
      if (!r.ok) throw new Error('api ' + r.status);
      return r.json().then(function(arr) {
        var files = [];
        if (arr && arr.forEach) {
          arr.forEach(function(it) {
            if (it.type === 'file' && exts.indexOf(extOf(it.name)) >= 0) files.push(it.name);
          });
        }
        files.sort(naturalSort);
        writeCache(ck, { t: Date.now(), files: files });
        return { files: files, source: 'api' };
      });
    }).catch(function() {
      return fetchManifest().then(function(m) {
        var files = [];
        if (m && m[manifestKey] && m[manifestKey].forEach) {
          m[manifestKey].forEach(function(n) {
            if (typeof n === 'string' && exts.indexOf(extOf(n)) >= 0) files.push(n);
          });
        }
        return { files: files, source: 'manifest' };
      }).catch(function() {
        if (cached) return { files: cached.files, source: 'cache' };
        return { files: [], source: 'none' };
      });
    });
  }

  // =============== ИСТОЧНИКИ ЗВУКА ===============
  var pAudio = document.createElement('audio');   // плеер
  pAudio.preload = 'metadata';
  var rAudio = document.createElement('audio');   // радио
  rAudio.preload = 'none';

  function claim(src) {
    if (src !== 'player') pAudio.pause();
    if (src !== 'radio') stopRadio();
  }

  Audio.setExternalStopper(function() {
    pAudio.pause();
    stopRadio();
  });

  // =============== MEDIA SESSION (управление с экрана блокировки) ===============
  function setSession(title, sub, kind) {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: title, artist: sub, album: 'PRIDE' });
      var ms = navigator.mediaSession;
      if (kind === 'player') {
        ms.setActionHandler('play', function() { togglePlay(); });
        ms.setActionHandler('pause', function() { pAudio.pause(); });
        ms.setActionHandler('previoustrack', function() { prevTrack(); });
        ms.setActionHandler('nexttrack', function() { nextTrack(false); });
      } else {
        ms.setActionHandler('play', function() { if (rCur) rAudio.play(); });
        ms.setActionHandler('pause', function() { rAudio.pause(); });
        ms.setActionHandler('previoustrack', null);
        ms.setActionHandler('nexttrack', null);
      }
    } catch (e) {}
  }

  // =============== ПЛЕЕР ===============
  var lastKind = null;      // 'player' или 'radio': чем управляют кнопки на панели игры
  var lastStation = null;
  var tracks = [];
  var bgs = [];
  var idx = -1;
  var shuffle = false;
  var repeat = 'all';      // 'off' | 'all' | 'one'
  var loaded = false;
  var lastLoad = 0;
  var libSource = 'none';
  var errText = '';
  var bgOffset = 0;
  var bgFlip = false;
  var dragging = false;

  function saveLast() {
    writeCache(KEY_LAST_SRC, { kind: lastKind, url: lastStation ? lastStation.url : null });
  }

  function sourceLabel() {
    if (libSource === 'api') return 'GitHub';
    if (libSource === 'manifest') return 'playlist.json';
    if (libSource === 'cache') return 'кэш';
    return 'не найдено';
  }

  function loadLibrary(force) {
    if (!loaded) $('pfSub').textContent = 'Загружаю список…';
    return Promise.all([
      listFiles(MUSIC_DIR, AUDIO_EXT, 'tracks', force),
      listFiles(BG_DIR, IMG_EXT, 'backgrounds', force)
    ]).then(function(res) {
      var prevName = (idx >= 0 && tracks[idx]) ? tracks[idx].name : null;
      tracks = res[0].files.map(function(n) {
        return { name: n, url: './' + MUSIC_DIR + '/' + encodeURIComponent(n), title: prettyTitle(n) };
      });
      bgs = res[1].files.map(function(n) {
        return './' + BG_DIR + '/' + encodeURIComponent(n);
      });
      libSource = res[0].source;
      loaded = true;
      lastLoad = Date.now();
      idx = -1;
      if (prevName) {
        for (var i = 0; i < tracks.length; i++) if (tracks[i].name === prevName) idx = i;
      }
      renderList();
      setBackground(idx + bgOffset);
      updatePlayerUI();
    });
  }

  function setBackground(i) {
    var a = $('pfBgA'), b = $('pfBgB');
    if (!bgs.length) {
      a.classList.remove('show');
      b.classList.remove('show');
      return;
    }
    var n = bgs.length;
    var url = bgs[((i % n) + n) % n];
    var cur = bgFlip ? b : a;
    var nxt = bgFlip ? a : b;
    nxt.style.backgroundImage = 'url("' + url + '")';
    nxt.classList.add('show');
    cur.classList.remove('show');
    bgFlip = !bgFlip;
  }

  function updatePlayerUI() {
    var t = (idx >= 0 && tracks[idx]) ? tracks[idx] : null;
    var playing = !pAudio.paused && idx >= 0;

    if (t) {
      $('pfTitle').textContent = t.title;
    } else if (tracks.length) {
      $('pfTitle').textContent = 'Выбери трек';
    } else {
      $('pfTitle').textContent = loaded ? 'Треков пока нет' : 'Загрузка…';
    }

    if (errText) {
      $('pfSub').textContent = '⚠ ' + errText;
    } else if (tracks.length) {
      $('pfSub').textContent = t ? ('Трек ' + (idx + 1) + ' из ' + tracks.length) : ('Треков: ' + tracks.length);
    } else {
      $('pfSub').textContent = '';
    }

    var empty = loaded && !tracks.length;
    $('pfEmpty').style.display = empty ? 'block' : 'none';
    if (empty) {
      $('pfEmptyText').textContent = (libSource === 'none')
        ? 'Не удалось получить список треков с GitHub (возможно, временный лимит). Нажми «Обновить» чуть позже или создай файл music/playlist.json со списком.'
        : 'В папке music на GitHub пока нет треков. Загрузи туда mp3-файлы — они появятся здесь.';
    }

    $('pfDisc').classList.toggle('playing', playing);
    $('pfEq').classList.toggle('paused', !playing);
    $('pfPlay').textContent = playing ? '⏸' : '▶';
    $('pfShuffle').classList.toggle('on', shuffle);
    $('pfRepeat').textContent = repeat === 'one' ? '🔂' : '🔁';
    $('pfRepeat').classList.toggle('on', repeat !== 'off');
  }

  function renderList() {
    var box = $('pfListItems');
    box.innerHTML = '';
    if (!tracks.length) {
      box.appendChild(el('div', 'empty-box', 'Треков нет'));
    }
    tracks.forEach(function(t, i) {
      var active = (i === idx);
      var row = el('div', 'pf-item' + (active ? ' active' : ''));
      row.appendChild(el('span', 'n', active && !pAudio.paused ? '▶' : String(i + 1)));
      row.appendChild(el('span', 't', t.title));
      row.onclick = function() { playIndex(i); closeList(); };
      box.appendChild(row);
    });
    $('pfListInfo').textContent = '· ' + tracks.length + ' · ' + sourceLabel();
  }

  function playIndex(i) {
    if (!tracks.length) return;
    var n = tracks.length;
    i = ((i % n) + n) % n;
    claim('player');
    lastKind = 'player';
    saveLast();
    idx = i;
    errText = '';
    var t = tracks[i];
    pAudio.src = t.url;
    pAudio.volume = Audio.getMusicVolume();
    var pr = pAudio.play();
    if (pr && pr.catch) pr.catch(function() { showErr('Не удалось воспроизвести файл'); });
    setBackground(idx + bgOffset);
    setSession(t.title, 'PRIDE Player', 'player');
    updatePlayerUI();
    renderList();
  }

  function showErr(msg) {
    errText = msg;
    updatePlayerUI();
  }

  function togglePlay() {
    if (!tracks.length) { loadLibrary(true); return; }
    if (idx < 0) {
      playIndex(shuffle ? Math.floor(Math.random() * tracks.length) : 0);
      return;
    }
    if (pAudio.paused) {
      claim('player');
      var pr = pAudio.play();
      if (pr && pr.catch) pr.catch(function() { showErr('Не удалось воспроизвести файл'); });
    } else {
      pAudio.pause();
    }
  }

  function nextTrack(auto) {
    if (!tracks.length) return;
    if (shuffle && tracks.length > 1) {
      var r;
      do { r = Math.floor(Math.random() * tracks.length); } while (r === idx);
      playIndex(r);
      return;
    }
    var n = idx + 1;
    if (n >= tracks.length) {
      if (auto && repeat === 'off') {
        pAudio.pause();
        pAudio.currentTime = 0;
        updatePlayerUI();
        return;
      }
      n = 0;
    }
    playIndex(n);
  }

  function prevTrack() {
    if (!tracks.length) return;
    if (pAudio.currentTime > 3) { pAudio.currentTime = 0; return; }
    playIndex(idx <= 0 ? tracks.length - 1 : idx - 1);
  }

  pAudio.addEventListener('ended', function() {
    if (repeat === 'one') {
      pAudio.currentTime = 0;
      pAudio.play();
      return;
    }
    nextTrack(true);
  });
  pAudio.addEventListener('error', function() {
    if (idx >= 0 && tracks[idx]) showErr('Не удалось загрузить: ' + tracks[idx].title);
  });
  pAudio.addEventListener('play', function() { updatePlayerUI(); renderList(); updateStrip(); });
  pAudio.addEventListener('pause', function() { updatePlayerUI(); renderList(); updateStrip(); });
  pAudio.addEventListener('timeupdate', function() {
    if (dragging) return;
    var d = pAudio.duration;
    var seek = $('pfSeek');
    if (isFinite(d) && d > 0) seek.value = Math.round(pAudio.currentTime / d * 1000);
    else seek.value = 0;
    paintRange(seek);
    $('pfCur').textContent = fmt(pAudio.currentTime);
  });
  pAudio.addEventListener('loadedmetadata', function() { $('pfDur').textContent = fmt(pAudio.duration); });
  pAudio.addEventListener('durationchange', function() { $('pfDur').textContent = fmt(pAudio.duration); });

  function openPlayer() {
    $('playerFull').classList.add('open');
    if (!loaded || (Date.now() - lastLoad) > CACHE_MS) loadLibrary(false);
    else updatePlayerUI();
  }
  function closePlayer() {
    $('playerFull').classList.remove('open');
    closeList();
  }
  function openList() { $('pfList').classList.add('open'); renderList(); }
  function closeList() { $('pfList').classList.remove('open'); }

  // =============== РАДИО ===============
  var rCur = null;
  var rState = 'idle';     // idle | connecting | playing | paused | error

  function loadCustom() {
    var arr = readCache(KEY_CUSTOM);
    return (arr && arr.forEach) ? arr : [];
  }
  function saveCustom(arr) { writeCache(KEY_CUSTOM, arr); }

  function allStations() {
    var custom = loadCustom().map(function(c) {
      return { group: '⭐ Мои станции', icon: '⭐', name: c.name, genre: 'Моя станция', url: c.url, custom: true, id: c.id };
    });
    return STATIONS.concat(custom);
  }

  function stopRadio() {
    var had = !!rCur;
    try {
      rAudio.pause();
      rAudio.removeAttribute('src');
      rAudio.load();
    } catch (e) {}
    rCur = null;
    rState = 'idle';
    if (had) refreshRadioUI();
  }

  function playStation(st) {
    claim('radio');
    lastKind = 'radio';
    lastStation = st;
    saveLast();
    rCur = st;
    rState = 'connecting';
    rAudio.src = st.url;
    rAudio.volume = Audio.getMusicVolume();
    var pr = rAudio.play();
    if (pr && pr.catch) {
      pr.catch(function() {
        if (rCur === st) { rState = 'error'; refreshRadioUI(); }
      });
    }
    setSession(st.name, 'Интернет-радио', 'radio');
    refreshRadioUI();
  }

  rAudio.addEventListener('playing', function() { if (rCur) { rState = 'playing'; refreshRadioUI(); } });
  rAudio.addEventListener('waiting', function() { if (rCur && rState !== 'error') { rState = 'connecting'; refreshRadioUI(); } });
  rAudio.addEventListener('stalled', function() { if (rCur && rState === 'connecting') refreshRadioUI(); });
  rAudio.addEventListener('pause', function() {
    if (rCur && rState !== 'error') { rState = 'paused'; refreshRadioUI(); }
  });
  rAudio.addEventListener('error', function() {
    if (rCur) { rState = 'error'; refreshRadioUI(); }
  });

  function renderRadio() {
    var box = $('radioList');
    box.innerHTML = '';
    var groups = {};
    var order = [];
    allStations().forEach(function(s) {
      if (!groups[s.group]) { groups[s.group] = []; order.push(s.group); }
      groups[s.group].push(s);
    });
    order.forEach(function(g) {
      box.appendChild(el('div', 'radio-group-title', g));
      groups[g].forEach(function(s) {
        var active = !!(rCur && rCur.url === s.url);
        var row = el('div', 'station' + (active ? ' active' : ''));
        row.appendChild(el('div', 'st-ico', s.icon));
        var info = el('div', 'st-info');
        info.appendChild(el('div', 'st-name', s.name));
        info.appendChild(el('div', 'st-genre', s.genre));
        row.appendChild(info);

        var act = el('div', 'st-act');
        if (active && rState === 'connecting') { act.textContent = '⏳'; act.classList.add('spin'); }
        else if (active && rState === 'playing') act.textContent = '⏹';
        else if (active && rState === 'error') act.textContent = '⚠';
        else act.textContent = '▶';
        row.appendChild(act);

        if (s.custom) {
          var del = el('button', 'st-del', '🗑');
          del.onclick = function(e) {
            e.stopPropagation();
            if (!confirm('Удалить станцию «' + s.name + '»?')) return;
            if (rCur && rCur.url === s.url) stopRadio();
            saveCustom(loadCustom().filter(function(c) { return c.id !== s.id; }));
            refreshRadioUI();
          };
          row.appendChild(del);
        }

        row.onclick = function() {
          Audio.ensureAudio();
          if (active && (rState === 'playing' || rState === 'connecting')) {
            stopRadio();
          } else if (active && rState === 'paused') {
            claim('radio');
            rAudio.play();
          } else {
            playStation(s);
          }
        };
        box.appendChild(row);
      });
    });
  }

  function updateRadioNow() {
    var bar = $('radioNow');
    if (!rCur) { bar.classList.remove('show'); return; }
    bar.classList.add('show');
    $('rnName').textContent = rCur.name;
    var st = $('rnStatus');
    st.className = 'rn-status';
    if (rState === 'connecting') st.textContent = '⏳ Подключение…';
    else if (rState === 'playing') { st.textContent = '● В эфире'; st.classList.add('ok'); }
    else if (rState === 'paused') st.textContent = '⏸ Пауза';
    else if (rState === 'error') { st.textContent = '⚠ Станция недоступна. Попробуй другую'; st.classList.add('err'); }
    else st.textContent = '';
  }

  function refreshRadioUI() {
    renderRadio();
    updateRadioNow();
    updateStrip();
  }

  function addCustomStation() {
    var err = $('rAddErr');
    err.textContent = '';
    var name = $('rName').value.trim();
    var url = $('rUrl').value.trim();
    if (!name) { err.textContent = 'Введи название станции'; return; }
    if (!/^https:\/\//i.test(url)) { err.textContent = 'Ссылка должна начинаться с https://'; return; }
    var arr = loadCustom();
    arr.push({ id: Date.now(), name: name.slice(0, 30), url: url });
    saveCustom(arr);
    $('rName').value = '';
    $('rUrl').value = '';
    refreshRadioUI();
  }

  // =============== ПОЛОСКА «СЕЙЧАС ИГРАЕТ» ===============
  function updateStrip() {
    var txt = null;
    if (!pAudio.paused && idx >= 0 && tracks[idx]) txt = '🎧 ' + tracks[idx].title;
    else if (rCur && (rState === 'playing' || rState === 'connecting')) txt = '📻 ' + rCur.name;
    var s = $('nowStrip');
    if (txt) {
      $('nowText').textContent = 'Сейчас играет: ' + txt;
      s.style.display = 'flex';
    } else {
      s.style.display = 'none';
    }
  }

  // =============== ГРОМКОСТЬ ===============
  function syncVolume() {
    var m = Math.round(Audio.getMusicVolume() * 100);
    var s = Math.round(Audio.getSfxVolume() * 100);
    $('volMusic').value = m;
    $('volSfx').value = s;
    $('pfVol').value = m;
    $('gmVolMusic').value = m;
    $('gmVolSfx').value = s;
    $('volMusicVal').textContent = m + '%';
    $('volSfxVal').textContent = s + '%';
    paintRange($('volMusic'));
    paintRange($('volSfx'));
    paintRange($('pfVol'));
    paintRange($('gmVolMusic'));
    paintRange($('gmVolSfx'));
    pAudio.volume = Audio.getMusicVolume();
    rAudio.volume = Audio.getMusicVolume();
  }

  // =============== УПРАВЛЕНИЕ ИЗ ИГРЫ (кнопки на верхней панели) ===============
  function stationIndex(st) {
    var list = allStations();
    for (var i = 0; i < list.length; i++) if (st && list[i].url === st.url) return i;
    return -1;
  }
  function curLabel() {
    if (lastKind === 'radio' && rCur) return '📻 ' + rCur.name;
    if (lastKind === 'player' && idx >= 0 && tracks[idx]) return '🎧 ' + tracks[idx].title;
    return '';
  }
  function fallbackRadio() {
    var list = allStations();
    if (list.length) playStation(list[0]);
  }
  function startDefault() {
    // Ничего ещё не играло: сначала свои треки из папки music, а если их нет — первая радиостанция
    loadLibrary(false).then(function() {
      if (tracks.length) playIndex(0); else fallbackRadio();
    });
    return '▶ Включаю музыку…';
  }
  function mToggle() {
    Audio.ensureAudio();
    if (lastKind === 'radio') {
      if (rCur && (rState === 'playing' || rState === 'connecting')) {
        stopRadio();
        return '⏸ Радио выключено';
      }
      playStation(lastStation || allStations()[0]);
      return '📻 ' + (rCur ? rCur.name : '');
    }
    if (lastKind === 'player') {
      if (!tracks.length) {
        loadLibrary(false).then(function() {
          if (tracks.length) playIndex(0); else fallbackRadio();
        });
        return '▶ Включаю музыку…';
      }
      togglePlay();
      return pAudio.paused ? '⏸ Пауза' : curLabel();
    }
    return startDefault();
  }
  function mStep(dir) {
    Audio.ensureAudio();
    if (lastKind === 'radio') {
      var list = allStations();
      if (!list.length) return '';
      var i = stationIndex(rCur || lastStation);
      var n = (i < 0) ? 0 : (((i + dir) % list.length) + list.length) % list.length;
      playStation(list[n]);
      return '📻 ' + list[n].name;
    }
    if (lastKind === 'player' && tracks.length) {
      if (dir > 0) nextTrack(false); else prevTrack();
      return curLabel();
    }
    return mToggle();
  }

  window.PrideCore.Music = {
    toggle: mToggle,
    next: function() { return mStep(1); },
    prev: function() { return mStep(-1); },
    label: curLabel,
    isPlaying: function() {
      return (!pAudio.paused && idx >= 0) || !!(rCur && rState === 'playing');
    }
  };

  // Вспоминаем, что играло в прошлый раз
  (function restoreLast() {
    var ls = readCache(KEY_LAST_SRC);
    if (!ls || !ls.kind) return;
    lastKind = ls.kind;
    if (ls.kind === 'radio' && ls.url) {
      var list = allStations();
      for (var i = 0; i < list.length; i++) if (list[i].url === ls.url) lastStation = list[i];
      if (!lastStation) lastKind = null;
    }
  })();

  // =============== ПОДКЛЮЧЕНИЕ КНОПОК ===============
  function init() {
    $('miPlayer').onclick = function() { Audio.ensureAudio(); openPlayer(); };
    $('pfClose').onclick = closePlayer;
    $('pfListBtn').onclick = function() {
      if ($('pfList').classList.contains('open')) closeList(); else openList();
    };
    $('pfListClose').onclick = closeList;
    $('pfListRefresh').onclick = function() { loadLibrary(true); };
    $('btnPfRefresh').onclick = function() { loadLibrary(true); };
    $('pfBgBtn').onclick = function() {
      bgOffset++;
      setBackground(idx + bgOffset);
    };

    $('pfPlay').onclick = function() { Audio.ensureAudio(); togglePlay(); };
    $('pfNext').onclick = function() { Audio.ensureAudio(); nextTrack(false); };
    $('pfPrev').onclick = function() { Audio.ensureAudio(); prevTrack(); };
    $('pfShuffle').onclick = function() { shuffle = !shuffle; updatePlayerUI(); };
    $('pfRepeat').onclick = function() {
      repeat = (repeat === 'all') ? 'one' : (repeat === 'one' ? 'off' : 'all');
      updatePlayerUI();
    };

    var seek = $('pfSeek');
    seek.addEventListener('input', function() {
      dragging = true;
      paintRange(seek);
      var d = pAudio.duration;
      if (isFinite(d)) $('pfCur').textContent = fmt(seek.value / 1000 * d);
    });
    seek.addEventListener('change', function() {
      var d = pAudio.duration;
      if (isFinite(d) && d > 0) pAudio.currentTime = seek.value / 1000 * d;
      dragging = false;
    });
    seek.addEventListener('touchend', function() {
      setTimeout(function() { dragging = false; }, 80);
    });

    $('volMusic').addEventListener('input', function() { Audio.setMusicVolume($('volMusic').value / 100); });
    $('pfVol').addEventListener('input', function() { Audio.setMusicVolume($('pfVol').value / 100); });
    $('gmVolMusic').addEventListener('input', function() { Audio.setMusicVolume($('gmVolMusic').value / 100); });
    $('gmVolSfx').addEventListener('input', function() { Audio.setSfxVolume($('gmVolSfx').value / 100); });
    $('gmVolSfx').addEventListener('change', function() { Audio.ensureAudio(); Audio.playSfx('rotate'); });
    $('volSfx').addEventListener('input', function() { Audio.setSfxVolume($('volSfx').value / 100); });
    $('volSfx').addEventListener('change', function() { Audio.ensureAudio(); Audio.playSfx('rotate'); });
    $('btnVolTest').onclick = function() { Audio.ensureAudio(); Audio.playSfx('sparks'); };
    Audio.onVolume(syncVolume);

    $('btnNowStop').onclick = function() { pAudio.pause(); stopRadio(); updateStrip(); };
    $('btnRnStop').onclick = function() { stopRadio(); };
    $('btnAddStation').onclick = addCustomStation;

    var ranges = document.querySelectorAll('.rng');
    for (var i = 0; i < ranges.length; i++) {
      (function(r) { r.addEventListener('input', function() { paintRange(r); }); })(ranges[i]);
      paintRange(ranges[i]);
    }

    syncVolume();
    renderRadio();
    updatePlayerUI();
  }

  init();
})();
