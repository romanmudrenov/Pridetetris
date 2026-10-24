export const BOARD_CONFIG = {
  COLS: 10,
  ROWS: 20,
  SIZE: 22
};

export const SERVICES = [
  { name: "Прямая (I)",     color: "#00f0ff", type: "billboard", shape: [[1,1,1,1]] },
  { name: "Т-фигура (T)",   color: "#b829ff", type: "design",    shape: [[0,1,0],[1,1,1]] },
  { name: "Зигзаг (Z)",     color: "#ff007a", type: "merch",     shape: [[1,1,0],[0,1,1]] },
  { name: "Змейка (S)",     color: "#00ff9d", type: "merch",     shape: [[0,1,1],[1,1,0]] },
  { name: "Квадрат (O)",    color: "#fcee09", type: "posm",      shape: [[1,1],[1,1]] },
  { name: "Г-фигура (L)",   color: "#ff8800", type: "print",     shape: [[1,0,0],[1,1,1]] },
  { name: "Обратная Г (J)", color: "#ff2a2a", type: "deadline",  shape: [[0,0,1],[1,1,1]] }
];

export const PLAYLIST = [
  { title: "1. Korobeiniki Remix (Built-in Synth)", type: "synth" },
  { title: "2. Electro Korobeiniki (Wikimedia Free)", type: "url", url: "https://upload.wikimedia.org/wikipedia/commons/e/e5/Tetris_theme.ogg" },
  { title: "3. Cyber Arcade Tune (Archive.org Free)", type: "url", url: "https://ia800504.us.archive.org/33/items/TetrisThemeMusic/Tetris.mp3" },
  { title: "4. Techno Drive (SoundHelix Free MP3)", type: "url", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { title: "5. Neon House (SoundHelix Free MP3)", type: "url", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" },
  { title: "6. Chiptune Radio 24/7 (Nightride FM)", type: "url", url: "https://stream.nightride.fm/chillsynth.mp3" }
];

export const TETRIS_MELODY = [
  [659.25, 220], [493.88, 110], [523.25, 110], [587.33, 220], [523.25, 110], [493.88, 110],
  [440.00, 220], [440.00, 110], [523.25, 110], [659.25, 220], [587.33, 110], [523.25, 110],
  [493.88, 330], [523.25, 110], [587.33, 220], [659.25, 220],
  [523.25, 220], [440.00, 220], [440.00, 220], [0, 220]
];
