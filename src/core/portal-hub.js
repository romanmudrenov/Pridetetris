window.PrideCore = window.PrideCore || {};

(function() {
  var Audio = window.PrideCore.Audio || {
    ensureAudio: function() {}, playSfx: function() {}, startMusic: function() {},
    cycleTrack: function() {}, togglePlayPauseMusic: function() {}, toggleSfx: function() { return true; },
    stopAll: function() {}
  };

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

  function showScreen(id) {
    var scr = document.querySelectorAll('.screen');
    for (var i = 0; i < scr.length; i++) scr[i].classList.toggle('active', scr[i].id === id);
    var gs = $('gameScreen');
    if (gs) gs.classList.remove('active');
    var s = $(id);
    if (s) s.scrollTop = 0;
    currentScreen = id;
    if (id === 'scrMain') refreshProfileUI();
    if (id === 'scrLeaders') renderLeaders();
    if (id === 'scrChat') renderChat(true);
  }

  function updateWelcome() {
    var users = load(KEY_USERS, {});
    var has = false;
    for (var k in users) { has = true; break; }
    var btn = $('btnGoLogin');
    if (btn) btn.style.display = has ? 'block' : 'none';
  }

  function refreshProfileUI() {
    var u = currentUser();
    if (!u) return;
    var best = (u.best && u.best.tetris) || 0;
    var ma = $('mainAvatar');
    if (ma) { ma.textContent = u.avatar; ma.style.background = u.color; }
    var mn = $('mainName');
    if (mn) mn.textContent = u.nick;
    var md = $('mainDept');
    if (md) md.textContent = u.dept;
    var mb = $('mainBest');
    if (mb) mb.textContent = best > 0 ? ('🏆 Рекорд в Tetris: ' + best + ' ₽') : 'Рекордов пока нет — сыграй в Tetris!';
    var ha = $('headerAvatar');
    if (ha) { ha.textContent = u.avatar; ha.style.background = u.color; }
    var hn = $('headerPlayerName');
    if (hn) hn.textContent = u.nick;
  }

  function paintFormAvatar() {
    var p = $('fAvatarPreview');
    if (p) { p.textContent = form.avatar; p.style.background = form.color; }
    var an = document.querySelectorAll('#fAnimalGrid .animal-opt');
    for (var i = 0; i < an.length; i++) an[i].classList.toggle('selected', an[i].getAttribute('data-animal') === form.avatar);
    var dots = document.querySelectorAll('#fColorRow .color-dot');
    for (var j = 0; j < dots.length; j++) dots[j].classList.toggle('selected', dots[j].getAttribute('data-color') === form.color);
  }

  function buildForm() {
    var g = $('fAnimalGrid');
    if (g) {
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
    }

    var cr = $('fColorRow');
    if (cr) {
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
    }

    var sel = $('fDept');
    if (sel) {
      sel.innerHTML = '';
      var ph = el('option', null, '— выбери отдел —');
      ph.value = '';
      sel.appendChild(ph);
      DEPARTMENTS.forEach(function(d) {
        var o = el('option', null, d);
        o.value = d;
        sel.appendChild(o);
      });
    }

    var tg = $('themeGrid');
    if (tg) {
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
  }

  function setDept(value) {
    var sel = $('fDept');
    if (!sel) return;
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
    var err = $('formError');
    if (err) err.textContent = '';
    var fp1 = $('fPass'); if (fp1) fp1.value = '';
    var fp2 = $('fPass2'); if (fp2) fp2.value = '';

    if (mode === 'edit' && u) {
      var ft = $('formTitle'); if (ft) ft.textContent = 'Мой профиль';
      var fn = $('fNick'); if (fn) { fn.value = u.nick; fn.disabled = true; }
      setDept(u.dept);
      form.avatar = u.avatar;
      form.color = u.color;
      form.theme = u.theme || 'neon';
      var fpt = $('fPassTitle'); if (fpt) fpt.textContent = '4. Новый пароль (необязательно)';
      if (fp1) fp1.placeholder = 'Оставь пустым, чтобы не менять';
      var fbs = $('btnFormSubmit'); if (fbs) fbs.textContent = '💾 СОХРАНИТЬ';
    } else {
      form.mode = 'register';
      var ft = $('formTitle'); if (ft) ft.textContent = 'Регистрация';
      var fn = $('fNick'); if (fn) { fn.value = ''; fn.disabled = false; }
      setDept('');
      form.avatar = ANIMALS[0];
      form.color = AVATAR_COLORS[0];
      form.theme = load(KEY_THEME, 'neon');
      var fpt = $('fPassTitle'); if (fpt) fpt.textContent = '4. Пароль';
      if (fp1) fp1.placeholder = 'Пароль (минимум 4 символа)';
      var fbs = $('btnFormSubmit'); if (fbs) fbs.textContent = '✅ СОЗДАТЬ ПРОФИЛЬ';
    }
    applyTheme(form.theme);
    paintFormAvatar();
    showScreen('scrForm');
  }

  function submitForm() {
    var err = $('formError');
    if (err) err.textContent = '';
    var deptEl = $('fDept');
    var dept = deptEl ? deptEl.value : '';
    var p1 = $('fPass') ? $('fPass').value : '';
    var p2 = $('fPass2') ? $('fPass2').value : '';

    if (form.mode === 'register') {
      var nick = $('fNick') ? $('fNick').value.replace(/\s+/g, ' ').trim() : '';
      if (nick.length < 2) { if (err) err.textContent = 'Ник — минимум 2 символа'; return; }
      var key = nick.toLowerCase();
      var existing = load(KEY_USERS, {});
      if (existing[key]) { if (err) err.textContent = 'Такой ник уже занят, выбери другой'; return; }
      if (!dept) { if (err) err.textContent = 'Выбери свой отдел'; return; }
      if (p1.length < 4) { if (err) err.textContent = 'Пароль — минимум 4 символа'; return; }
      if (p1 !== p2) { if (err) err.textContent = 'Пароли не совпадают'; return; }

      var salt = randSalt();
      hashPass(salt, p1).then(function(h) {
        var users = load(KEY_USERS, {});
        users[key] = {
          key: key, nick: nick, dept: dept,
          avatar: form.avatar, color: form.color, theme: form.theme,
          salt: salt, hash: h, best: {}, created: Date.now()
        };
        if (!save(KEY_USERS, users)) {
          if (err) err.textContent = 'Не удалось сохранить: память браузера недоступна';
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
      if (!dept) { if (err) err.textContent = 'Выбери свой отдел'; return; }
      var changePass = (p1.length > 0 || p2.length > 0);
      if (changePass) {
        if (p1.length < 4) { if (err) err.textContent = 'Новый пароль — минимум 4 символа'; return; }
        if (p1 !== p2) { if (err) err.textContent = 'Пароли не совпадают'; return; }
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

  function openLogin() {
    var le = $('loginError'); if (le) le.textContent = '';
    var ln = $('lNick'); if (ln) ln.value = load(KEY_LAST, '') || '';
    var lp = $('lPass'); if (lp) lp.value = '';
    showScreen('scrLogin');
  }

  function doLogin() {
    var err = $('loginError');
    if (err) err.textContent = '';
    var nick = $('lNick') ? $('lNick').value.replace(/\s+/g, ' ').trim() : '';
    var pass = $('lPass') ? $('lPass').value : '';
    var users = load(KEY_USERS, {});
    var u = users[nick.toLowerCase()];
    if (!u) { if (err) err.textContent = 'Неверный ник или пароль'; return; }
    hashPass(u.salt, pass).then(function(h) {
      if (h !== u.hash) { if (err) err.textContent = 'Неверный ник или пароль'; return; }
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
    if (Audio.stopAll) Audio.stopAll(); else Audio.startMusic('off');
    currentGame = null;
    for (var id in games) {
      if (games[id] && games[id].onReset) games[id].onReset();
    }
    applyTheme(load(KEY_THEME, 'neon'));
    updateWelcome();
    showScreen('scrWelcome');
  }

  function renderGames() {
    var box = $('gamesList');
    if (!box) return;
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
    var gs = $('gameScreen');
    if (gs) gs.classList.add('active');
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

  function renderLeaders() {
    var box = $('leaderList');
    if (!box) return;
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

  function fmtTime(t) {
    var d = new Date(t);
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  function renderChat(scrollDown) {
    var list = $('chatList');
    if (!list) return;
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
    if (!inp) return;
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

  function bindMusic() {
    var tb = document.querySelectorAll('.track-btn[data-track]');
    for (var i = 0; i < tb.length; i++) {
      tb[i].onclick = function(e) {
        e.stopPropagation();
        Audio.ensureAudio();
        Audio.startMusic(this.getAttribute('data-track'));
      };
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
    var bmp = $('btnMusicPrev'); if (bmp) bmp.onclick = function() { Audio.ensureAudio(); Audio.cycleTrack(-1); };
    var bml = $('btnMusicPlay'); if (bml) bml.onclick = function() { Audio.ensureAudio(); Audio.togglePlayPauseMusic(); };
    var bmn = $('btnMusicNext'); if (bmn) bmn.onclick = function() { Audio.ensureAudio(); Audio.cycleTrack(1); };
  }

  function bindEvents() {
    var bgReg = $('btnGoRegister'); if (bgReg) bgReg.onclick = function() { Audio.ensureAudio(); openForm('register'); };
    var bgLog = $('btnGoLogin'); if (bgLog) bgLog.onclick = function() { Audio.ensureAudio(); openLogin(); };
    var bfs = $('btnFormSubmit'); if (bfs) bfs.onclick = function() { Audio.ensureAudio(); submitForm(); };
    var bfb = $('btnFormBack'); if (bfb) bfb.onclick = function() {
      if (form.mode === 'edit') {
        var u = currentUser();
        if (u) applyTheme(u.theme || 'neon');
        showScreen('scrMain');
      } else {
        showScreen('scrWelcome');
      }
    };
    var bls = $('btnLoginSubmit'); if (bls) bls.onclick = function() { Audio.ensureAudio(); doLogin(); };
    var lp = $('lPass'); if (lp) lp.addEventListener('keydown', function(e) { if (e.key === 'Enter') doLogin(); });
    var bep = $('btnEditProfile'); if (bep) bep.onclick = function() { openForm('edit'); };
    var bo = $('btnLogout'); if (bo) bo.onclick = logout;
    var bcs = $('btnChatSend'); if (bcs) bcs.onclick = sendChat;
    var ci = $('chatInput'); if (ci) ci.addEventListener('keydown', function(e) { if (e.key === 'Enter') sendChat(); });

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
    showScreen: showScreen,
    getPlayerName: function() { var u = currentUser(); return u ? u.nick : 'Игрок'; },
    getUser: currentUser,
    refreshProfileUI: refreshProfileUI
  };

  boot();
})();
