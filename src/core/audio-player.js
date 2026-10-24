window.onerror = function(m, s, l) {
  alert("ОШИБКА: " + m + "\n" + String(s || "").split("/").pop() + " строка " + l);
};

window.PrideCore = window.PrideCore || {};

(function() {
  var audioCtx = null;
  var sfxEnabled = true;
  var currentTrack = "s1";
  var lastActiveTrack = "s1";
  var synthInterval = null;
  var synthStep = 0;
  var isGamePausedOrOver = function() { return false; };

  var TRACK_ORDER = ["s1", "s2", "s3", "s4", "s5", "s6", "m1", "m2", "m3", "m4", "m5", "m6"];

  var TRACK_NAMES = {
    "s1": "🎹 1. Cyber Bass",
    "s2": "🎹 2. Korobeiniki",
    "s3": "🎹 3. Neon Arp",
    "s4": "🎹 4. Overdrive",
    "s5": "🎹 5. Synthwave",
    "s6": "🎹 6. Matrix Boss",
    "m1": "🎵 7. Cyber Pride",
    "m2": "🎵 8. Neon Agency",
    "m3": "🎵 9. Techno Rush",
    "m4": "🎵 10. Horizon",
    "m5": "🎵 11. Print Shop",
    "m6": "🎵 12. Billboard",
    "off": "🔇 Выкл"
  };

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

  var FREE_TRACKS = {
    "m1": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    "m2": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    "m3": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    "m4": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    "m5": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    "m6": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3"
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

  function updateTrackUI() {
    var lbl = document.getElementById('sideTrackLbl');
    if (lbl) lbl.innerText = TRACK_NAMES[currentTrack] || "🎵 Музыка";
    var allTrackBtns = document.querySelectorAll('.track-btn[data-track]');
    for (var k = 0; k < allTrackBtns.length; k++) {
      var tk = allTrackBtns[k].getAttribute('data-track');
      allTrackBtns[k].classList.toggle('active', tk === currentTrack);
    }
  }

  function startMusic(trackKey) {
    currentTrack = trackKey;
    if (trackKey !== 'off') lastActiveTrack = trackKey;

    if (synthInterval) {
      clearInterval(synthInterval);
      synthInterval = null;
    }
    var bgAudio = getBgAudio();
    if (bgAudio) bgAudio.pause();
    updateTrackUI();

    if (trackKey === 'off') return;

    if (SYNTH_PATTERNS[trackKey]) {
      ensureAudio();
      var pat = SYNTH_PATTERNS[trackKey];
      synthStep = 0;
      synthInterval = setInterval(function() {
        var welcomeModal = document.getElementById('welcomeModal');
        var welcomeOpen = welcomeModal && welcomeModal.style.display !== 'none';
        if ((isGamePausedOrOver() && !welcomeOpen) || !audioCtx || audioCtx.state !== 'running') return;
        var now = audioCtx.currentTime;
        var freq = pat.notes[synthStep % pat.notes.length];
        synthStep++;
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = pat.wave;
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (pat.tempo / 1000) * 0.9);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + (pat.tempo / 1000) * 0.9);
      }, pat.tempo);
    } else if (FREE_TRACKS[trackKey] && bgAudio) {
      bgAudio.src = FREE_TRACKS[trackKey];
      bgAudio.volume = 0.45;
      bgAudio.play().catch(function() {});
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

  window.PrideCore.Audio = {
    ensureAudio: ensureAudio,
    playSfx: playSfx,
    startMusic: startMusic,
    cycleTrack: cycleTrack,
    togglePlayPauseMusic: togglePlayPauseMusic,
    setPauseChecker: function(fn) { isGamePausedOrOver = fn; },
    getCurrentTrack: function() { return currentTrack; },
    getLastActiveTrack: function() { return lastActiveTrack; },
    isMp3Track: function(tk) { return !!FREE_TRACKS[tk]; },
    toggleSfx: function() {
      sfxEnabled = !sfxEnabled;
      if (sfxEnabled) playSfx('rotate');
      return sfxEnabled;
    }
  };
})();
