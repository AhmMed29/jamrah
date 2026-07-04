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
  try {
    var enabled = await window.db.getSetting('playPomoSound');
    if (enabled === 'false') return;

    var volumeStr = await window.db.getSetting('pomoSoundVolume');
    var volume = parseFloat(volumeStr) || 1.0;
    var basePath = 'assets/App Sounds/';
    var path = basePath + soundName;

    var audio = getAudio(path);
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.currentTime = 0;
    var promise = audio.play();
    if (promise) {
      promise.catch(function(err) { console.warn('Audio play failed:', err.message); });
    }
  } catch (e) {
    console.warn('Sound error:', e.message);
  }
}

window.AudioManager = { playSound };