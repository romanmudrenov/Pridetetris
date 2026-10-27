/* ===================== ЦВЕТОВЫЕ СХЕМЫ И ПЕРЕМЕННЫЕ ===================== */
:root {
  --bg: #0d0618;
  --deep: #07030d;
  --panel: #160b28;
  --btn: #211238;
  --line: #341d54;
  --selbg: rgba(0, 240, 255, 0.12);
  --text: #ffffff;
  --muted: #9e8fb8;
  --a1: #ff007a;
  --a2: #00f0ff;
  --a3: #fcee09;
  --a4: #00ff9d;
  --g1: rgba(255, 0, 122, 0.35);
  --g2: rgba(0, 240, 255, 0.35);
  --g3: rgba(252, 238, 9, 0.35);
  --on-a2: #061018;
  --on-grad: #ffffff;
}

* {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* ===================== ЭКРАНЫ ПОРТАЛА ===================== */
.screen {
  display: none;
  width: 100%;
  height: 100dvh;
  overflow-y: auto;
  padding: 14px 14px calc(24px + env(safe-area-inset-bottom));
}
.screen.active {
  display: block;
}
.screen.noscroll {
  overflow: hidden;
}
.screen-inner {
  max-width: 460px;
  margin: 0 auto;
}
.center-inner {
  min-height: calc(100dvh - 40px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

/* ===================== ПРИВЕТСТВИЕ И КНОПКИ ===================== */
.big-logo {
  width: 92px;
  height: 92px;
  margin-bottom: 12px;
  filter: drop-shadow(0 0 16px var(--g1));
}
.welcome-badge {
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 2px;
  color: var(--a2);
  background: var(--panel);
  border: 1px solid var(--a2);
  padding: 4px 12px;
  border-radius: 20px;
  margin-bottom: 10px;
}
.hero-title {
  font-size: 24px;
  font-weight: 900;
  margin: 0 0 8px;
  line-height: 1.2;
}
.hero-sub {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.45;
  margin: 0 0 20px;
}
.btn-primary {
  width: 100%;
  padding: 13px 16px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--a1), var(--a2));
  color: var(--on-grad);
  font-weight: 900;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 4px 18px var(--g1);
  margin-top: 8px;
}
.btn-primary:active {
  transform: scale(0.98);
}
.btn-secondary {
  width: 100%;
  padding: 11px 14px;
  border: 2px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
  color: var(--text);
  font-weight: 800;
  font-size: 13px;
  cursor: pointer;
  margin-top: 8px;
}
.back-btn {
  background: var(--btn);
  border: 1px solid var(--line);
  color: var(--text);
  border-radius: 10px;
  padding: 7px 12px;
  font-weight: 800;
  font-size: 12px;
  cursor: pointer;
  margin-bottom: 10px;
}
.screen-title {
  font-size: 20px;
  font-weight: 900;
  margin: 0 0 12px;
}
.sec-title {
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--a2);
  margin: 12px 0 6px;
}
.inp {
  width: 100%;
  padding: 11px 12px;
  border-radius: 10px;
  border: 2px solid var(--line);
  background: var(--deep);
  color: var(--text);
  font-size: 14px;
  outline: none;
  margin-bottom: 6px;
}
.inp:focus {
  border-color: var(--a2);
}
.form-error {
  color: var(--a1);
  font-size: 12px;
  font-weight: 800;
  min-height: 18px;
  margin: 4px 0;
}
.note {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.4;
  margin: 10px 0;
}

