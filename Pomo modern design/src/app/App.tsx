import { useState, useEffect, useCallback, useRef } from "react";
import { ShaderCanvas } from "./components/ShaderCanvas";
import { ShaderSelector } from "./components/ShaderSelector";
import { SonnerToastProvider } from "./components/SonnerToastProvider";
import { PomodoroFace, type Phase } from "./components/PomodoroFace";
import { PomodoroSheet, type PomodoroSettings } from "./components/PomodoroSheet";
import { initAudioContext, playPhaseEndSound } from "./components/util/sounds";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, SkipForward, Settings2 } from "lucide-react";
import "../styles/sonner-fixes.css";
import "../styles/input-fixes.css";

const DEFAULT_SETTINGS: PomodoroSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
};

const SESSIONS_BEFORE_LONG_BREAK = 4;

function toDuration(settings: PomodoroSettings, phase: Phase): number {
  if (phase === 'work') return settings.workMinutes * 60;
  if (phase === 'shortBreak') return settings.shortBreakMinutes * 60;
  if (phase === 'longBreak') return settings.longBreakMinutes * 60;
  return settings.workMinutes * 60;
}

function nextPhase(current: Phase, sessionCount: number): Phase {
  if (current === 'work') {
    return (sessionCount + 1) % SESSIONS_BEFORE_LONG_BREAK === 0 ? 'longBreak' : 'shortBreak';
  }
  return 'work';
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.workMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [phaseComplete, setPhaseComplete] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedShader, setSelectedShader] = useState(1);
  const [canvasSize, setCanvasSize] = useState(560);
  const audioInitialized = useRef(false);
  // Refs to avoid stale closures in timer callback
  const phaseRef = useRef<Phase>('idle');
  const sessionCountRef = useRef(0);
  const settingsRef = useRef(DEFAULT_SETTINGS);
  phaseRef.current = phase;
  sessionCountRef.current = sessionCount;
  settingsRef.current = settings;

  useEffect(() => { document.documentElement.classList.add("dark"); }, []);

  // Responsive canvas size
  useEffect(() => {
    const resize = () => {
      const size = Math.min(window.innerWidth, window.innerHeight) * 0.68;
      setCanvasSize(Math.max(260, size));
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Persist shader preference
  useEffect(() => {
    const saved = localStorage.getItem("selectedShader");
    if (saved) setSelectedShader(parseInt(saved, 10));
  }, []);

  const handleSelectShader = (id: number) => {
    setSelectedShader(id);
    localStorage.setItem("selectedShader", id.toString());
  };

  // Phase transition — reads from refs to avoid stale closures
  const advancePhase = useCallback(() => {
    playPhaseEndSound();
    const fromPhase = phaseRef.current;
    const fromCount = sessionCountRef.current;
    const s = settingsRef.current;
    if (fromPhase === 'work') {
      const newCount = fromCount + 1;
      setSessionCount(newCount);
      const next: Phase = newCount % SESSIONS_BEFORE_LONG_BREAK === 0 ? 'longBreak' : 'shortBreak';
      setPhase(next);
      setTimeLeft(toDuration(s, next));
    } else {
      setPhase('work');
      setTimeLeft(toDuration(s, 'work'));
    }
    setIsRunning(false);
  }, []);

  // Trigger phase advance when timer hits zero
  useEffect(() => {
    if (phaseComplete) {
      setPhaseComplete(false);
      advancePhase();
    }
  }, [phaseComplete, advancePhase]);

  // Countdown
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setPhaseComplete(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const handleCircleClick = () => {
    if (!audioInitialized.current) {
      initAudioContext();
      audioInitialized.current = true;
    }
    if (phase === 'idle') {
      setPhase('work');
      setTimeLeft(toDuration(settings, 'work'));
      setIsRunning(true);
    } else {
      setIsRunning(r => !r);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setPhase('idle');
    setTimeLeft(settings.workMinutes * 60);
    setSessionCount(0);
  };

  const handleSkip = () => {
    if (phase === 'idle') return;
    setIsRunning(false);
    const next = nextPhase(phase, sessionCount);
    if (phase === 'work') setSessionCount(sc => sc + 1);
    setPhase(next);
    setTimeLeft(toDuration(settings, next));
  };

  const handleSaveSettings = (newSettings: PomodoroSettings) => {
    setSettings(newSettings);
    // Reset timer to new work duration if idle
    if (phase === 'idle') {
      setTimeLeft(newSettings.workMinutes * 60);
    }
  };

  const isWork = phase === 'work' && isRunning;
  const isBreak = (phase === 'shortBreak' || phase === 'longBreak') && isRunning;

  // Session dots: how many full pomodoros done in this round (max 4)
  const dotsCompleted = sessionCount % SESSIONS_BEFORE_LONG_BREAK;

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
      <SonnerToastProvider />

      <ShaderSelector selectedShader={selectedShader} onSelectShader={handleSelectShader} />

      {/* Main circle + face */}
      <motion.div
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
        style={{ width: canvasSize, height: canvasSize }}
      >
        <ShaderCanvas
          size={canvasSize}
          onClick={handleCircleClick}
          hasActiveReminders={isWork}
          hasUpcomingReminders={isBreak}
          shaderId={selectedShader}
        />
        <PomodoroFace
          phase={phase}
          timeLeft={timeLeft}
          isRunning={isRunning}
          size={canvasSize}
        />
      </motion.div>

      {/* Session dots */}
      <AnimatePresence>
        {phase !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex items-center gap-2 mt-6"
          >
            {Array.from({ length: SESSIONS_BEFORE_LONG_BREAK }).map((_, i) => (
              <motion.div
                key={i}
                className="rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  background: i < dotsCompleted
                    ? 'rgba(255,255,255,0.7)'
                    : i === dotsCompleted && phase === 'work'
                      ? 'rgba(255,255,255,0.35)'
                      : 'rgba(255,255,255,0.12)',
                }}
                animate={{
                  scale: i === dotsCompleted && phase === 'work' && isRunning ? [1, 1.4, 1] : 1,
                }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex items-center gap-8 mt-5"
      >
        {/* Reset */}
        <motion.button
          onClick={handleReset}
          className="text-white/25 hover:text-white/60 transition-colors"
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Reset"
        >
          <RotateCcw size={18} strokeWidth={1.5} />
        </motion.button>

        {/* Play / Pause — large center */}
        <motion.button
          onClick={handleCircleClick}
          className="w-11 h-11 rounded-full flex items-center justify-center border border-white/10 text-white/70 hover:text-white hover:border-white/25 transition-all bg-white/5 hover:bg-white/10"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          aria-label={isRunning ? "Pause" : "Play"}
        >
          {isRunning ? (
            <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor">
              <rect x="0" y="0" width="4" height="16" rx="1" />
              <rect x="10" y="0" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="16" viewBox="0 0 12 16" fill="currentColor" style={{ marginLeft: 2 }}>
              <polygon points="0,0 12,8 0,16" />
            </svg>
          )}
        </motion.button>

        {/* Skip */}
        <motion.button
          onClick={handleSkip}
          className="text-white/25 hover:text-white/60 transition-colors"
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Skip"
        >
          <SkipForward size={18} strokeWidth={1.5} />
        </motion.button>
      </motion.div>

      {/* Settings */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        onClick={() => setShowSettings(true)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white/15 hover:text-white/45 transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Settings"
      >
        <Settings2 size={16} strokeWidth={1.5} />
      </motion.button>

      <PomodoroSheet
        open={showSettings}
        onOpenChange={setShowSettings}
        settings={settings}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
