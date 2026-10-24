export class PortalHub {
  constructor(bitrixService) {
    this.bx = bitrixService;
    this.leaderboard = JSON.parse(localStorage.getItem('pride_leaderboard')) || [
      { name: "Анна (Арт-директор)", avatar: "🦊", score: 14500, mode: "Deadline (Hard)" },
      { name: "Максим (Отдел продаж)", avatar: "🐯", score: 11200, mode: "ASAP (Medium)" },
      { name: "Игорь (Печатный цех)", avatar: "🐻", score: 8400, mode: "ASAP (Medium)" }
    ];

    this.messages = JSON.parse(localStorage.getItem('pride_chat_msgs')) || [
      { author: "Система PRIDE", avatar: "⚡", text: "Добро пожаловать в корпоративный турнир PRIDE!", time: "10:00", sys: true }
    ];
  }

  init() {
    this.renderLeaderboard();
    this.renderChat();
    this.bindTabs();
    this.bindChatForm();
  }

  bindTabs() {
    const tabs = document.querySelectorAll('.hub-tab');
    const panels = document.querySelectorAll('.hub-panel');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const target = document.getElementById(tab.getAttribute('data-tab'));
        if (target) target.classList.add('active');
      });
    });
  }

  bindChatForm() {
    const form = document.getElementById('chatForm');
    const input = document.getElementById('chatInput');
    if (!form || !input) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const txt = input.value.trim();
      if (!txt) return;
      this.addChatMessage(this.bx.user.name, this.bx.user.avatar, txt, false);
      input.value = '';
    });
  }

  addChatMessage(author, avatar, text, isSystem = false) {
    const time = new Date().toTimeString().slice(0, 5);
    this.messages.push({ author, avatar, text, time, sys: isSystem });
    localStorage.setItem('pride_chat_msgs', JSON.stringify(this.messages));
    this.renderChat();
  }

  submitScore(score, lines, mode) {
    if (score <= 0) return;
    this.leaderboard.push({
      name: this.bx.user.name,
      avatar: this.bx.user.avatar,
      score,
      mode
    });
    this.leaderboard.sort((a, b) => b.score - a.score);
    this.leaderboard = this.leaderboard.slice(0, 10);
    localStorage.setItem('pride_leaderboard', JSON.stringify(this.leaderboard));
    this.renderLeaderboard();

    this.addChatMessage(
      "Турнирный Бот",
      "🏆",
      `${this.bx.user.avatar} ${this.bx.user.name} закрыл тендер на ${score} ₽ (${lines} линий)!`,
      true
    );
  }

  renderLeaderboard() {
    const el = document.getElementById('leaderboardList');
    if (!el) return;
    el.innerHTML = this.leaderboard.map((item, idx) => `
      <div class="lb-row ${idx === 0 ? 'top1' : ''}">
        <div class="lb-rank">#${idx + 1}</div>
        <div class="lb-avatar">${item.avatar}</div>
        <div class="lb-info">
          <div class="lb-name">${item.name}</div>
          <div class="lb-mode">${item.mode}</div>
        </div>
        <div class="lb-score">${item.score} ₽</div>
      </div>
    `).join('');
  }

  renderChat() {
    const el = document.getElementById('chatMessages');
    if (!el) return;
    el.innerHTML = this.messages.map(m => `
      <div class="chat-msg ${m.sys ? 'sys-msg' : ''}">
        <span class="c-ava">${m.avatar}</span>
        <div class="c-body">
          <div class="c-meta"><b>${m.author}</b> <span>${m.time}</span></div>
          <div class="c-text">${m.text}</div>
        </div>
      </div>
    `).join('');
    el.scrollTop = el.scrollHeight;
  }
}
