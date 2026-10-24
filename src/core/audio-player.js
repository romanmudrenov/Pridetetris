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
    "m6": "https://
