const audioCache = {};

function getAudio(path) {
  if (!audioCache[path]) {
    const audio = new Audio(path);
    audio.preload = 'auto';
    audioCache[path] = audio;
  }
  return audioCache[path];
}

async function playSound(soundName, options = {}) {
  // getSetting is async IPC — the old sync reads compared a Promise to
  // 'false' (always true) and parseFloat'd a Promise (always NaN)
  const enabled = window.db ? (await window.db.getSetting('playPomoSound')) !== 'false' : true;
  if (!enabled) return;

  const volume = parseFloat(window.db ? await window.db.getSetting('pomoSoundVolume') : '') || 1.0;
  const basePath = 'assets/App Sounds/';
  const path = basePath + soundName;

  try {
    const audio = getAudio(path);
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.currentTime = 0;
    const promise = audio.play();
    if (promise) {
      promise.catch(err => console.warn('Audio play failed:', err.message));
    }
  } catch (e) {
    console.warn('Sound error:', e.message);
  }
}

window.AudioManager = { playSound };