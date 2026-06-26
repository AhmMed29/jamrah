import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { Button } from "./ui/button";

export interface PomodoroSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
}

interface PomodoroSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: PomodoroSettings;
  onSave: (settings: PomodoroSettings) => void;
}

function StepInput({
  label,
  value,
  onChange,
  min = 1,
  max = 60,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5">
      <span className="text-sm text-white/60 tracking-wide">{label}</span>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors text-lg"
        >
          −
        </button>
        <span
          className="w-8 text-center text-white/90 tabular-nums"
          style={{ fontFamily: "'Instrument Serif', serif", fontSize: 20 }}
        >
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors text-lg"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function PomodoroSheet({ open, onOpenChange, settings, onSave }: PomodoroSheetProps) {
  const [local, setLocal] = useState(settings);

  const handleSave = () => {
    onSave(local);
    onOpenChange(false);
  };

  const set = (key: keyof PomodoroSettings) => (v: number) => {
    setLocal(prev => ({ ...prev, [key]: v }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl bg-[#0a0a0a] border-t border-white/5 max-w-[520px] mx-auto"
      >
        <SheetHeader className="px-6 pt-6 pb-2">
          <SheetTitle
            className="text-white/80"
            style={{ fontFamily: "'Instrument Serif', serif", fontSize: 26, fontWeight: 400 }}
          >
            Timer Settings
          </SheetTitle>
        </SheetHeader>

        <div className="px-6 pb-2">
          <StepInput label="Focus" value={local.workMinutes} onChange={set('workMinutes')} min={1} max={90} />
          <StepInput label="Short Break" value={local.shortBreakMinutes} onChange={set('shortBreakMinutes')} min={1} max={30} />
          <StepInput label="Long Break" value={local.longBreakMinutes} onChange={set('longBreakMinutes')} min={1} max={60} />
        </div>

        <div className="px-6 py-5">
          <Button
            onClick={handleSave}
            className="w-full rounded-full bg-white/10 hover:bg-white/15 text-white/80 border-0 h-12 transition-colors"
          >
            Save
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
