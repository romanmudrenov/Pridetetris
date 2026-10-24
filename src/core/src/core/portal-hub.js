window.PrideCore = window.PrideCore || {};

(function() {
  var playerName = localStorage.getItem('pride_player_name') || "Лев Прайдов";
  var avatarEmoji = localStorage.getItem('pride_avatar_emoji') || "🦁";
  var avatarColor = localStorage.getItem('pride_avatar_color') || "#ff007a";

  function setPlayerName(name) {
    playerName = (name || "").trim() || "Лев Прайдов";
    localStorage.setItem('pride_player_name', playerName);
    var hName = document.getElementById('headerPlayerName');
    var wInp = document.getElementById('welcomeNameInput');
    var mInp = document.getElementById('menuNameInput');
    if (hName) hName.innerText = playerName;
    if (wInp) wInp.value = playerName;
    if (mInp) mInp.value = playerName;
  }

  function setAvatarAnimal(emoji) {
    avatarEmoji = emoji;
    localStorage.setItem('pride_avatar_emoji', emoji);
    var wPrev = document.getElementById('welcomeAvatarPreview');
    var mPrev = document.getElementById('menuAvatarPreview');
    var hAva = document.getElementById('headerAvatar');
    if (wPrev) wPrev.innerText = emoji;
    if (mPrev) mPrev.innerText = emoji;
    if (hAva) hAva.innerText = emoji;

    var allAnimalBtns = document.querySelectorAll('.animal-opt');
    for (var i = 0; i < allAnimalBtns.length; i++) {
      allAnimalBtns[i].classList.toggle('selected', allAnimalBtns[i].getAttribute('data-animal') === emoji);
    }
  }

  function setAvatarColor(col) {
    avatarColor = col;
    localStorage.setItem('pride_avatar_color', col);
    var wPrev = document.getElementById('welcomeAvatarPreview');
    var mPrev = document.getElementById('menuAvatarPreview');
    var hAva = document.getElementById('headerAvatar');
    if (wPrev) wPrev.style.background = col;
    if (mPrev) mPrev.style.background = col;
    if (hAva) hAva.style.background = col;
  }

  function initPortalUI(callbacks) {
    var Audio = window.PrideCore.Audio;
    setPlayerName(playerName);
    setAvatarAnimal(avatarEmoji);
    setAvatarColor(avatarColor);

    var welcomeModal = document.getElementById('welcomeModal');
    var btnWelcomeMusicOn = document.getElementById('btnWelcomeMusicOn');
    var btnWelcomeMusicOff = document.getElementById('btnWelcomeMusicOff');
    var welcomeTrackPanel = document.getElementById('welcomeTrackPanel');

    if (btnWelcomeMusicOn && btnWelcomeMusicOff) {
      btnWelcomeMusicOn.onclick = function(e) {
        e.stopPropagation();
        Audio.ensureAudio();
        btnWelcomeMusicOn.classList.add('active');
        btnWelcomeMusicOff.classList.remove('active');
        welcomeTrackPanel.style.display = 'block';
        Audio.startMusic(Audio.getLastActiveTrack() || 's1');
      };

      btnWelcomeMusicOff.onclick = function(e) {
        e.stopPropagation();
        btnWelcomeMusicOff.classList.add('active');
        btnWelcomeMusicOn.classList.remove('active');
        welcomeTrackPanel.style.display = 'none';
        Audio.startMusic('off');
      };
    }

    var btnStartWelcome = document.getElementById('btnStartWelcome');
    if (btnStartWelcome) {
      btnStartWelcome.onclick = function(e) {
        e.stopPropagation();
        Audio.ensureAudio();
        var wInp = document.getElementById('welcomeNameInput');
        if (wInp) setPlayerName(wInp.value);
        if (welcomeModal) welcomeModal.style.display = 'none';
        if (callbacks && callbacks.onWelcomeComplete) {
          callbacks.onWelcomeComplete(playerName);
        }
      };
    }

    var animalOpts = document.querySelectorAll('.animal-opt');
    for (var a = 0; a < animalOpts.length; a++) {
      animalOpts[a].onclick = function(e) {
        e.stopPropagation();
        Audio.ensureAudio();
        setAvatarAnimal(this.getAttribute('data-animal'));
        Audio.playSfx('rotate');
      };
    }

    var colorDots = document.querySelectorAll('.color-dot');
    for (var c = 0; c < colorDots.length; c++) {
      colorDots[c].onclick = function(e) {
        e.stopPropagation();
        Audio.ensureAudio();
        setAvatarColor(this.getAttribute('data-color'));
        Audio.playSfx('move');
      };
    }

    var trackBtns = document.querySelectorAll('.track-btn[data-track]');
    for (var t = 0; t < trackBtns.length; t++) {
      trackBtns[t].onclick = function(e) {
        e.stopPropagation();
        Audio.ensureAudio();
        Audio.startMusic(this.getAttribute('data-track'));
      };
    }

    var btnToggleSfx = document.getElementById('btnToggleSfx');
    if (btnToggleSfx) {
      btnToggleSfx.onclick = function(e) {
        e.stopPropagation();
        var state = Audio.toggleSfx();
        this.innerText = state ? "ВКЛ" : "ВЫКЛ";
        this.classList.toggle('active', state);
      };
    }
  }

  window.PrideCore.Hub = {
    initPortalUI: initPortalUI,
    getPlayerName: function() { return playerName; },
    setPlayerName: setPlayerName
  };
})();
