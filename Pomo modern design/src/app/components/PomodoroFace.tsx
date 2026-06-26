import { motion, AnimatePresence } from "framer-motion";

export type Phase = 'idle' | 'work' | 'shortBreak' | 'longBreak';

interface PomodoroFaceProps {
  phase: Phase;
  timeLeft: number;
  isRunning: boolean;
  size: number;
}

const PHASE_LABELS: Record<Phase, string> = {
  idle: '',
  work: 'Focus',
  shortBreak: 'Short Break',
  longBreak: 'Long Break',
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function PomodoroFace({ phase, timeLeft, isRunning, size }: PomodoroFaceProps) {
  const fontSize = size < 300 ? 32 : size < 450 ? 44 : 56;
  const label = PHASE_LABELS[phase];

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none"
      style={{ zIndex: 10 }}
    >
      <AnimatePresence mode="wait">
        {phase === 'idle' ? (
          <motion.span
            key="idle"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35 }}
            style={{ fontFamily: "'Instrument Serif', serif", fontSize: fontSize * 0.38 }}
            className="text-white/30 tracking-widest uppercase"
          >
            tap to start
          </motion.span>
        ) : (
          <motion.div
            key="timer"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col items-center gap-2"
          >
            <motion.span
              key={formatTime(timeLeft)}
              style={{
                fontFamily: "'Instrument Serif', serif",
                fontSize,
                letterSpacing: '0.04em',
                color: 'rgba(255,255,255,0.92)',
              }}
              animate={{ opacity: isRunning ? [1, 0.85, 1] : 1 }}
              transition={isRunning ? { duration: 1, repeat: Infinity, ease: "easeInOut" } : {}}
            >
              {formatTime(timeLeft)}
            </motion.span>
            <span
              className="tracking-[0.22em] uppercase text-white/40"
              style={{ fontSize: fontSize * 0.22, fontFamily: "'Inter', sans-serif" }}
            >
              {label}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
