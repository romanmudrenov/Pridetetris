import { BitrixService } from './core/bitrix24.js';
import { AudioPlayer } from './core/audio-player.js';
import { PortalHub } from './core/portal-hub.js';
import { PrideTetrisGame } from './games/pride-tetris/tetris-game.js';

window.addEventListener('DOMContentLoaded', async () => {
  const bx = new BitrixService();
  await bx.init();

  const audio = new AudioPlayer();
  const hub = new PortalHub(bx);
  hub.init();

  const game = new PrideTetrisGame({
    audio,
    onGameOver: (score, lines, mode) => {
      hub.submitScore(score, lines, mode);
    }
  });

  game.start();
});
