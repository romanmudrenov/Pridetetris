window.onerror = function(m, s, l) {
  alert("ОШИБКА: " + m + "\n" + String(s || "").split("/").pop() + " строка " + l);
};

window.PrideCore = window.PrideCore || {};

(function() {
  var audioCtx = null;
  var sfxEnabled = true;
  var currentTrack = "off";
  var lastActiveTrack = "m1";
  var isGamePausedOrOver = function() { return false; };
  var statusText = "🔇 Музыка выключена";

  var CUSTOM_RADIO_KEY = "pride_custom_radio_v1";

  // 1. Твои ИИ-треки из папки ./music/ в репозитории
  // Если файл в папку music/ ещё не загружен, автоматически включится backup-ссылка
  var LOCAL_TRACKS = {
    "m1": { name: "🎵 1. Cyber Pride AI",   src: "./music/track1.mp3", backup: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    "m2": { name: "🎵 2. Neon Agency AI",   src: "./music/track2.mp3", backup: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" },
    "m3": { name: "🎵 3. Techno Rush AI",   src: "./music/track3.mp3", backup: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
    "m4": { name: "🎵 4. Digital Horizon",  src: "./music/track4.mp3", backup: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
    "m5": { name: "🎵 5. Night Print Shop", src: "./music/track5.mp3", backup: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
    "m6": { name: "🎵 6. Mega Billboard",   src: "./music/track6.mp3", backup: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3" }
  };

  // 2. Бесплатные онлайн-радиостанции (HTTPS потоки)
  var RADIO_STATIONS = {
    "r1": { name: "📻 Nightride Synthwave", genre: "Retrowave / Cyber", url: "https://stream.nightride.fm/nightride.m4a" },
    "r2": { name: "📻 Chillsynth FM",       genre: "Chill / Lo-Fi",     url: "https://stream.nightride.fm/chillsynth.m4a" },
    "r3": { name: "📻 Groove Salad",        genre: "Ambient / Work",    url: "https://ice2.somafm.com/groovesalad-128-mp3" },
    "r4": { name: "📻 DEF CON Radio",       genre: "Electro / Hacker",  url: "https://ice2.somafm.com/defcon-128-mp3" },
    "r5": { name: "📻 Secret Agent",        genre: "Lounge / Spy",      url: "https://ice2.somafm.com/secretagent-128-mp3" },
    "r6": { name: "📻 Space Station",       genre: "Deep Space",        url: "https://ice2.somafm.com/spacestation-128-mp3" }
  };

  var TRACK_ORDER = ["m1", "m2", "m3", "m4", "m5", "m6", "r1", "r2", "r3", "r4", "r5", "r6"];

  function getCustomRadioUrl() {
    try { return localStorage.getItem(CUSTOM_RADIO_KEY) || ""; } catch (e) { return ""; }
  }

  function saveCustomRadioUrl(url) {
    try { localStorage.setItem(CUSTOM_RADIO_KEY, url); } catch (e) {}
  }

  function getTrackTitle(key) {
    if (key === "off") return "🔇 Выкл";
    if (LOCAL_TRACKS[key]) return LOCAL_TRACKS[key].name;
    if (RADIO_STATIONS[key]) return RADIO_STATIONS[key].name;
    if (key === "rcustom") return "📻 Свой поток";
    return "🎵 Музыка";
  }

  function isRadio(key) {
    return key === "rcustom" || !!RADIO_STATIONS[key];
  }

  function isMp3Track(key) {
    return key !== "off" && (!!LOCAL_TRACKS[key] || isRadio(key));
  }

  function getBgAudio() {
    return document.getElementById('bgAudio');
  }

  function setStatus(txt) {
    statusText = txt;
    var el1 = document.getElementById('musicStatusBar');
    if (el1) el1.textContent = txt;
    var el2 = document.getElementById('menuMusicStatusBar');
    if (el2) el2.textContent = txt;
  }

  function updateTrackUI() {
    var lbl = document.getElementById('sideTrackLbl');
    if (lbl) lbl.innerText = getTrackTitle(currentTrack);
    var allTrackBtns = document.querySelectorAll('.track-btn[data-track]');
    for (var k = 0; k < allTrackBtns.length; k++) {
      var tk = allTrackBtns[k].getAttribute('data-track');
      allTrackBtns[k].classList.toggle('active', tk === currentTrack);
    }
  }

  function ensureAudio() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // Звуковые эффекты игры (SFX)
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
      var gL = audioCtx.createOscillator ? audioCtx.createGain() : null;
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

  function stopStream(bgAudio) {
    if (!bgAudio) return;
    bgAudio.onplaying = null;
    bgAudio.onerror = null;
    bgAudio.onwaiting = null;
    try {
      bgAudio.pause();
      bgAudio.removeAttribute('src');
      bgAudio.load();
    } catch (e) {}
  }

  function startMusic(trackKey) {
    var bgAudio = getBgAudio();
    currentTrack = trackKey;
    if (trackKey !== 'off') lastActiveTrack = trackKey;

    updateTrackUI();

    if (trackKey === 'off') {
      stopStream(bgAudio);
      setStatus("🔇 Музыка и радио выключены");
      return;
    }

    if (!bgAudio) return;
    stopStream(bgAudio);

    // 1. Локальный ИИ-трек из папки ./music/ (с резервом)
    if (LOCAL_TRACKS[trackKey]) {
      var item = LOCAL_TRACKS[trackKey];
      var triedBackup = false;
      bgAudio.loop = true;
      bgAudio.volume = 0.5;
      setStatus("⏳ Загрузка: " + item.name + "...");

      bgAudio.onplaying = function() {
        setStatus((triedBackup ? "🎵 Демо-трек: " : "🎵 Играет из /music: ") + item.name);
      };
      bgAudio.onerror = function() {
        if (!triedBackup && item.backup) {
          triedBackup = true;
          bgAudio.src = item.backup;
          bgAudio.play().catch(function() {
            setStatus("⚠️ Нажми Пуск для воспроизведения");
          });
        } else {
          setStatus("⚠️ Файл " + item.src + " не найден");
        }
      };

      bgAudio.src = item.src;
      bgAudio.play().catch(function() {
        if (!triedBackup && item.backup) {
          triedBackup = true;
          bgAudio.src = item.backup;
          bgAudio.play().catch(function() {});
        }
      });
      return;
    }

    // 2. Онлайн-радиостанция
    if (isRadio(trackKey)) {
      var rUrl = "";
      var rName = "";
      if (trackKey === "rcustom") {
        rUrl = getCustomRadioUrl();
        rName = "📻 Свой радиопоток";
        if (!rUrl) {
          setStatus("⚠️ Сначала вставь ссылку на поток ниже");
          return;
        }
      } else {
        rUrl = RADIO_STATIONS[trackKey].url;
        rName = RADIO_STATIONS[trackKey].name;
      }

      bgAudio.loop = false;
      bgAudio.volume = 0.55;
      setStatus("⏳ Подключение к эфиру: " + rName + "...");

      bgAudio.onwaiting = function() {
        setStatus("⏳ Буферизация: " + rName + "...");
      };
      bgAudio.onplaying = function() {
        setStatus("🔴 В ЭФИРЕ: " + rName);
      };
      bgAudio.onerror = function() {
        setStatus("⚠️ Станция недоступна (выбери другую)");
      };

      bgAudio.src = rUrl;
      bgAudio.play().catch(function() {
        setStatus("⚠️ Не удалось запустить поток (проверь интернет)");
      });
    }
  }

  function playCustomRadio(url) {
    var clean = String(url || "").trim();
    if (!clean) {
      setStatus("⚠️ Введи HTTPS-ссылку на аудиопоток");
      return;
    }
    saveCustomRadioUrl(clean);
    startMusic("rcustom");
  }

  function cycleTrack(dir) {
    var base = currentTrack === 'off' ? lastActiveTrack : currentTrack;
    var idx = TRACK_ORDER.indexOf(base);
    if (idx === -1) idx = 0;
    var nextIdx = (idx + dir + TRACK_ORDER.length) % TRACK_ORDER.length;
    startMusic(TRACK_ORDER[nextIdx]);
  }

  function togglePlayPauseMusic() {
    if (currentTrack === 'off') {
      startMusic(lastActiveTrack || 'm1');
    } else {
      startMusic('off');
    }
  }

  window.PrideCore.Audio = {
    ensureAudio: ensureAudio,
    playSfx: playSfx,
    startMusic: startMusic,
    playCustomRadio: playCustomRadio,
    getCustomRadioUrl: getCustomRadioUrl,
    cycleTrack: cycleTrack,
    togglePlayPauseMusic: togglePlayPauseMusic,
    setPauseChecker: function(fn) { isGamePausedOrOver = fn; },
    getCurrentTrack: function() { return currentTrack; },
    getLastActiveTrack: function() { return lastActiveTrack; },
    getStatusText: function() { return statusText; },
    isMp3Track: isMp3Track,
    isRadio: isRadio,
    toggleSfx: function() {
      sfxEnabled = !sfxEnabled;
      if (sfxEnabled) playSfx('rotate');
      return sfxEnabled;
    }
  };
})();
