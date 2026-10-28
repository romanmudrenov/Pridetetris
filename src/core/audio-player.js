window.onerror = function(m, s, l) {
  alert("ОШИБКА: " + m + "\n" + String(s || "").split("/").pop() + " строка " + l);
};

window.PrideCore = window.PrideCore || {};

(function() {
  var audioCtx = null;
  var sfxEnabled = true;

  var KEY_MV = 'pride_vol_music_v1';
  var KEY_SV = 'pride_vol_sfx_v1';
  var volListeners = [];
  var externalStopper = null;

  function clamp01(v) {
    v = parseFloat(v);
    if (isNaN(v)) return 0;
    return Math.max(0, Math.min(1, v));
  }
  function loadVol(key, def) {
    try {
      var v = parseFloat(localStorage.getItem(key));
      if (isNaN(v) || v < 0 || v > 1) return def;
      return v;
    } catch (e) { return def; }
  }
  function saveVol(key, v) {
    try { localStorage.setItem(key, String(v)); } catch (e) {}
  }
  var musicVol = loadVol(KEY_MV, 0.7);
  var sfxVol = loadVol(KEY_SV, 0.8);

  function fireVol() {
    for (var i = 0; i < volListeners.length; i++) {
      try { volListeners[i](); } catch (e) {}
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

  // ---------- Звуковые эффекты ----------
  function playSfx(type) {
    if (!sfxEnabled || sfxVol < 0.02) return;
    ensureAudio();
    if (!audioCtx) return;

    var now = audioCtx.currentTime;
    var k = sfxVol / 0.8;

    if (type === 'move') {
      var osc = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.04);
      g.gain.setValueAtTime(0.08 * k, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(g); g.connect(audioCtx.destination);
      osc.start(now); osc.stop(now + 0.04);
    } else if (type === 'rotate') {
      var osc2 = audioCtx.createOscillator();
      var g2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(380, now);
      osc2.frequency.exponentialRampToValueAtTime(680, now + 0.08);
      g.gain.setValueAtTime(0.12 * k, now);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc2.connect(g2); g2.connect(audioCtx.destination);
      osc2.start(now); osc2.stop(now + 0.08);
    } else if (type === 'drop') {
      var osc3 = audioCtx.createOscillator();
      var g3 = audioCtx.createGain();
      osc3.type = 'sawtooth';
      osc3.frequency.setValueAtTime(160, now);
      osc3.frequency.exponentialRampToValueAtTime(45, now + 0.14);
      g3.gain.setValueAtTime(0.18 * k, now);
      g3.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc3.connect(g3); g3.connect(audioCtx.destination);
      osc3.start(now); osc3.stop(now + 0.14);
    } else if (type === 'laser') {
      var oscL = audioCtx.createOscillator();
      var gL = audioCtx.createGain();
      oscL.type = 'sawtooth';
      oscL.frequency.setValueAtTime(980, now);
      oscL.frequency.exponentialRampToValueAtTime(90, now + 0.38);
      gL.gain.setValueAtTime(0.25 * k, now);
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
        gn.gain.setValueAtTime(0.12 * k, now + i * 0.045);
        gn.gain.exponentialRampToValueAtTime(0.001, now + i * 0.045 + 0.12);
        o.connect(gn); gn.connect(audioCtx.destination);
        o.start(now + i * 0.045);
        o.stop(now + i * 0.045 + 0.12);
      }
    }
  }

  function setMusicVolume(v) {
    musicVol = clamp01(v);
    saveVol(KEY_MV, musicVol);
    fireVol();
  }

  function setSfxVolume(v) {
    sfxVol = clamp01(v);
    saveVol(KEY_SV, sfxVol);
    fireVol();
  }

  function noop() {}

  window.PrideCore.Audio = {
    ensureAudio: ensureAudio,
    playSfx: playSfx,
    toggleSfx: function() {
      sfxEnabled = !sfxEnabled;
      if (sfxEnabled) playSfx('rotate');
      return sfxEnabled;
    },
    isSfxEnabled: function() { return sfxEnabled; },

    // Громкость (музыка = плеер и радио)
    getMusicVolume: function() { return musicVol; },
    setMusicVolume: setMusicVolume,
    getSfxVolume: function() { return sfxVol; },
    setSfxVolume: setSfxVolume,
    onVolume: function(fn) { volListeners.push(fn); },

    // Плеер и радио регистрируют сюда функцию, которая их останавливает (при выходе из профиля)
    setExternalStopper: function(fn) { externalStopper = fn; },
    stopAll: function() {
      if (externalStopper) {
        try { externalStopper(); } catch (e) {}
      }
    },

    // Заглушки для совместимости со старыми файлами (8-битная музыка удалена)
    startMusic: noop,
    cycleTrack: noop,
    togglePlayPauseMusic: noop,
    setPauseChecker: noop,
    getCurrentTrack: function() { return 'off'; },
    getLastActiveTrack: function() { return 'off'; },
    isMp3Track: function() { return false; }
  };
})();
