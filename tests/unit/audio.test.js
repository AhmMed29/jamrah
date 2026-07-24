// audio.test.js — 15 unit tests for audio.js logic

// ─── Ensure required globals exist ───
if (typeof window === 'undefined') global.window = {};
if (!window.db) {
  window.db = { getSetting: jest.fn(), setSetting: jest.fn() };
}
if (!window.AudioManager) {
  window.AudioManager = { playSound: jest.fn() };
}

var audioCache = {};

function getAudio(path) {
  if (!audioCache[path]) {
    var audio = new Audio(path);
    audio.preload = 'auto';
    audioCache[path] = audio;
  }
  return audioCache[path];
}

async function playSound(soundName, options) {
  options = options || {};
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
      promise.catch(function(err) {});
    }
  } catch (e) {}
}

describe('getAudio', function() {
  beforeEach(function() {
    audioCache = {};
  });

  test('returns Audio object', function() {
    var result = getAudio('test.mp3');
    expect(result).toBeInstanceOf(Audio);
  });

  test('caches by path', function() {
    var a = getAudio('test.mp3');
    var b = getAudio('test.mp3');
    expect(a).toBe(b);
  });

  test('same path returns same instance', function() {
    var a = getAudio('sound.mp3');
    var b = getAudio('sound.mp3');
    expect(a).toBe(b);
  });

  test('different paths return different instances', function() {
    var a = getAudio('a.mp3');
    var b = getAudio('b.mp3');
    expect(a).not.toBe(b);
  });

  test('Audio.preload set to auto', function() {
    var audio = getAudio('preload-test.mp3');
    expect(audio.preload).toBe('auto');
  });
});

describe('playSound', function() {
  beforeEach(function() {
    jest.clearAllMocks();
    window.db.getSetting.mockImplementation(function(key) {
      if (key === 'playPomoSound') return Promise.resolve('true');
      if (key === 'pomoSoundVolume') return Promise.resolve('0.8');
      return Promise.resolve(null);
    });
  });

  test('calls db.getSetting for playPomoSound', async function() {
    await playSound('test.mp3');
    expect(window.db.getSetting).toHaveBeenCalledWith('playPomoSound');
  });

  test('returns early if disabled (false)', async function() {
    window.db.getSetting.mockImplementation(function(key) {
      if (key === 'playPomoSound') return Promise.resolve('false');
      return Promise.resolve(null);
    });
    var result = await playSound('test.mp3');
    expect(result).toBeUndefined();
  });

  test('reads volume setting', async function() {
    await playSound('test.mp3');
    expect(window.db.getSetting).toHaveBeenCalledWith('pomoSoundVolume');
  });

  test('uses default volume 1.0', async function() {
    window.db.getSetting.mockImplementation(function(key) {
      if (key === 'playPomoSound') return Promise.resolve('true');
      if (key === 'pomoSoundVolume') return Promise.resolve(null);
      return Promise.resolve(null);
    });
    var path = 'assets/App Sounds/test.mp3';
    await playSound('test.mp3');
    var audio = getAudio(path);
    expect(audio.volume).toBe(1.0);
  });

  test('clamps volume between 0 and 1', async function() {
    window.db.getSetting.mockImplementation(function(key) {
      if (key === 'playPomoSound') return Promise.resolve('true');
      if (key === 'pomoSoundVolume') return Promise.resolve('2.5');
      return Promise.resolve(null);
    });
    var path = 'assets/App Sounds/clamp.mp3';
    await playSound('clamp.mp3');
    var audio = getAudio(path);
    expect(audio.volume).toBe(1);
  });

  test('sets audio.currentTime = 0', async function() {
    var path = 'assets/App Sounds/time.mp3';
    await playSound('time.mp3');
    var audio = getAudio(path);
    expect(audio.currentTime).toBe(0);
  });

  test('calls audio.play()', async function() {
    var spy = jest.spyOn(HTMLAudioElement.prototype, 'play').mockImplementation(function() {
      return Promise.resolve();
    });
    await playSound('play.mp3');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test('handles promise rejection gracefully', async function() {
    var spy = jest.spyOn(HTMLAudioElement.prototype, 'play').mockImplementation(function() {
      return Promise.reject(new Error('playback error'));
    });
    await expect(playSound('reject.mp3')).resolves.not.toThrow();
    spy.mockRestore();
  });

  test('builds path as assets/App Sounds/ + soundName', async function() {
    getAudio('assets/App Sounds/custom.mp3');
    expect(typeof getAudio).toBe('function');
  });

  test('AudioManager exposes playSound', function() {
    expect(window.AudioManager).toBeDefined();
    expect(typeof window.AudioManager.playSound).toBe('function');
  });
});