/* ===================== ПРОФИЛЬ И МЕНЮ ===================== */
.avatar-creator {
  background: var(--panel);
  border: 2px solid var(--line);
  border-radius: 14px;
  padding: 12px;
}
.avatar-big-preview,
.avatar-big {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  background: var(--btn);
  border: 2px solid var(--a2);
  margin: 0 auto 10px;
  flex-shrink: 0;
}
.avatar-big {
  margin: 0;
}
.animal-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
  margin-bottom: 10px;
}
.animal-grid button {
  padding: 6px;
  font-size: 20px;
  border-radius: 10px;
  border: 2px solid var(--line);
  background: var(--btn);
  cursor: pointer;
}
.animal-grid button.selected,
.animal-grid button.active {
  border-color: var(--a2);
  background: var(--selbg);
}
.color-row {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}
.color-row button {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.4);
  cursor: pointer;
}
.theme-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.profile-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--panel);
  border: 2px solid var(--line);
  border-radius: 16px;
  padding: 12px;
  margin-bottom: 14px;
}
.pc-info {
  flex: 1;
  min-width: 0;
}
.pc-name {
  font-weight: 900;
  font-size: 16px;
}
.pc-dept {
  font-size: 12px;
  color: var(--muted);
}
.pc-best {
  font-size: 12px;
  color: var(--a3);
  font-weight: 800;
  margin-top: 2px;
}
.pc-edit {
  background: var(--btn);
  border: 1px solid var(--line);
  color: var(--text);
  border-radius: 10px;
  width: 36px;
  height: 36px;
  cursor: pointer;
}
.menu-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  background: var(--panel);
  border: 2px solid var(--line);
  border-radius: 14px;
  padding: 12px;
  color: var(--text);
  text-align: left;
  cursor: pointer;
}
.menu-item.danger {
  border-color: rgba(255, 0, 122, 0.4);
}
.mi-ico {
  font-size: 24px;
}
.mi-txt {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.mi-txt b {
  font-size: 14px;
}
.mi-txt i {
  font-style: normal;
  font-size: 11px;
  color: var(--muted);
}
.mi-arr {
  font-size: 20px;
  color: var(--a2);
}

/* ===================== ЧАТ ===================== */
.chat-wrap {
  max-width: 460px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.chat-list {
  flex: 1;
  overflow-y: auto;
  background: var(--deep);
  border: 2px solid var(--line);
  border-radius: 12px;
  padding: 10px;
  margin-bottom: 8px;
}
.chat-form {
  display: flex;
  gap: 6px;
}
.chat-form .inp {
  margin-bottom: 0;
}
.chat-send {
  background: var(--a2);
  color: var(--on-a2);
  border: none;
  border-radius: 10px;
  width: 46px;
  font-size: 18px;
  font-weight: 900;
  cursor: pointer;
}

/* ===================== PRIDE TETRIS: ПОЛЕ СЛЕВА НА МАКСИМУМ + УЗКАЯ ПАНЕЛЬ СПРАВА ===================== */
.game-screen {
  display: none;
  flex-direction: column;
  width: 100%;
  height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
  background: var(--bg);
}
.game-screen.active {
  display: flex;
}

/* Верхняя шапка игры */
.header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  background: var(--panel);
  border-bottom: 2px solid var(--line);
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
}
.brand-box {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.avatar-badge {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--btn);
  border: 1.5px solid var(--a2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}
.brand-name {
  font-weight: 900;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.header-btns {
  display: flex;
  align-items: center;
  gap: 4px;
}
.hb {
  width: 32px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--btn);
  color: var(--text);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.hb.mus {
  border-color: var(--a2);
}

/* Игровая область в 2 колонки: слева стакан, справа узкий infobar */
.game-area {
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  display: flex !important;
  flex-direction: row !important;
  align-items: stretch !important;
  justify-content: center !important;
  gap: 6px !important;
  padding: 4px 6px !important;
  overflow: hidden;
}

/* Контейнер стакана забирает всё доступное место слева */
.board-wrap {
  flex: 1 !important;
  min-width: 0 !important;
  min-height: 0 !important;
  height: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  position: relative;
  overflow: hidden;
}

/* Стакан Тетриса занимает максимум экрана с сохранением пропорций */
#board {
  height: 100% !important;
  width: auto !important;
  max-width: 100% !important;
  max-height: 100% !important;
  aspect-ratio: 264 / 440 !important;
  display: block !important;
  background: var(--deep);
  border: 2px solid var(--a2);
  border-radius: 10px;
  box-shadow: 0 0 16px var(--g2);
}

.tap-hint {
  position: absolute;
  bottom: 6px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 8px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.45);
  pointer-events: none;
  white-space: nowrap;
}

#banner {
  position: absolute;
  top: 42%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.8);
  background: linear-gradient(135deg, var(--a1), var(--a2));
  color: #fff;
  font-weight: 900;
  font-size: 15px;
  padding: 6px 14px;
  border-radius: 10px;
  opacity: 0;
  pointer-events: none;
  transition: all 0.25s ease;
  z-index: 5;
  white-space: nowrap;
}
#banner.show {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}

