window.PrideCore = window.PrideCore || {};

(function() {
  var Audio = window.PrideCore.Audio || {
    ensureAudio: function() {}, playSfx: function() {}, startMusic: function() {},
    cycleTrack: function() {}, togglePlayPauseMusic: function() {}, toggleSfx: function() { return true; }
  };

  // =============== НАСТРОЙКИ (можно менять) ===============
  var DEPARTMENTS = [
    "Креатив / Дизайн", "Производство", "Монтаж и логистика", "Менеджеры проектов",
    "Продажи", "Закупки", "Бухгалтерия и финансы", "IT", "HR", "Руководство", "Другое"
  ];
  var ANIMALS = ["🦁", "🐯", "🐺", "🦊", "🐻", "🐼", "🦅", "🦈", "🐲", "🦍"];
  var AVATAR_COLORS = ["#ff007a", "#00f0ff", "#00ff9d", "#fcee09", "#b829ff", "#ff8800"];
  var THEMES = [
    { id: "neon",   name: "Неон PRIDE",   bg: "#0b0714", c1: "#ff007a", c2: "#00f0ff", c3: "#fcee09" },
    { id: "ocean",  name: "Океан",        bg: "#04121c", c1: "#ff6b6b", c2: "#22d3ee", c3: "#ffd166" },
    { id: "sunset", name: "Закат",        bg: "#16080a", c1: "#ff5e3a", c2: "#ffb703", c3: "#ffe29a" },
    { id: "forest", name: "Матрица",      bg: "#030d07", c1: "#e5ff3a", c2: "#2bff88", c3: "#fff176" },
    { id: "light",  name: "Светлый офис", bg: "#eef1f8", c1: "#d6336c", c2: "#2563eb", c3: "#b7791f" },
    { id: "royal",  name: "Золото",       bg: "#0c0a06", c1: "#b3123c", c2: "#e6b84a", c3: "#f6e3a1" }
  ];
  var GAMES = [
    { id: "tetris", icon: "🧱", title: "PRIDE Tetris 3D", desc: "Собирай проекты, закрывай дедлайны, расти бюджет" },
    { id: "soon1",  icon: "🎯", title: "Новая игра", desc: "Скоро в портале", soon: true },
    { id: "soon2",  icon: "🧩", title: "Новая игра", desc: "Скоро в портале", soon: true }
  ];

  // =============== ХРАНИЛИЩЕ ===============
  var KEY_USERS = 'pride_users_v1';
  var KEY_SESSION = 'pride_session_v1';
  var KEY_THEME = 'pride_theme_v1';
  var KEY_CHAT = 'pride_chat_v1';
  var KEY_LAST = 'pride_last_nick_v1';

  function $(id) { return document.getElementById(id); }
  function load(key, def) {
    try {
      var v = localStorage.getItem(key);
      return v ? JSON.parse(v) : def;
    } catch (e) { return def; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; }
  }
  function removeKey(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }

  // =============== ПАРОЛИ ===============
  function simpleHash(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return 'd:' + h;
  }
  function hashPass(salt, pass) {
    var s = salt + '|' + pass;
    try {
      if (window.crypto && window.crypto.subtle && window.TextEncoder) {
        return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function(buf) {
          var arr = new Uint8Array(buf), out = '';
          for (var i = 0; i < arr.length; i++) out += ('0' + arr[i].toString(16)).slice(-2);
          return 's:' + out;
        }).catch(function() { return simpleHash(s); });
      }
    } catch (e) {}
    return Promise.resolve(simpleHash(s));
  }
  function randSalt() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  // =============== СОСТОЯНИЕ ===============
  var games = {};
  var currentGame = null;
  var currentScreen = 'scrWelcome';
  var form = { mode: 'register', avatar: ANIMALS[0], color: AVATAR_COLORS[0], theme: 'neon' };

  function currentUser() {
    var key = load(KEY_SESSION, null);
    if (!key) return null;
    var users = load(KEY_USERS, {});
    return users[key] || null;
  }

  // =============== ТЕМЫ ===============
  function markThemeCards(id) {
    var cards = document.querySelectorAll('.theme-card');
    for (var i = 0; i < cards.length; i++) {
      cards[i].classList.toggle('selected', cards[i].getAttribute('data-theme-id') === id);
    }
  }
  function applyTheme(id) {
    var ok = false;
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) ok = true;
    if (!ok) id = 'neon';
    document.documentElement.setAttribute('data-theme', id);
    save(KEY_THEME, id);
    markThemeCards(id);
  }

  // =============== ЭКРАНЫ ===============
  function showScreen(id) {
    var scr = document.querySelectorAll('.screen');
    for (var i = 0; i < scr.length; i++) scr[i].classList.toggle('active', scr[i].id === id);
    $('gameScreen').classList.remove('active');
    var s = $(id);
    if (s) s.scrollTop = 0;
    currentScreen = id;
    if (id === 'scrMain') refreshProfileUI();
    if (id === 'scrLeaders') renderLeaders();
    if (id === 'scrChat') renderChat(true);
    if (id === 'scrMusic' && Audio.syncVolumeSlidersUI) Audio.syncVolumeSlidersUI();
  }

  function updateWelcome() {
    var users = load(KEY_USERS, {});
    var has = false;
    for (var k in users) { has = true; break; }
    $('btnGoLogin').style.display = has ? 'block' : 'none';
  }

  // =============== ПРОФИЛЬ ===============
  function refreshProfileUI() {
    var u = currentUser();
    if (!u) return;
    var best = (u.best && u.best.tetris) || 0;
    var ma = $('mainAvatar');
    ma.textContent = u.avatar;
    ma.style.background = u.color;
    $('mainName').textContent = u.nick;
    $('mainDept').textContent = u.dept;
    $('mainBest').textContent = best > 0 ? ('🏆 Рекорд в Tetris: ' + best + ' ₽') : 'Рекордов пока нет — сыграй в Tetris!';
    var ha = $('headerAvatar');
    if (ha) { ha.textContent = u.avatar; ha.style.background = u.color; }
    var hn = $('headerPlayerName');
    if (hn) hn.textContent = u.nick;
  }

  // =============== ФОРМА РЕГИСТРАЦИИ / РЕДАКТИРОВАНИЯ ===============
  function paintFormAvatar() {
    var p = $('fAvatarPreview');
    p.textContent = form.avatar;
    p.style.background = form.color;
    var an = document.querySelectorAll('#fAnimalGrid .animal-opt');
    for (var i = 0; i < an.length; i++) an[i].classList.toggle('selected', an[i].getAttribute('data-animal') === form.avatar);
    var dots = document.querySelectorAll('#fColorRow .color-dot');
    for (var j = 0; j < dots.length; j++) dots[j].classList.toggle('selected', dots[j].getAttribute('data-color') === form.color);
  }

  function buildForm() {
    var g = $('fAnimalGrid');
    g.innerHTML = '';
    ANIMALS.forEach(function(a) {
      var b = el('button', 'animal-opt', a);
      b.type = 'button';
      b.setAttribute('data-animal', a);
      b.onclick = function() {
        Audio.ensureAudio();
        form.avatar = a;
        paintFormAvatar();
        Audio.playSfx('rotate');
      };
      g.appendChild(b);
    });

    var cr = $('fColorRow');
    cr.innerHTML = '';
    AVATAR_COLORS.forEach(function(c) {
      var d = el('div', 'color-dot');
      d.style.background = c;
      d.setAttribute('data-color', c);
      d.onclick = function() {
        Audio.ensureAudio();
        form.color = c;
        paintFormAvatar();
        Audio.playSfx('move');
      };
      cr.appendChild(d);
    });

    var sel = $('fDept');
    sel.innerHTML = '';
    var ph = el('option', null, '— выбери отдел —');
    ph.value = '';
    sel.appendChild(ph);
    DEPARTMENTS.forEach(function(d) {
      var o = el('option', null, d);
      o.value = d;
      sel.appendChild(o);
    });

    var tg = $('themeGrid');
    tg.innerHTML = '';
    THEMES.forEach(function(t) {
      var b = el('button', 'theme-card');
      b.type = 'button';
      b.setAttribute('data-theme-id', t.id);
      var sw = el('div', 'theme-sw');
      sw.style.background = t.bg;
      [t.c1, t.c2, t.c3].forEach(function(c) {
        var s = el('span');
        s.style.background = c;
        sw.appendChild(s);
      });
      b.appendChild(sw);
      b.appendChild(el('div', 'theme-name', t.name));
      b.onclick = function() {
        Audio.ensureAudio();
        form.theme = t.id;
        applyTheme(t.id);
        Audio.playSfx('rotate');
      };
      tg.appendChild(b);
    });
  }

  function setDept(value) {
    var sel = $('fDept');
    var found = false;
    for (var i = 0; i < sel.options.length; i++) if (sel.options[i].value === value) found = true;
    if (!found && value) {
      var o = el('option', null, value);
      o.value = value;
      sel.appendChild(o);
    }
    sel.value = value || '';
  }

  function openForm(mode) {
    var u = currentUser();
    form.mode = mode;
    $('formError').textContent = '';
    $('fPass').value = '';
    $('fPass2').value = '';

    if (mode === 'edit' && u) {
      $('formTitle').textContent = 'Мой профиль';
      $('fNick').value = u.nick;
      $('fNick').disabled = true;
      setDept(u.dept);
      form.avatar = u.avatar;
      form.color = u.color;
      form.theme = u.theme || 'neon';
      $('fPassTitle').textContent = '4. Новый пароль (необязательно)';
      $('fPass').placeholder = 'Оставь пустым, чтобы не менять';
      $('btnFormSubmit').textContent = '💾 СОХРАНИТЬ';
    } else {
      form.mode = 'register';
      $('formTitle').textContent = 'Регистрация';
      $('fNick').value = '';
      $('fNick').disabled = false;
      setDept('');
      form.avatar = ANIMALS[0];
      form.color = AVATAR_COLORS[0];
      form.theme = load(KEY_THEME, 'neon');
      $('fPassTitle').textContent = '4. Пароль';
      $('fPass').placeholder = 'Пароль (минимум 4 символа)';
      $('btnFormSubmit').textContent = '✅ СОЗДАТЬ ПРОФИЛЬ';
    }
    applyTheme(form.theme);
    paintFormAvatar();
    showScreen('scrForm');
  }

  function submitForm() {
    var err = $('formError');
    err.textContent = '';
    var dept = $('fDept').value;
    var p1 = $('fPass').value;
    var p2 = $('fPass2').value;

    if (form.mode === 'register') {
      var nick = $('fNick').value.replace(/\s+/g, ' ').trim();
      if (nick.length < 2) { err.textContent = 'Ник — минимум 2 символа'; return; }
      var key = nick.toLowerCase();
      var existing = load(KEY_USERS, {});
      if (existing[key]) { err.textContent = 'Такой ник уже занят, выбери другой'; return; }
      if (!dept) { err.textContent = 'Выбери свой отдел'; return; }
      if (p1.length < 4) { err.textContent = 'Пароль — минимум 4 символа'; return; }
      if (p1 !== p2) { err.textContent = 'Пароли не совпадают'; return; }

      var salt = randSalt();
      hashPass(salt, p1).then(function(h) {
        var users = load(KEY_USERS, {});
        users[key] = {
          key: key, nick: nick, dept: dept,
          avatar: form.avatar, color: form.color, theme: form.theme,
          salt: salt, hash: h, best: {}, created: Date.now()
        };
        if (!save(KEY_USERS, users)) {
          err.textContent = 'Не удалось сохранить: память браузера недоступна';
          return;
        }
        save(KEY_SESSION, key);
        save(KEY_LAST, nick);
        applyTheme(form.theme);
        Audio.playSfx('sparks');
        showScreen('scrMain');
      });
    } else {
      var me = currentUser();
      if (!me) { showScreen('scrWelcome'); return; }
      if (!dept) { err.textContent = 'Выбери свой отдел'; return; }
      var changePass = (p1.length > 0 || p2.length > 0);
      if (changePass) {
        if (p1.length < 4) { err.textContent = 'Новый пароль — минимум 4 символа'; return; }
        if (p1 !== p2) { err.textContent = 'Пароли не совпадают'; return; }
      }
      var finish = function(extra) {
        var users = load(KEY_USERS, {});
        var u = users[me.key];
        if (!u) return;
        u.dept = dept;
        u.avatar = form.avatar;
        u.color = form.color;
        u.theme = form.theme;
        if (extra) { u.salt = extra.salt; u.hash = extra.hash; }
        save(KEY_USERS, users);
        applyTheme(form.theme);
        Audio.playSfx('sparks');
        showScreen('scrMain');
      };
      if (changePass) {
        var salt2 = randSalt();
        hashPass(salt2, p1).then(function(h) { finish({ salt: salt2, hash: h }); });
      } else {
        finish(null);
      }
    }
  }

  // =============== ВХОД / ВЫХОД ===============
  function openLogin() {
    $('loginError').textContent = '';
    $('lNick').value = load(KEY_LAST, '') || '';
    $('lPass').value = '';
    showScreen('scrLogin');
  }

  function doLogin() {
    var err = $('loginError');
    err.textContent = '';
    var nick = $('lNick').value.replace(/\s+/g, ' ').trim();
    var pass = $('lPass').value;
    var users = load(KEY_USERS, {});
    var u = users[nick.toLowerCase()];
    if (!u) { err.textContent = 'Неверный ник или пароль'; return; }
    hashPass(u.salt, pass).then(function(h) {
      if (h !== u.hash) { err.textContent = 'Неверный ник или пароль'; return; }
      save(KEY_SESSION, u.key);
      save(KEY_LAST, u.nick);
      applyTheme(u.theme || 'neon');
      Audio.playSfx('sparks');
      showScreen('scrMain');
    });
  }

  function logout() {
    if (!confirm('Выйти из профиля?')) return;
    removeKey(KEY_SESSION);
    Audio.startMusic('off');
    currentGame = null;
    for (var id in games) {
      if (games[id] && games[id].onReset) games[id].onReset();
    }
    applyTheme(load(KEY_THEME, 'neon'));
    updateWelcome();
    showScreen('scrWelcome');
  }

  // =============== ИГРЫ ===============
  function renderGames() {
    var box = $('gamesList');
    box.innerHTML = '';
    GAMES.forEach(function(g) {
      var card = el('div', 'game-card' + (g.soon ? ' soon' : ''));
      card.appendChild(el('div', 'gc-ico', g.icon));
      var info = el('div', 'gc-info');
      info.appendChild(el('div', 'gc-title', g.title));
      info.appendChild(el('div', 'gc-desc', g.desc));
      card.appendChild(info);
      if (g.soon) {
        card.appendChild(el('div', 'gc-soon', 'СКОРО'));
      } else {
        var b = el('button', 'gc-play', '▶ ИГРАТЬ');
        b.onclick = function() { Audio.ensureAudio(); openGame(g.id); };
        card.appendChild(b);
      }
      box.appendChild(card);
    });
  }

  function registerGame(id, api) {
    games[id] = api;
  }

  function openGame(id) {
    var g = games[id];
    if (!g) { alert('Игра ещё не загрузилась. Обнови страницу.'); return; }
    var scr = document.querySelectorAll('.screen');
    for (var i = 0; i < scr.length; i++) scr[i].classList.remove('active');
    $('gameScreen').classList.add('active');
    currentGame = id;
    currentScreen = 'game';
    refreshProfileUI();
    try { window.dispatchEvent(new Event('resize')); } catch (e) {}
    setTimeout(function() {
      try { window.dispatchEvent(new Event('resize')); } catch (e) {}
    }, 120);
    if (g.onOpen) g.onOpen();
  }

  function exitToMenu() {
    if (currentGame && games[currentGame] && games[currentGame].onClose) games[currentGame].onClose();
    currentGame = null;
    showScreen('scrMain');
  }

  function submitScore(gameId, score) {
    var key = load(KEY_SESSION, null);
    if (!key || !(score > 0)) return false;
    var users = load(KEY_USERS, {});
    var u = users[key];
    if (!u) return false;
    u.best = u.best || {};
    if (score > (u.best[gameId] || 0)) {
      u.best[gameId] = score;
      save(KEY_USERS, users);
      return true;
    }
    return false;
  }

  // =============== ТАБЛИЦА ЛИДЕРОВ ===============
  function renderLeaders() {
    var box = $('leaderList');
    box.innerHTML = '';
    var users = load(KEY_USERS, {});
    var me = currentUser();
    var arr = [];
    for (var k in users) {
      var s = (users[k].best && users[k].best.tetris) || 0;
      if (s > 0) arr.push({ u: users[k], s: s });
    }
    arr.sort(function(a, b) { return b.s - a.s; });
    arr = arr.slice(0, 20);
    if (!arr.length) {
      box.appendChild(el('div', 'empty-box', 'Пока нет результатов. Сыграй первым в Tetris!'));
      return;
    }
    var medals = ['🥇', '🥈', '🥉'];
    arr.forEach(function(it, i) {
      var row = el('div', 'leader-row' + (me && me.key === it.u.key ? ' me' : ''));
      row.appendChild(el('div', 'lr-rank', medals[i] || String(i + 1)));
      var ava = el('div', 'lr-ava', it.u.avatar);
      ava.style.background = it.u.color;
      row.appendChild(ava);
      var info = el('div', 'lr-info');
      info.appendChild(el('div', 'lr-name', it.u.nick));
      info.appendChild(el('div', 'lr-dept', it.u.dept));
      row.appendChild(info);
      row.appendChild(el('div', 'lr-score', it.s + ' ₽'));
      box.appendChild(row);
    });
  }

  // =============== ЧАТ ===============
  function fmtTime(t) {
    var d = new Date(t);
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  function renderChat(scrollDown) {
    var list = $('chatList');
    list.innerHTML = '';
    var msgs = load(KEY_CHAT, []);
    var me = currentUser();
    if (!msgs.length) {
      list.appendChild(el('div', 'empty-box', 'Сообщений пока нет. Напиши первым!'));
    }
    msgs.forEach(function(m) {
      var mine = me && m.key === me.key;
      var row = el('div', 'msg' + (mine ? ' mine' : ''));
      var ava = el('div', 'msg-ava', m.avatar);
      ava.style.background = m.color;
      row.appendChild(ava);
      var body = el('div', 'msg-body');
      var head = el('div', 'msg-head');
      head.appendChild(el('b', null, m.nick));
      head.appendChild(document.createTextNode(' · ' + (m.dept || '') + ' · ' + fmtTime(m.t)));
      body.appendChild(head);
      body.appendChild(el('div', 'msg-text', m.text));
      row.appendChild(body);
      list.appendChild(row);
    });
    if (scrollDown) list.scrollTop = list.scrollHeight;
  }

  function sendChat() {
    var inp = $('chatInput');
    var text = inp.value.trim();
    var me = currentUser();
    if (!text || !me) return;
    text = text.slice(0, 300);
    var msgs = load(KEY_CHAT, []);
    msgs.push({ key: me.key, nick: me.nick, dept: me.dept, avatar: me.avatar, color: me.color, text: text, t: Date.now() });
    if (msgs.length > 100) msgs = msgs.slice(-100);
    save(KEY_CHAT, msgs);
    inp.value = '';
    renderChat(true);
    Audio.playSfx('move');
  }

  // =============== МУЗЫКА, РАДИО И ПОЛНОЭКРАННЫЙ ПЛЕЕР ===============
  function bindMusic() {
    var tabs = document.querySelectorAll('.m-tab[data-mtab]');
    for (var t = 0; t < tabs.length; t++) {
      tabs[t].onclick = function() {
        Audio.ensureAudio();
        var targetId = this.getAttribute('data-mtab');
        for (var k = 0; k < tabs.length; k++) {
          tabs[k].classList.toggle('active', tabs[k] === this);
        }
        var panels = document.querySelectorAll('.m-panel');
        for (var p = 0; p < panels.length; p++) {
          panels[p].classList.toggle('active', panels[p].id === targetId);
        }
        Audio.playSfx('move');
      };
    }

    var radioBox = $('radioList');
    if (radioBox && Audio.getRadioStations) {
      radioBox.innerHTML = '';
      var stations = Audio.getRadioStations();
      stations.forEach(function(st) {
        var card = el('div', 'radio-card');
        card.setAttribute('data-track', st.id);
        card.appendChild(el('div', 'rc-ico', st.emoji || '📻'));
        var info = el('div', 'rc-info');
        info.appendChild(el('div', 'rc-name', st.title));
        info.appendChild(el('div', 'rc-genre', st.artist));
        card.appendChild(info);
        card.appendChild(el('div', 'rc-live', '▶ LIVE'));
        card.onclick = function() {
          Audio.ensureAudio();
          Audio.startMusic(st.id);
        };
        radioBox.appendChild(card);
      });
    }

    var drawerList = $('fpDrawerList');
    if (drawerList && Audio.getAllCatalogItems) {
      drawerList.innerHTML = '';
      Audio.getAllCatalogItems().forEach(function(item) {
        var row = el('button', 'fp-drawer-item');
        row.setAttribute('data-track', item.id);
        row.appendChild(el('span', null, item.shortName + ' — ' + item.title));
        row.appendChild(el('small', null, item.kind.toUpperCase()));
        row.onclick = function() {
          Audio.ensureAudio();
          Audio.startMusic(item.id);
          $('fpDrawer').classList.remove('open');
        };
        drawerList.appendChild(row);
      });
    }

    var tb = document.querySelectorAll('.track-btn[data-track]');
    for (var i = 0; i < tb.length; i++) {
      tb[i].onclick = function(e) {
        e.stopPropagation();
        Audio.ensureAudio();
        Audio.startMusic(this.getAttribute('data-track'));
      };
    }

    var mSliders = document.querySelectorAll('.music-vol-slider');
    for (var m = 0; m < mSliders.length; m++) {
      mSliders[m].addEventListener('input', function() {
        Audio.ensureAudio();
        if (Audio.setMusicVolume) Audio.setMusicVolume(parseInt(this.value, 10) / 100);
      });
    }

    var sSliders = document.querySelectorAll('.sfx-vol-slider');
    for (var s = 0; s < sSliders.length; s++) {
      sSliders[s].addEventListener('input', function() {
        Audio.ensureAudio();
        if (Audio.setSfxVolume) Audio.setSfxVolume(parseInt(this.value, 10) / 100);
      });
      sSliders[s].addEventListener('change', function() {
        Audio.playSfx('rotate');
      });
    }

    var sfx = document.querySelectorAll('.sfx-toggle');
    for (var j = 0; j < sfx.length; j++) {
      sfx[j].onclick = function(e) {
        e.stopPropagation();
        Audio.ensureAudio();
        var state = Audio.toggleSfx();
        var all = document.querySelectorAll('.sfx-toggle');
        for (var k = 0; k < all.length; k++) {
          all[k].textContent = state ? 'ВКЛ' : 'ВЫКЛ';
          all[k].classList.toggle('active', state);
        }
      };
    }

    if ($('btnTestRotate')) $('btnTestRotate').onclick = function() { Audio.ensureAudio(); Audio.playSfx('rotate'); };
    if ($('btnTestLaser'))  $('btnTestLaser').onclick  = function() { Audio.ensureAudio(); Audio.playSfx('laser'); };
    if ($('btnTestSparks')) $('btnTestSparks').onclick = function() { Audio.ensureAudio(); Audio.playSfx('sparks'); };

    $('btnMusicPrev').onclick = function(e) { e.stopPropagation(); Audio.ensureAudio(); Audio.cycleTrack(-1); };
    $('btnMusicPlay').onclick = function(e) { e.stopPropagation(); Audio.ensureAudio(); Audio.togglePlayPauseMusic(); };
    $('btnMusicNext').onclick = function(e) { e.stopPropagation(); Audio.ensureAudio(); Audio.cycleTrack(1); };

    if ($('btnOpenFullPlayer'))   $('btnOpenFullPlayer').onclick   = function() { Audio.ensureAudio(); Audio.openFullPlayer(); };
    if ($('btnLaunchFullPlayer')) $('btnLaunchFullPlayer').onclick = function() { Audio.ensureAudio(); Audio.openFullPlayer(); };
    if ($('npThumb'))             $('npThumb').onclick             = function() { Audio.ensureAudio(); Audio.openFullPlayer(); };
    if ($('btnCloseFullPlayer'))  $('btnCloseFullPlayer').onclick  = function() { Audio.closeFullPlayer(); };

    if ($('fpBtnPrev')) $('fpBtnPrev').onclick = function() { Audio.ensureAudio(); Audio.cycleTrack(-1); };
    if ($('fpBtnPlay')) $('fpBtnPlay').onclick = function() { Audio.ensureAudio(); Audio.togglePlayPauseMusic(); };
    if ($('fpBtnNext')) $('fpBtnNext').onclick = function() { Audio.ensureAudio(); Audio.cycleTrack(1); };

    if ($('fpBtnMode')) {
      $('fpBtnMode').onclick = function() {
        var loop = Audio.toggleLoopMode ? Audio.toggleLoopMode() : true;
        this.textContent = loop ? '🔁' : '➡️';
        Audio.playSfx('move');
      };
    }

    if ($('fpBtnMute')) {
      var prevVol = 0.7;
      $('fpBtnMute').onclick = function() {
        if (Audio.getMusicVolume() > 0.01) {
          prevVol = Audio.getMusicVolume();
          Audio.setMusicVolume(0);
        } else {
          Audio.setMusicVolume(prevVol || 0.7);
        }
      };
    }

    if ($('fpSeek')) {
      $('fpSeek').addEventListener('input', function() {
        if (Audio.seekToPercent) Audio.seekToPercent(parseFloat(this.value));
      });
    }

    if ($('btnToggleFpDrawer')) {
      $('btnToggleFpDrawer').onclick = function() {
        $('fpDrawer').classList.toggle('open');
      };
    }
    if ($('btnCloseFpDrawer')) {
      $('btnCloseFpDrawer').onclick = function() {
        $('fpDrawer').classList.remove('open');
      };
    }
  }

  // =============== ЗАПУСК ===============
  function bindEvents() {
    $('btnGoRegister').onclick = function() { Audio.ensureAudio(); openForm('register'); };
    $('btnGoLogin').onclick = function() { Audio.ensureAudio(); openLogin(); };
    $('btnFormSubmit').onclick = function() { Audio.ensureAudio(); submitForm(); };
    $('btnFormBack').onclick = function() {
      if (form.mode === 'edit') {
        var u = currentUser();
        if (u) applyTheme(u.theme || 'neon');
        showScreen('scrMain');
      } else {
        showScreen('scrWelcome');
      }
    };
    $('btnLoginSubmit').onclick = function() { Audio.ensureAudio(); doLogin(); };
    $('lPass').addEventListener('keydown', function(e) { if (e.key === 'Enter') doLogin(); });
    $('btnEditProfile').onclick = function() { openForm('edit'); };
    $('btnLogout').onclick = logout;
    $('btnChatSend').onclick = sendChat;
    $('chatInput').addEventListener('keydown', function(e) { if (e.key === 'Enter') sendChat(); });

    var goBtns = document.querySelectorAll('[data-go]');
    for (var i = 0; i < goBtns.length; i++) {
      goBtns[i].onclick = function() {
        Audio.ensureAudio();
        showScreen(this.getAttribute('data-go'));
      };
    }

    window.addEventListener('storage', function(e) {
      if (currentScreen === 'scrChat' && e.key === KEY_CHAT) renderChat(true);
    });
  }

  function boot() {
    buildForm();
    renderGames();
    bindMusic();
    bindEvents();

    var u = currentUser();
    if (u) {
      applyTheme(u.theme || 'neon');
      showScreen('scrMain');
    } else {
      applyTheme(load(KEY_THEME, 'neon'));
      updateWelcome();
      showScreen('scrWelcome');
    }
  }

  window.PrideCore.Hub = {
    registerGame: registerGame,
    openGame: openGame,
    exitToMenu: exitToMenu,
    submitScore: submitScore,
    getPlayerName: function() { var u = currentUser(); return u ? u.nick : 'Игрок'; },
    getUser: currentUser,
    refreshProfileUI: refreshProfileUI
  };

  boot();
})();
