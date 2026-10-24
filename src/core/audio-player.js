import { PLAYLIST, TETRIS_MELODY } from '../games/pride-tetris/config.js';

export class AudioPlayer {
  constructor() {
    this.audioCtx = null;
    this.sfxEnabled = true;
    this.musicVolume = 0.7;
    this.isMusicPlaying = false;
    this.currentTrackIndex = 0;
    this.synthTimer = null;
    this.melodyStep = 0;
    this.firstInteractionDone = false;
    this.bgAudio = document.getElementById('bgAudio');
  }

  ensureAudio() {
    if (!this.audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.audioCtx = new AC();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  unlockOnFirstTouch() {
    this.ensureAudio();
    if (!this.firstInteractionDone) {
      this.firstInteractionDone = true;
      if (!this.isMusicPlaying) {
        this.loadAndPlayTrack(this.currentTrackIndex);
      }
    }
  }

  updatePlayerUI() {
    const tr = PLAYLIST[this.currentTrackIndex];
    const titleEl = document.getElementById('playerTrackTitle');
    const playBtn = document.getElementById('btnPlayPause');
    const eq = document.getElementById('eqBars');
    const st = document.getElementById('playerStatusText');

    if (titleEl) titleEl.innerText = tr.title;
    if (this.isMusicPlaying) {
      if (playBtn) playBtn.innerText = "⏸";
      if (eq) eq.classList.add('playing');
      if (st) st.innerText = tr.type === 'synth' ? "Играет встроенный Synth" : "Стриминг онлайн...";
    } else {
      if (playBtn) playBtn.innerText = "▶";
      if (eq) eq.classList.remove('playing');
      if (st) st.innerText = "Пауза (нажми ▶)";
    }

    const menuBtns = document.querySelectorAll('#menuTrackList .track-btn');
    menuBtns.forEach((btn, i) => btn.classList.toggle('active', i === this.currentTrackIndex));
  }

  stopAllMusic() {
    if (this.synthTimer) {
      clearTimeout(this.synthTimer);
      this.synthTimer = null;
    }
    if (this.bgAudio) this.bgAudio.pause();
  }

  playSynthStep() {
    if (!this.isMusicPlaying || PLAYLIST[this.currentTrackIndex].type !== 'synth') return;
    this.ensureAudio();
    const note = TETRIS_MELODY[this.melodyStep % TETRIS_MELODY.length];
    this.melodyStep++;
    const [freq, dur] = note;

    if (this.audioCtx && this.audioCtx.state === 'running' && freq > 0 && this.musicVolume > 0) {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.08 * this.musicVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (dur / 1000) * 0.9);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + (dur / 1000) * 0.9);
    }

    this.synthTimer = setTimeout(() => this.playSynthStep(), dur);
  }

  loadAndPlayTrack(index) {
    this.currentTrackIndex = (index + PLAYLIST.length) % PLAYLIST.length;
    this.stopAllMusic();
    this.isMusicPlaying = true;
    this.ensureAudio();

    const tr = PLAYLIST[this.currentTrackIndex];
    this.updatePlayerUI();

    if (tr.type === 'synth') {
      this.melodyStep = 0;
      this.playSynthStep();
    } else if (this.bgAudio) {
      this.bgAudio.src = tr.url;
      this.bgAudio.volume = this.musicVolume;
      this.bgAudio.play().catch(() => {
        this.currentTrackIndex = 0;
        this.updatePlayerUI();
        this.playSynthStep();
      });
    }
  }

  togglePlayPause() {
    this.ensureAudio();
    if (this.isMusicPlaying) {
      this.isMusicPlaying = false;
      this.stopAllMusic();
      this.updatePlayerUI();
    } else {
      this.loadAndPlayTrack(this.currentTrackIndex);
    }
  }

  playSfx(type) {
    if (!this.sfxEnabled) return;
    this.ensureAudio();
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const g = this.audioCtx.createGain();
    osc.connect(g);
    g.connect(this.audioCtx.destination);

    if (type === 'move') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      g.gain.setValueAtTime(0.08, now);
      osc.start(now); osc.stop(now + 0.04);
    } else if (type === 'rotate') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      g.gain.setValueAtTime(0.1, now);
      osc.start(now); osc.stop(now + 0.07);
    } else if (type === 'drop') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      g.gain.setValueAtTime(0.15, now);
      osc.start(now); osc.stop(now + 0.12);
    } else if (type === 'laser' || type === 'sparks') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.3);
      g.gain.setValueAtTime(0.2, now);
      osc.start(now); osc.stop(now + 0.3);
    }
  }
}