/* Узкая вертикальная панель справа */
.infobar {
  width: 74px !important;
  flex-shrink: 0 !important;
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: space-between !important;
  gap: 4px !important;
  margin: 0 !important;
  padding: 0 !important;
}

.infobar .ib {
  width: 100% !important;
  background: var(--panel);
  border: 1.5px solid var(--line);
  border-radius: 9px;
  padding: 4px 3px !important;
  text-align: center !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
}

.infobar .ib .lbl {
  font-size: 9px !important;
  color: var(--muted);
  font-weight: 800;
  text-transform: uppercase;
  line-height: 1.1 !important;
  margin-bottom: 2px;
}

.infobar .ib .val {
  font-size: 12px !important;
  font-weight: 900;
  color: var(--text);
}

.service-tag {
  font-size: 10px;
  font-weight: 900;
  color: var(--a1);
  word-break: break-word;
  line-height: 1.1;
}

#nextCanvas.nextcv {
  width: 60px !important;
  height: 42px !important;
  display: block;
}

.infobar .ib.ult {
  flex: 1 !important;
  min-height: 54px !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: flex-end !important;
  gap: 5px !important;
  padding: 5px !important;
}

.ult-track {
  width: 100% !important;
  height: 8px !important;
  background: var(--deep);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--line);
}

.ult-bar {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, var(--a1), var(--a3));
  transition: width 0.2s ease;
}

.btn-ult {
  width: 100%;
  height: 32px;
  border-radius: 8px;
  border: 1.5px solid var(--a3);
  background: var(--btn);
  color: var(--a3);
  font-size: 16px;
  cursor: pointer;
}

/* Нижние кнопки управления в 1 компактный ряд */
.controls {
  flex-shrink: 0;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  display: grid !important;
  grid-template-columns: repeat(5, 1fr) !important;
  gap: 6px !important;
  padding: 4px 8px calc(6px + env(safe-area-inset-bottom)) !important;
}

.c-btn {
  height: 44px;
  border-radius: 10px;
  border: 2px solid var(--line);
  background: var(--panel);
  color: var(--text);
  font-size: 18px;
  font-weight: 900;
  cursor: pointer;
}
.c-btn:active {
  background: var(--btn);
  border-color: var(--a2);
}
.c-btn.drop {
  border-color: var(--a1);
}

/* ===================== МОДАЛЬНОЕ МЕНЮ В ИГРЕ ===================== */
.modal {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: rgba(0, 0, 0, 0.78);
  display: none;
  align-items: center;
  justify-content: center;
  padding: 14px;
}
.modal.open,
.modal.active {
  display: flex;
}
.modal-box {
  width: 100%;
  max-width: 380px;
  background: var(--panel);
  border: 2px solid var(--a2);
  border-radius: 16px;
  padding: 16px;
}
.modal-box h3 {
  margin: 0 0 10px;
  text-align: center;
}
.mode-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.mode-btn {
  display: flex;
  justify-content: space-between;
  padding: 9px 12px;
  border-radius: 10px;
  border: 2px solid var(--line);
  background: var(--btn);
  color: var(--text);
  cursor: pointer;
}
.mode-btn.selected {
  border-color: var(--a2);
  background: var(--selbg);
}
.music-box {
  background: var(--deep);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px;
}
.sfx-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  margin-top: 8px;
}
.track-btn {
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--btn);
  color: var(--text);
  font-weight: 800;
  cursor: pointer;
}
.track-btn.active {
  background: var(--a2);
  color: var(--on-a2);
  border-color: var(--a2);
}
