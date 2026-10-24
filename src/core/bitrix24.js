export class BitrixService {
  constructor() {
    this.isInsideBitrix = typeof window.BX24 !== 'undefined';
    this.user = {
      id: 'local_1',
      name: localStorage.getItem('pride_user_name') || 'Лев Прайдов',
      avatar: localStorage.getItem('pride_user_avatar') || '🦁',
      color: localStorage.getItem('pride_user_color') || '#ff007a'
    };
  }

  async init() {
    const statusEl = document.getElementById('bxUserStatus');
    const nameInput = document.getElementById('playerNameInput');
    if (nameInput) nameInput.value = this.user.name;

    if (!this.isInsideBitrix) {
      if (statusEl) statusEl.innerText = `Игрок: ${this.user.name} (GitHub / Local)`;
      return this.user;
    }

    return new Promise((resolve) => {
      window.BX24.init(() => {
        window.BX24.fitWindow();
        window.BX24.callMethod('user.current', {}, (res) => {
          if (res.data()) {
            const u = res.data();
            this.user.id = u.ID;
            this.user.name = `${u.NAME} ${u.LAST_NAME}`.trim() || this.user.name;
            if (statusEl) statusEl.innerText = `Битрикс24: ${this.user.name}`;
            if (nameInput) nameInput.value = this.user.name;
          }
          resolve(this.user);
        });
      });
    });
  }

  updateProfile({ name, avatar, color }) {
    if (name) {
      this.user.name = name;
      localStorage.setItem('pride_user_name', name);
    }
    if (avatar) {
      this.user.avatar = avatar;
      localStorage.setItem('pride_user_avatar', avatar);
    }
    if (color) {
      this.user.color = color;
      localStorage.setItem('pride_user_color', color);
    }
    const statusEl = document.getElementById('bxUserStatus');
    if (statusEl) {
      statusEl.innerText = `${this.isInsideBitrix ? 'Битрикс24' : 'Игрок'}: ${this.user.name}`;
    }
  }
}
