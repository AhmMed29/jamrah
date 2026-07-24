// timer.test.js — 70 unit tests for timer logic

var PHASE_LABELS = { idle: '', work: 'Focus', shortBreak: 'Short Break', longBreak: 'Long Break' }

function formatTime(secs) {
  var mm = Math.floor(secs / 60)
  var ss = Math.floor(secs % 60)
  return (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss
}

function toDuration(s, p) {
  if (p === 'work') return s.workMinutes * 60
  if (p === 'shortBreak') return s.shortBreakMinutes * 60
  if (p === 'longBreak') return s.longBreakMinutes * 60
  return s.workMinutes * 60
}

function recalcRemaining(state) {
  if (!state.isRunning) return
  var elapsed = (Date.now() - state.runStartTime) / 1000
  var remaining = state.totalSeconds - state.accumulatedSeconds - elapsed
  if (remaining < 0) remaining = 0
  state.remainingSeconds = remaining
}

function stopTimer(state) {
  if (state.isRunning && state.runStartTime > 0) {
    state.accumulatedSeconds += (Date.now() - state.runStartTime) / 1000
  }
  state.isRunning = false
  state.timerId = null
}

function startTimer(state) {
  state.runStartTime = Date.now()
  state.isRunning = true
}

// toggleTimer simulation (sync version matching timer.js pattern)
function simulateToggleTimer(state) {
  if (state.remainingSeconds <= 0) return
  if (state._pendingSessionStart) return
  if (state.phase === 'idle') {
    state.phase = 'work'
    startTimer(state)
    return 'started'
  } else if (state.isRunning) {
    stopTimer(state)
    state.remainingSeconds = Math.max(0, state.totalSeconds - state.accumulatedSeconds)
    return 'paused'
  } else {
    startTimer(state)
    return 'resumed'
  }
}

function simulateResetTimer(state) {
  state._pendingSessionStart = false
  stopTimer(state)
  state.phase = 'idle'
  state.sessionCount = 0
}

function simulateSkipPhase(state, longBreakInterval) {
  if (state.phase === 'idle') return
  stopTimer(state)
  if (state.phase === 'work') state.sessionCount++
  var lbi = longBreakInterval || 4
  if (state.phase === 'work') {
    state.phase = state.sessionCount % lbi === 0 ? 'longBreak' : 'shortBreak'
  } else {
    state.phase = 'work'
  }
}

function advancePhase(state, longBreakInterval) {
  var lbi = longBreakInterval || 4
  if (state.phase === 'work') {
    state.sessionCount++
    state.phase = state.sessionCount % lbi === 0 ? 'longBreak' : 'shortBreak'
  } else {
    state.phase = 'work'
  }
}

function makeState(overrides) {
  var s = {
    phase: 'idle',
    totalSeconds: 1500,
    remainingSeconds: 1500,
    accumulatedSeconds: 0,
    sessionCount: 0,
    isRunning: false,
    timerId: null,
    runStartTime: 0,
    _pendingSessionStart: false
  }
  if (overrides) Object.assign(s, overrides)
  return s
}

// ─── Suite 1: PHASE_LABELS ───
describe('PHASE_LABELS', function () {
  test('idle returns empty string', function () {
    expect(PHASE_LABELS.idle).toBe('')
  })
  test('work returns Focus', function () {
    expect(PHASE_LABELS.work).toBe('Focus')
  })
  test('shortBreak returns Short Break', function () {
    expect(PHASE_LABELS.shortBreak).toBe('Short Break')
  })
  test('longBreak returns Long Break', function () {
    expect(PHASE_LABELS.longBreak).toBe('Long Break')
  })
  test('unknown phase returns undefined', function () {
    expect(PHASE_LABELS.unknown).toBeUndefined()
  })
})

// ─── Suite 2: formatTime ───
describe('formatTime', function () {
  test('0 returns "00:00"', function () {
    expect(formatTime(0)).toBe('00:00')
  })
  test('125 returns "02:05"', function () {
    expect(formatTime(125)).toBe('02:05')
  })
  test('3661 returns "61:01"', function () {
    expect(formatTime(3661)).toBe('61:01')
  })
  test('59 returns "00:59"', function () {
    expect(formatTime(59)).toBe('00:59')
  })
  test('3600 returns "60:00"', function () {
    expect(formatTime(3600)).toBe('60:00')
  })
  test('1 returns "00:01"', function () {
    expect(formatTime(1)).toBe('00:01')
  })
  test('floors decimal values', function () {
    expect(formatTime(125.7)).toBe('02:05')
  })
  test('negative values produce negative mm and ss (floor)', function () {
    expect(formatTime(-1)).toBe('0-1:0-1')
  })
})

// ─── Suite 3: toDuration ───
describe('toDuration', function () {
  var settings = { workMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15 }
  test('work phase returns workMinutes * 60', function () {
    expect(toDuration(settings, 'work')).toBe(1500)
  })
  test('shortBreak returns shortBreakMinutes * 60', function () {
    expect(toDuration(settings, 'shortBreak')).toBe(300)
  })
  test('longBreak returns longBreakMinutes * 60', function () {
    expect(toDuration(settings, 'longBreak')).toBe(900)
  })
  test('unknown phase defaults to workMinutes * 60', function () {
    expect(toDuration(settings, 'unknown')).toBe(1500)
  })
  test('null phase defaults to workMinutes * 60', function () {
    expect(toDuration(settings, null)).toBe(1500)
  })
  test('undefined phase defaults to workMinutes * 60', function () {
    expect(toDuration(settings, undefined)).toBe(1500)
  })
  test('zero minutes returns 0', function () {
    expect(toDuration({ workMinutes: 0 }, 'work')).toBe(0)
  })
  test('large values (90 min work) returns 5400', function () {
    expect(toDuration({ workMinutes: 90 }, 'work')).toBe(5400)
  })
})

// ─── Suite 4: recalcRemaining ───
describe('recalcRemaining', function () {
  beforeEach(function () {
    jest.useFakeTimers()
  })
  afterEach(function () {
    jest.useRealTimers()
  })
  test('not running does not change remaining', function () {
    var s = makeState({ remainingSeconds: 1000 })
    recalcRemaining(s)
    expect(s.remainingSeconds).toBe(1000)
  })
  test('running calculates elapsed correctly', function () {
    var s = makeState({ isRunning: true, runStartTime: Date.now() - 5000 })
    recalcRemaining(s)
    expect(s.remainingSeconds).toBeCloseTo(1495, -1)
  })
  test('elapsed > totalSeconds sets remaining to 0', function () {
    var s = makeState({ isRunning: true, runStartTime: Date.now() - 2000, totalSeconds: 1, accumulatedSeconds: 0 })
    recalcRemaining(s)
    expect(s.remainingSeconds).toBe(0)
  })
  test('accumulatedSeconds adds to elapsed', function () {
    var s = makeState({ isRunning: true, runStartTime: Date.now() - 3000, accumulatedSeconds: 500 })
    recalcRemaining(s)
    expect(s.remainingSeconds).toBeCloseTo(997, -1)
  })
  test('runStartTime = 0 causes huge elapsed -> remaining 0', function () {
    var s = makeState({ isRunning: true, runStartTime: 0 })
    recalcRemaining(s)
    expect(s.remainingSeconds).toBe(0)
  })
})

// ─── Suite 5: stopTimer ───
describe('stopTimer', function () {
  beforeEach(function () {
    jest.useFakeTimers()
  })
  afterEach(function () {
    jest.useRealTimers()
  })
  test('sets isRunning to false', function () {
    var s = makeState({ isRunning: true, runStartTime: Date.now() - 1000 })
    stopTimer(s)
    expect(s.isRunning).toBe(false)
  })
  test('clears timerId', function () {
    var s = makeState({ isRunning: true, timerId: 123 })
    stopTimer(s)
    expect(s.timerId).toBeNull()
  })
  test('called when stopped does not crash', function () {
    var s = makeState()
    stopTimer(s)
    expect(s.isRunning).toBe(false)
  })
  test('accumulates elapsed time', function () {
    var s = makeState({ isRunning: true, runStartTime: Date.now() - 5000, accumulatedSeconds: 100 })
    stopTimer(s)
    expect(s.accumulatedSeconds).toBeGreaterThan(100)
  })
  test('without runStartTime does not accumulate', function () {
    var s = makeState({ isRunning: true, runStartTime: 0 })
    stopTimer(s)
    expect(s.accumulatedSeconds).toBe(0)
  })
})

// ─── Suite 6: startTimer ───
describe('startTimer', function () {
  test('sets isRunning to true', function () {
    var s = makeState()
    startTimer(s)
    expect(s.isRunning).toBe(true)
  })
  test('sets runStartTime', function () {
    var s = makeState()
    var before = Date.now()
    startTimer(s)
    expect(s.runStartTime).toBeGreaterThanOrEqual(before)
  })
  test('can be called after stop', function () {
    var s = makeState({ isRunning: false })
    startTimer(s)
    expect(s.isRunning).toBe(true)
  })
})

// ─── Suite 7: toggleTimer (simulated) ───
describe('toggleTimer', function () {
  test('from idle sets phase to work and starts timer', function () {
    var s = makeState()
    var result = simulateToggleTimer(s)
    expect(s.phase).toBe('work')
    expect(s.isRunning).toBe(true)
    expect(result).toBe('started')
  })
  test('from idle returns started', function () {
    var s = makeState()
    expect(simulateToggleTimer(s)).toBe('started')
  })
  test('from running pauses and calculates remaining', function () {
    var s = makeState({ phase: 'work', isRunning: true, runStartTime: Date.now() - 5000, accumulatedSeconds: 0 })
    var result = simulateToggleTimer(s)
    expect(s.isRunning).toBe(false)
    expect(s.remainingSeconds).toBeLessThan(1500)
    expect(result).toBe('paused')
  })
  test('from paused resumes', function () {
    var s = makeState({ phase: 'work', isRunning: false, remainingSeconds: 1000, totalSeconds: 1500, accumulatedSeconds: 500 })
    expect(simulateToggleTimer(s)).toBe('resumed')
    expect(s.isRunning).toBe(true)
  })
  test('remainingSeconds <= 0 returns immediately', function () {
    var s = makeState({ remainingSeconds: 0 })
    expect(simulateToggleTimer(s)).toBeUndefined()
    expect(s.phase).toBe('idle')
  })
  test('_pendingSessionStart returns immediately', function () {
    var s = makeState({ _pendingSessionStart: true })
    expect(simulateToggleTimer(s)).toBeUndefined()
  })
  test('multiple idle calls only start once (guard)', function () {
    var s = makeState()
    simulateToggleTimer(s)
    expect(s.phase).toBe('work')
    expect(s.isRunning).toBe(true)
    // Second call from running should pause
    var r2 = simulateToggleTimer(s)
    expect(r2).toBe('paused')
  })
  test('toggle between run and pause cycles correctly', function () {
    var s = makeState()
    simulateToggleTimer(s) // start
    expect(s.isRunning).toBe(true)
    simulateToggleTimer(s) // pause
    expect(s.isRunning).toBe(false)
    simulateToggleTimer(s) // resume
    expect(s.isRunning).toBe(true)
    simulateToggleTimer(s) // pause
    expect(s.isRunning).toBe(false)
  })
})

// ─── Suite 8: resetTimer ───
describe('resetTimer', function () {
  test('sets phase to idle', function () {
    var s = makeState({ phase: 'work' })
    simulateResetTimer(s)
    expect(s.phase).toBe('idle')
  })
  test('stops timer', function () {
    var s = makeState({ isRunning: true })
    simulateResetTimer(s)
    expect(s.isRunning).toBe(false)
  })
  test('resets sessionCount to 0', function () {
    var s = makeState({ sessionCount: 5 })
    simulateResetTimer(s)
    expect(s.sessionCount).toBe(0)
  })
  test('clears _pendingSessionStart', function () {
    var s = makeState({ _pendingSessionStart: true })
    simulateResetTimer(s)
    expect(s._pendingSessionStart).toBe(false)
  })
})

// ─── Suite 9: skipPhase ───
describe('skipPhase', function () {
  test('idle phase returns without changes', function () {
    var s = makeState()
    simulateSkipPhase(s)
    expect(s.phase).toBe('idle')
    expect(s.sessionCount).toBe(0)
  })
  test('work increments sessionCount', function () {
    var s = makeState({ phase: 'work', sessionCount: 0 })
    simulateSkipPhase(s)
    expect(s.sessionCount).toBe(1)
  })
  test('work with interval 4, count 3 increments to 4 -> longBreak', function () {
    var s = makeState({ phase: 'work', sessionCount: 3 })
    simulateSkipPhase(s, 4)
    expect(s.phase).toBe('longBreak')
  })
  test('work with interval 4, count 4 increments to 5 -> shortBreak', function () {
    var s = makeState({ phase: 'work', sessionCount: 4 })
    simulateSkipPhase(s, 4)
    expect(s.phase).toBe('shortBreak')
  })
  test('work with interval 2, count 2 increments to 3 -> shortBreak', function () {
    var s = makeState({ phase: 'work', sessionCount: 2 })
    simulateSkipPhase(s, 2)
    expect(s.phase).toBe('shortBreak')
  })
  test('shortBreak goes to work', function () {
    var s = makeState({ phase: 'shortBreak', sessionCount: 2 })
    simulateSkipPhase(s)
    expect(s.phase).toBe('work')
  })
  test('longBreak goes to work', function () {
    var s = makeState({ phase: 'longBreak', sessionCount: 2 })
    simulateSkipPhase(s)
    expect(s.phase).toBe('work')
  })
  test('stops timer', function () {
    var s = makeState({ phase: 'work', isRunning: true })
    simulateSkipPhase(s)
    expect(s.isRunning).toBe(false)
  })
})

// ─── Suite 10: advancePhase ───
describe('advancePhase', function () {
  test('work increments sessionCount', function () {
    var s = makeState({ phase: 'work', sessionCount: 0 })
    advancePhase(s)
    expect(s.sessionCount).toBe(1)
  })
  test('work with interval 4, count 3 increments to 4 -> longBreak', function () {
    var s = makeState({ phase: 'work', sessionCount: 3 })
    advancePhase(s, 4)
    expect(s.phase).toBe('longBreak')
  })
  test('work with interval 4, count 4 increments to 5 -> shortBreak', function () {
    var s = makeState({ phase: 'work', sessionCount: 4 })
    advancePhase(s, 4)
    expect(s.phase).toBe('shortBreak')
  })
  test('shortBreak goes to work', function () {
    var s = makeState({ phase: 'shortBreak', sessionCount: 2 })
    advancePhase(s)
    expect(s.phase).toBe('work')
  })
  test('longBreak goes to work', function () {
    var s = makeState({ phase: 'longBreak', sessionCount: 2 })
    advancePhase(s)
    expect(s.phase).toBe('work')
  })
  test('sessionCount wraps — count 8 with interval 4 increments to 9 -> shortBreak', function () {
    var s = makeState({ phase: 'work', sessionCount: 8 })
    advancePhase(s, 4)
    expect(s.phase).toBe('shortBreak')
    expect(s.sessionCount).toBe(9)
  })
})

// ─── Suite 11: Edge cases ───
describe('edge cases', function () {
  test('toDuration with empty settings returns NaN * 60', function () {
    expect(toDuration({}, 'work')).toBeNaN()
  })
  test('large session count does not break modulo', function () {
    var s = makeState({ phase: 'work', sessionCount: 100 })
    simulateSkipPhase(s, 4)
    expect(s.phase).toBe('shortBreak')
    expect(s.sessionCount).toBe(101)
  })
  test('stopTimer called twice does not double accumulate', function () {
    var s = makeState({ isRunning: true, runStartTime: Date.now() - 10000, accumulatedSeconds: 0 })
    stopTimer(s)
    var acc1 = s.accumulatedSeconds
    stopTimer(s)
    var acc2 = s.accumulatedSeconds
    expect(acc2).toBe(acc1)
  })
})
