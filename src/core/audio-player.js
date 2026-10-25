```javascript
window.PrideCore = window.PrideCore || {};

(function() {
  var audioCtx = null;
  var sfxEnabled = true;
  var musicVolume = 0.70;
  var sfxVolume = 0.80;

  var currentTrack = "s1";
  var lastActiveTrack = "s1";
  var synthInterval = null;
  var synthStep = 0;
  var loopMp3 = true;
  var isGamePausedOrOver = function() { return false; };

  // Загрузка сохранённой громкости из памяти браузера
  try {
    var savedMVol = localStorage.getItem('pride_music_vol_v1');
    if (savedMVol !== null) musicVolume = Math.max(0, Math.min(1, parseFloat(savedMVol)));
    var savedSVol = localStorage.getItem('pride_sfx_vol_v1');
    if (savedSVol !== null) sfxVolume = Math.max(0, Math.min(1, parseFloat(savedSVol)));
  } catch (e) {}

  // Папки на GitHub, куда ты загрузишь свои MP3 и картинки обложек
  var GITHUB_MUSIC_DIR = "./music/";
  var GITHUB_COVERS_DIR = "./music/covers/";

  // Встроенные неоновые SVG-фоны (работают, пока свои картинки ещё не загружены в /music/covers/)
  function makeSvgCover(c1, c2, c3, label) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">'
      + '<defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">'
      + '<stop offset="0%" stop-color="' + c1 + '"/><stop offset="50%" stop-color="' + c2 + '"/><stop offset="100%" stop-color="' + c3 + '"/>'
      + '</linearGradient></defs>'
      + '<rect width="600" height="600" fill="url(#g)"/>'
      + '<circle cx="300" cy="300" r="210" stroke="rgba(255,255,255,0.18)" stroke-width="4" fill="none"/>'
      + '<polygon points="300,70 500,190 500,410 300,530 100,410 100,190" stroke="rgba(0,240,255,0.45)" stroke-width="6" fill="rgba(10,6,22,0.45)"/>'
      + '<text x="300" y="565" text-anchor="middle" fill="#ffffff" font-family="Arial" font-weight="900" font-size="24" opacity="0.65">' + label + '</text>'
      + '</svg>';
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  // Полный каталог: MP3 из папки GitHub, 8-Bit Synth и Интернет-радио
  var CATALOG = {
    "m1": {
      id: "m1", kind: "mp3", emoji: "🎵",
      shortName: "🎵 1. Cyber Pride",
      title: "Cyber Pride Anthem", artist: "PRIDE Studio • Папка /music/",
      src: GITHUB_MUSIC_DIR + "track1.mp3",
      fallbackSrc: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      cover: GITHUB_COVERS_DIR + "cover1.jpg",
      fallbackCover: makeSvgCover("#ff007a", "#180b30", "#00f0ff", "PRIDE TRACK 01")
    },
    "m2": {
      id: "m2", kind: "mp3", emoji: "🌆",
      shortName: "🎵 2. Neon Agency",
      title: "Neon Agency Vibes", artist: "PRIDE Studio • Папка /music/",
      src: GITHUB_MUSIC_DIR + "track2.mp3",
      fallbackSrc: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
      cover: GITHUB_COVERS_DIR + "cover2.jpg",
      fallbackCover: makeSvgCover("#00f0ff", "#091d36", "#b829ff", "PRIDE TRACK 02")
    },
    "m3": {
      id: "m3", kind: "mp3", emoji: "⚡",
      shortName: "🎵 3. Techno Rush",
      title: "Techno Rush Deadline", artist: "PRIDE Studio • Папка /music/",
      src: GITHUB_MUSIC_DIR + "track3.mp3",
      fallbackSrc: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
      cover: GITHUB_COVERS_DIR + "cover3.jpg",
      fallbackCover: makeSvgCover("#fcee09", "#3b0d2c", "#ff007a", "PRIDE TRACK 03")
    },
    "m4": {
      id: "m4", kind: "mp3", emoji: "🌌",
      shortName: "🎵 4. Horizon",
      title: "Digital Horizon", artist: "PRIDE Studio • Папка /music/",
      src: GITHUB_MUSIC_DIR + "track4.mp3",
      fallbackSrc: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      cover: GITHUB_COVERS_DIR + "cover4.jpg",
      fallbackCover: makeSvgCover("#00ff9d", "#071f24", "#2563eb", "PRIDE TRACK 04")
    },
    "m5": {
      id: "m5", kind: "mp3", emoji: "🖨️",
      shortName: "🎵 5. Print Shop",
      title: "Night Print Shop", artist: "PRIDE Studio • Папка /music/",
      src: GITHUB_MUSIC_DIR + "track5.mp3",
      fallbackSrc: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
      cover: GITHUB_COVERS_DIR + "cover5.jpg",
      fallbackCover: makeSvgCover("#b829ff", "#1a0933", "#ff5e3a", "PRIDE TRACK 05")
    },
    "m6": {
      id: "m6", kind: "mp3", emoji: "🪧",
      shortName: "🎵 6. Billboard",
      title: "Mega Billboard Dreams", artist: "PRIDE Studio • Папка /music/",
      src: GITHUB_MUSIC_DIR + "track6.mp3",
      fallbackSrc: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
      cover: GITHUB_COVERS_DIR + "cover6.jpg",
      fallbackCover: makeSvgCover("#ff8800", "#240b1c", "#00f0ff", "PRIDE TRACK 06")
    },

    "s1": {
      id: "s1", kind: "synth", emoji: "🎹",
      shortName: "🎹 1. Cyber Bass",
      title: "Cyber Pride Bass (8-Bit)", artist: "PRIDE Chiptune Generator",
      fallbackCover: makeSvgCover("#120924", "#ff007a", "#00f0ff", "8-BIT SYNTH 01")
    },
    "s2": {
      id: "s2", kind: "synth", emoji: "🕹️",
      shortName: "🎹 2. Korobeiniki",
      title: "Korobeiniki Classic 8-Bit", artist: "PRIDE Chiptune Generator",
      fallbackCover: makeSvgCover("#0b2418", "#00ff9d", "#00f0ff", "8-BIT SYNTH 02")
    },
    "s3": {
      id: "s3", kind: "synth", emoji: "✨",
      shortName: "🎹 3. Neon Arp",
      title: "Neon Arpeggio Pulse", artist: "PRIDE Chiptune Generator",
      fallbackCover: makeSvgCover("#1f1038", "#b829ff", "#fcee09", "8-BIT SYNTH 03")
    },
    "s4": {
      id: "s4", kind: "synth", emoji: "🔥",
      shortName: "🎹 4. Overdrive",
      title: "Deadline Overdrive", artist: "PRIDE Chiptune Generator",
      fallbackCover: makeSvgCover("#330a0a", "#ff2a2a", "#fcee09", "8-BIT SYNTH 04")
    },
    "s5": {
      id: "s5", kind: "synth", emoji: "🕶️",
      shortName: "🎹 5. Synthwave",
      title: "Agency Synthwave", artist: "PRIDE Chiptune Generator",
      fallbackCover: makeSvgCover("#29092b", "#ff007a", "#ff8800", "8-BIT SYNTH 05")
    },
    "s6": {
      id: "s6", kind: "synth", emoji: "👾",
      shortName: "🎹 6. Matrix Boss",
      title: "Retro Matrix Boss", artist: "PRIDE Chiptune Generator",
      fallbackCover: makeSvgCover("#041c0c", "#2bff88", "#e5ff3a", "8-BIT SYNTH 06")
    },

    "r1": {
      id: "r1", kind: "radio", emoji: "🌆",
      shortName: "📻 Synthwave FM",
      title: "Nightride FM • Synthwave",
      artist: "Интернет-радио • Retrowave / Cyber",
      src: "https://stream.nightride.fm/nightride.m4a",
      fallbackSrc: "https://ice1.somafm.com/spacestation-128-mp3",
      fallbackCover: makeSvgCover("#ff007a", "#1c0836", "#00f0ff", "SYNTHWAVE RADIO")
    },
    "r2": {
      id: "r2", kind: "radio", emoji: "🍸",
      shortName: "📻 Groove Salad",
      title: "SomaFM • Groove Salad",
      artist: "Интернет-радио • Chillout / Lounge",
      src: "https://ice1.somafm.com/groovesalad-128-mp3",
      fallbackCover: makeSvgCover("#00ff9d", "#072621", "#22d3ee", "CHILLOUT RADIO")
    },
    "r3": {
      id: "r3", kind: "radio", emoji: "🚀",
      shortName: "📻 Space Station",
      title: "SomaFM • Space Station",
      artist: "Интернет-радио • Ambient / Space",
      src: "https://ice1.somafm.com/spacestation-128-mp3",
      fallbackCover: makeSvgCover("#2563eb", "#060e24", "#b829ff", "SPACE RADIO")
    },
    "r4": {
      id: "r4", kind: "radio", emoji: "☕",
      shortName: "📻 Lo-Fi Work Beats",
      title: "Laut.fm • Lo-Fi Chillhop",
      artist: "Интернет-радио • Для фокуса и работы",
      src: "https://stream.laut.fm/lofi",
      fallbackSrc: "https://ice1.somafm.com/BeatBlender-128-mp3",
      fallbackCover: makeSvgCover("#ff8800", "#261507", "#ffd166", "LO-FI RADIO")
    },
    "r5": {
      id: "r5", kind: "radio", emoji: "🕵️",
      shortName: "📻 Secret Agent",
      title: "SomaFM • Secret Agent",
      artist: "Интернет-радио • Spy Jazz / Lounge",
      src: "https://ice1.somafm.com/secretagent-128-mp3",
      fallbackCover: makeSvgCover("#b3123c", "#1a060b", "#e6b84a", "SECRET AGENT FM")
    },
    "r6": {
      id: "r6", kind: "radio", emoji: "💻",
      shortName: "📻 DEF CON Radio",
      title: "SomaFM • DEF CON Hacker",
      artist: "Интернет-радио • Electronic / Techno",
      src: "https://ice1.somafm.com/defcon-128-mp3",
      fallbackCover: makeSvgCover("#00f0ff", "#04161c", "#00ff9d", "DEF CON RADIO")
    }
  };

  var TRACK_ORDER = [
    "m1", "m2", "m3", "m4", "m5", "m6",
    "s1", "s2", "s3", "s4", "s5", "s6",
    "r1", "r2", "r3", "r4", "r5", "r6"
  ];

  var SYNTH_PATTERNS = {
    "s1": {
      wave: "sawtooth", tempo: 210,
      notes: [
        110, 110, 130.81, 146.83, 110, 110, 164.81, 146.83,
        130.81, 130.81, 164.81, 196.00, 146.83, 146.83, 220.00, 196.00,
        110, 146.83, 164.81, 220.00, 196.00, 164.81, 146.83, 130.81,
        123.47, 146.83, 185.00, 220.00, 164.81, 146.83, 130.81, 110
      ]
    },
    "s2": {
      wave: "square", tempo: 185,
      notes: [
        329.63, 246.94, 261.63, 293.66, 261.63, 246.94, 220.00, 220.00,
        261.63, 329.63, 293.66, 261.63, 246.94, 246.94, 261.63, 293.66,
        329.63, 261.63, 220.00, 220.00, 293.66, 349.23, 440.00, 392.00,
        349.23, 329.63, 261.63, 329.63, 293.66, 261.63, 246.94, 293.66,
        329.63, 261.63, 220.00, 220.00
      ]
    },
    "s3": {
      wave: "triangle", tempo: 165,
      notes: [
        220, 261.63, 329.63, 440, 329.63, 261.63, 196, 246.94,
        293.66, 392, 293.66, 246.94, 174.61, 220, 261.63, 349.23,
        261.63, 220, 164.81, 196, 246.94, 329.63, 246.94, 196,
        220, 277.18, 329.63, 440, 392, 329.63, 261.63, 220
      ]
    },
    "s4": {
      wave: "sawtooth", tempo: 150,
      notes: [
        146.83, 146.83, 293.66, 146.83, 174.61, 146.83, 220.00, 196.00,
        146.83, 146.83, 329.63, 146.83, 261.63, 220.00, 196.00, 174.61,
        164.81, 164.81, 329.63, 164.81, 196.00, 164.81, 246.94, 220.00,
        130.81, 164.81, 196.00, 261.63, 246.94, 220.00, 196.00, 164.81
      ]
    },
    "s5": {
      wave: "sawtooth", tempo: 220,
      notes: [
        98.00, 196.00, 146.83, 196.00, 110.00, 220.00, 164.81, 220.00,
        130.81, 261.63, 196.00, 261.63, 146.83, 293.66, 220.00, 293.66,
        164.81, 329.63, 246.94, 329.63, 146.83, 293.66, 220.00, 293.66,
        130.81, 261.63, 196.00, 246.94, 110.00, 220.00, 146.83, 196.00
      ]
    },
    "s6": {
      wave: "square", tempo: 170,
      notes: [
        130.81, 196.00, 261.63, 196.00, 155.56, 233.08, 311.13, 233.08,
        174.61, 261.63, 349.23, 261.63, 146.83, 220.00, 293.66, 220.00,
        130.81, 261.63, 311.13, 392.00, 349.23, 311.13, 261.63, 233.08,
        196.00, 233.08, 261.63, 311.13, 293.66, 261.63, 196.00, 130.81
      ]
    }
  };

  function getBgAudio() {
    return document.getElementById('bgAudio');
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

  function playSfx(type) {
    if (!sfxEnabled || sfxVolume <= 0.01) return;
    ensureAudio();
    if (!audioCtx) return;

    var now = audioCtx.currentTime;
    var v = sfxVolume;

    if (type === 'move') {
      var osc = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.04);
      g.gain.setValueAtTime(Math.max(0.002, 0.12 * v), now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(g); g.connect(audioCtx.destination);
      osc.start(now); osc.stop(now + 0.04);
    } else if (type === 'rotate') {
      var osc2 = audioCtx.createOscillator();
      var g2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(380, now);
      osc2.frequency.exponentialRampToValueAtTime(680, now + 0.08);
      g2.gain.setValueAtTime(Math.max(0.002, 0.18 * v), now);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc2.connect(g2); g2.connect(audioCtx.destination);
      osc2.start(now); osc2.stop(now + 0.08);
    } else if (type === 'drop') {
      var osc3 = audioCtx.createOscillator();
      var g3 = audioCtx.createGain();
      osc3.type = 'sawtooth';
      osc3.frequency.setValueAtTime(160, now);
      osc3.frequency.exponentialRampToValueAtTime(45, now + 0.14);
      g3.gain.setValueAtTime(Math.max(0.002, 0.25 * v), now);
      g3.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc3.connect(g3); g3.connect(audioCtx.destination);
      osc3.start(now); osc3.stop(now + 0.14);
    } else if (type === 'laser') {
      var oscL = audioCtx.createOscillator();
      var gL = audioCtx.createGain();
      oscL.type = 'sawtooth';
      oscL.frequency.setValueAtTime(980, now);
      oscL.frequency.exponentialRampToValueAtTime(90, now + 0.38);
      gL.gain.setValueAtTime(Math.max(0.002, 0.32 * v), now);
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
        gn.gain.setValueAtTime(Math.max(0.002, 0.16 * v), now + i * 0.045);
        gn.gain.exponentialRampToValueAtTime(0.001, now + i * 0.045 + 0.12);
        o.connect(gn); gn.connect(audioCtx.destination);
        o.start(now + i * 0.045);
        o.stop(now + i * 0.045 + 0.12);
      }
    }
  }

  function applyCoverWithFallback(item) {
    var fpBg = document.getElementById('fpBg');
    var fpArtImg = document.getElementById('fpArtImg');
    var npThumb = document.getElementById('npThumb');
    if (!item) return;

    var setUrl = function(url) {
      if (fpBg) fpBg.style.backgroundImage = 'url("' + url + '")';
      if (fpArtImg) fpArtImg.style.backgroundImage = 'url("' + url + '")';
      if (npThumb) npThumb.style.backgroundImage = 'url("' + url + '")';
    };

    if (item.cover) {
      var img = new Image();
      img.onload = function() { setUrl(item.cover); };
      img.onerror = function() { setUrl(item.fallbackCover); };
      img.src = item.cover;
    } else if (item.fallbackCover) {
      setUrl(item.fallbackCover);
    }
  }

  function fmtSec(sec) {
    if (!sec || !isFinite(sec) || sec < 0) return "00:00";
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return ('0' + m).slice(-2) + ':' + ('0' + s).slice(-2);
  }

  function updateTrackUI() {
    var activeKey = currentTrack === 'off' ? lastActiveTrack : currentTrack;
    var item = CATALOG[activeKey] || CATALOG["s1"];
    var isPlaying = currentTrack !== 'off';

    var lbl = document.getElementById('sideTrackLbl');
    if (lbl) lbl.innerText = isPlaying ? item.shortName : "🔇 Выкл";

    var allTrackBtns = document.querySelectorAll('.track-btn[data-track]');
    for (var k = 0; k < allTrackBtns.length; k++) {
      var tk = allTrackBtns[k].getAttribute('data-track');
      allTrackBtns[k].classList.toggle('active', tk === currentTrack);
    }

    var radioCards = document.querySelectorAll('.radio-card[data-track]');
    for (var r = 0; r < radioCards.length; r++) {
      var rk = radioCards[r].getAttribute('data-track');
      var activeRadio = (rk === currentTrack);
      radioCards[r].classList.toggle('active', activeRadio);
      var badge = radioCards[r].querySelector('.rc-live');
      if (badge) badge.textContent = activeRadio ? '🔊 В ЭФИРЕ' : '▶ LIVE';
    }

    var drawerItems = document.querySelectorAll('.fp-drawer-item[data-track]');
    for (var d = 0; d < drawerItems.length; d++) {
      drawerItems[d].classList.toggle('active', drawerItems[d].getAttribute('data-track') === currentTrack);
    }

    var npTitle = document.getElementById('npTitle');
    var npSub = document.getElementById('npSub');
    var npThumb = document.getElementById('npThumb');
    if (npTitle) npTitle.textContent = isPlaying ? item.title : "Музыка на паузе";
    if (npSub) npSub.textContent = isPlaying ? (item.artist + " • Открыть плеер ⛶") : "Нажми ⏯ для запуска или открой плеер ⛶";
    if (npThumb) npThumb.textContent = item.emoji || "🎵";

    var fpTitle = document.getElementById('fpTitle');
    var fpArtist = document.getElementById('fpArtist');
    var fpArtEmoji = document.getElementById('fpArtEmoji');
    var fpBadge = document.getElementById('fpBadge');
    var fpBtnPlay = document.getElementById('fpBtnPlay');
    var fpEq = document.getElementById('fpEq');
    var fpDurTime = document.getElementById('fpDurTime');

    if (fpTitle) fpTitle.textContent = item.title;
    if (fpArtist) fpArtist.textContent = item.artist;
    if (fpArtEmoji) fpArtEmoji.textContent = item.emoji || "🎧";
    if (fpBadge) {
      fpBadge.textContent = item.kind === 'radio' ? '📻 LIVE RADIO' : (item.kind === 'mp3' ? '🎧 MP3 PLAYER' : '🎹 8-BIT SYNTH');
    }
    if (fpBtnPlay) fpBtnPlay.textContent = isPlaying ? "⏸" : "▶";
    if (fpEq) fpEq.classList.toggle('paused', !isPlaying);
    if (fpDurTime && item.kind !== 'mp3') {
      fpDurTime.textContent = item.kind === 'radio' ? "🔴 ПРЯМОЙ ЭФИР" : "🎹 SYNTH LOOP";
    }

    applyCoverWithFallback(item);
  }

  function startMusic(trackKey) {
    currentTrack = trackKey;
    if (trackKey !== 'off') lastActiveTrack = trackKey;

    if (synthInterval) {
      clearInterval(synthInterval);
      synthInterval = null;
    }
    var bgAudio = getBgAudio();
    if (bgAudio) {
      bgAudio.onended = null;
      bgAudio.onerror = null;
      bgAudio.pause();
    }
    updateTrackUI();

    if (trackKey === 'off') return;

    var item = CATALOG[trackKey];
    if (!item) return;

    if (item.kind === 'synth' && SYNTH_PATTERNS[trackKey]) {
      ensureAudio();
      var pat = SYNTH_PATTERNS[trackKey];
      synthStep = 0;
      synthInterval = setInterval(function() {
        var menuModal = document.getElementById('menuModal');
        var menuOpen = menuModal && menuModal.style.display === 'flex';
        if ((isGamePausedOrOver() && !menuOpen) || !audioCtx || audioCtx.state !== 'running' || musicVolume <= 0.01) return;
        var now = audioCtx.currentTime;
        var freq = pat.notes[synthStep % pat.notes.length];
        synthStep++;
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = pat.wave;
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(Math.max(0.002, 0.08 * musicVolume), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (pat.tempo / 1000) * 0.9);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + (pat.tempo / 1000) * 0.9);
      }, pat.tempo);
    } else if ((item.kind === 'mp3' || item.kind === 'radio') && bgAudio) {
      bgAudio.loop = (item.kind === 'mp3') ? loopMp3 : false;
      bgAudio.volume = musicVolume;
      var triedFallback = false;

      bgAudio.onerror = function() {
        if (!triedFallback && item.fallbackSrc && bgAudio.src.indexOf(item.fallbackSrc) === -1) {
          triedFallback = true;
          bgAudio.src = item.fallbackSrc;
          bgAudio.play().catch(function() {});
        }
      };

      bgAudio.onended = function() {
        if (item.kind === 'mp3' && !loopMp3) {
          cycleTrack(1);
        }
      };

      bgAudio.src = item.src;
      bgAudio.play().catch(function() {
        if (!triedFallback && item.fallbackSrc) {
          triedFallback = true;
          bgAudio.src = item.fallbackSrc;
          bgAudio.play().catch(function() {});
        }
      });
    }
  }

  function cycleTrack(dir) {
    var idx = TRACK_ORDER.indexOf(currentTrack === 'off' ? lastActiveTrack : currentTrack);
    if (idx === -1) idx = 0;
    var nextIdx = (idx + dir + TRACK_ORDER.length) % TRACK_ORDER.length;
    startMusic(TRACK_ORDER[nextIdx]);
  }

  function togglePlayPauseMusic() {
    if (currentTrack === 'off') {
      startMusic(lastActiveTrack || 's1');
    } else {
      startMusic('off');
    }
  }

  function setMusicVolume(val01) {
    musicVolume = Math.max(0, Math.min(1, val01));
    try { localStorage.setItem('pride_music_vol_v1', String(musicVolume)); } catch (e) {}
    var bgAudio = getBgAudio();
    if (bgAudio) bgAudio.volume = musicVolume;
    syncVolumeSlidersUI();
  }

  function setSfxVolume(val01) {
    sfxVolume = Math.max(0, Math.min(1, val01));
    try { localStorage.setItem('pride_sfx_vol_v1', String(sfxVolume)); } catch (e) {}
    syncVolumeSlidersUI();
  }

  function syncVolumeSlidersUI() {
    var mPct = Math.round(musicVolume * 100);
    var sPct = Math.round(sfxVolume * 100);

    var mSliders = document.querySelectorAll('.music-vol-slider');
    for (var i = 0; i < mSliders.length; i++) mSliders[i].value = mPct;

    var sSliders = document.querySelectorAll('.sfx-vol-slider');
    for (var j = 0; j < sSliders.length; j++) sSliders[j].value = sPct;

    var mLbls = document.querySelectorAll('.vol-music-lbl');
    for (var k = 0; k < mLbls.length; k++) mLbls[k].textContent = mPct + '%';

    var sLbls = document.querySelectorAll('.vol-sfx-lbl');
    for (var l = 0; l < sLbls.length; l++) sLbls[l].textContent = sPct + '%';

    var muteBtn = document.getElementById('fpBtnMute');
    if (muteBtn) muteBtn.textContent = musicVolume <= 0.01 ? '🔇' : '🔊';
  }

  function initAudioTimeline() {
    var bgAudio = getBgAudio();
    if (!bgAudio) return;

    bgAudio.addEventListener('timeupdate', function() {
      var item = CATALOG[currentTrack];
      var seek = document.getElementById('fpSeek');
      var curEl = document.getElementById('fpCurTime');
      var durEl = document.getElementById('fpDurTime');
      if (!item || item.kind !== 'mp3') {
        if (curEl) curEl.textContent = item && item.kind === 'radio' ? "LIVE" : "00:00";
        if (seek) seek.value = 100;
        return;
      }
      if (curEl) curEl.textContent = fmtSec(bgAudio.currentTime);
      if (bgAudio.duration && isFinite(bgAudio.duration)) {
        if (durEl) durEl.textContent = fmtSec(bgAudio.duration);
        if (seek) seek.value = Math.round((bgAudio.currentTime / bgAudio.duration) * 100);
      }
    });
  }

  function seekToPercent(pct) {
    var bgAudio = getBgAudio();
    var item = CATALOG[currentTrack];
    if (!bgAudio || !item || item.kind !== 'mp3') return;
    if (bgAudio.duration && isFinite(bgAudio.duration)) {
      bgAudio.currentTime = (pct / 100) * bgAudio.duration;
    }
  }

  function openFullPlayer() {
    var fp = document.getElementById('fullPlayer');
    if (fp) {
      fp.classList.add('active');
      updateTrackUI();
    }
  }

  function closeFullPlayer() {
    var fp = document.getElementById('fullPlayer');
    if (fp) fp.classList.remove('active');
  }

  function getRadioStations() {
    var out = [];
    for (var i = 0; i < TRACK_ORDER.length; i++) {
      var it = CATALOG[TRACK_ORDER[i]];
      if (it && it.kind === 'radio') out.push(it);
    }
    return out;
  }

  function getAllCatalogItems() {
    var out = [];
    for (var i = 0; i < TRACK_ORDER.length; i++) {
      if (CATALOG[TRACK_ORDER[i]]) out.push(CATALOG[TRACK_ORDER[i]]);
    }
    return out;
  }

  setTimeout(function() {
    initAudioTimeline();
    syncVolumeSlidersUI();
    updateTrackUI();
  }, 0);

  window.PrideCore.Audio = {
    ensureAudio: ensureAudio,
    playSfx: playSfx,
    startMusic: startMusic,
    cycleTrack: cycleTrack,
    togglePlayPauseMusic: togglePlayPauseMusic,
    setPauseChecker: function(fn) { isGamePausedOrOver = fn; },
    getCurrentTrack: function() { return currentTrack; },
    getLastActiveTrack: function() { return lastActiveTrack; },
    isMp3Track: function(tk) {
      var it = CATALOG[tk];
      return !!(it && (it.kind === 'mp3' || it.kind === 'radio'));
    },
    toggleSfx: function() {
      sfxEnabled = !sfxEnabled;
      if (sfxEnabled) playSfx('rotate');
      return sfxEnabled;
    },
    setMusicVolume: setMusicVolume,
    getMusicVolume: function() { return musicVolume; },
    setSfxVolume: setSfxVolume,
    getSfxVolume: function() { return sfxVolume; },
    syncVolumeSlidersUI: syncVolumeSlidersUI,
    openFullPlayer: openFullPlayer,
    closeFullPlayer: closeFullPlayer,
    seekToPercent: seekToPercent,
    toggleLoopMode: function() {
      loopMp3 = !loopMp3;
      var bgAudio = getBgAudio();
      if (bgAudio) bgAudio.loop = loopMp3;
      return loopMp3;
    },
    getRadioStations: getRadioStations,
    getAllCatalogItems: getAllCatalogItems
  };
})();
```
