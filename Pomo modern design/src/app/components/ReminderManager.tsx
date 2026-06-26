import { useState, useEffect } from "react";
import { toast } from "sonner@2.0.3";
import { Bell, CheckCircle } from "lucide-react";
import { playCompletionSound, initAudioContext } from "./util/sounds";

export interface Reminder {
  id: string;
  message: string;
  time: Date;
  completed: boolean;
}

export const useReminderManager = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  // Initialize AudioContext
  useEffect(() => {
    // Only create AudioContext on user interaction to comply with browser policies
    const initAudio = () => {
      if (!audioContext) {
        const newAudioContext = initAudioContext();
        setAudioContext(newAudioContext);
      }
    };

    // Add event listeners for user interaction
    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('touchstart', initAudio, { once: true });

    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
      audioContext?.close();
    };
  }, [audioContext]);

  // Check for due reminders
  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = new Date();
      
      reminders.forEach(reminder => {
        if (!reminder.completed && reminder.time <= now) {
          // Check if we have already shown a notification for this reminder
          // by checking if the reminder has a 'notified' property
          const hasBeenNotified = (reminder as any).notified;
          
          if (!hasBeenNotified) {
            // Play notification sound
            playNotificationSound();
            
            // Mark reminder as notified but not completed
            setReminders(prevReminders => 
              prevReminders.map(r => 
                r.id === reminder.id ? { ...r, notified: true } : r
              )
            );
            
            // Show toast notification
            showToastNotification(reminder);
            
            // Also show browser notification if supported
            if ('Notification' in window) {
              if (Notification.permission === 'granted') {
                new Notification('Reminder', { body: reminder.message });
              } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                  if (permission === 'granted') {
                    new Notification('Reminder', { body: reminder.message });
                  }
                });
              }
            }
          }
        }
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [reminders]);

  // Mark a reminder as complete
  const markReminderComplete = (id: string, toastId?: string) => {
    // Find the reminder to show its message in the completion toast
    const reminder = reminders.find(r => r.id === id);
    
    // Update the reminder's completed status
    setReminders(prevReminders => 
      prevReminders.map(r => 
        r.id === id ? { ...r, completed: true } : r
      )
    );
    
    // Play a completion sound
    playCompletionSound();
    
    // If a toast ID was provided, dismiss it
    if (toastId) {
      toast.dismiss(toastId);
    }
    
    // Show completion toast with the reminder message
    toast.success(
      <div className="flex flex-col">
        <div className="font-medium mb-1">Reminder completed</div>
        {reminder && (
          <div className="text-sm text-muted-foreground">
            <span>{reminder.message}</span>
          </div>
        )}
      </div>,
      {
        icon: <CheckCircle className="w-5 h-5" />,
        duration: 3000,
      }
    );
  };

  // Display toast notification
  const showToastNotification = (reminder: Reminder) => {
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Create a unique toast ID based on the reminder ID
    const toastId = `reminder-${reminder.id}`;

    toast(
      <div className="flex flex-col w-full">
        <div className="font-medium mb-1">{reminder.message}</div>
        <div className="text-sm text-muted-foreground mb-2">
          <span>{formatTime(reminder.time)}</span>
        </div>
        <button 
          onClick={() => {
            // Immediately dismiss this toast using its ID
            toast.dismiss(toastId);
            // Mark the reminder as complete (pass the toastId for double-safety)
            markReminderComplete(reminder.id, toastId);
          }}
          className="px-4 py-2 rounded-md bg-secondary/30 hover:bg-secondary/50 text-sm mt-1 backdrop-blur-sm self-end"
        >
          Mark as done
        </button>
      </div>,
      {
        id: toastId,
        icon: <Bell className="w-5 h-5" />,
        duration: Infinity, // Toast will remain until user action
        className: "reminder-toast",
      }
    );
  };

  // Play a more subtle and natural notification sound
  const playNotificationSound = () => {
    if (!audioContext) return;
    
    // Create audio nodes
    const masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
    masterGain.gain.value = 0.15; // Lower overall volume
    
    // Create a gentle bell-like sound using multiple oscillators with harmonic relationships
    const createTone = (freq: number, type: OscillatorType, delay: number, gainValue: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = type;
      oscillator.frequency.value = freq;
      
      // Connect the nodes
      oscillator.connect(gainNode);
      gainNode.connect(masterGain);
      
      // Create a gentle attack
      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now + delay);
      gainNode.gain.linearRampToValueAtTime(gainValue, now + delay + 0.1); // Fast but smooth attack
      
      // Gentle decay and release
      gainNode.gain.setValueAtTime(gainValue, now + delay + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + duration); // Long, gentle release
      
      // Schedule the oscillator
      oscillator.start(now + delay);
      oscillator.stop(now + delay + duration);
    };
    
    // Base frequency - D5 (587.33 Hz) - warmer than A5
    const baseFreq = 587.33;
    
    // Main tones with carefully chosen harmonics for a pleasant, natural sound
    createTone(baseFreq, 'sine', 0, 0.3, 1.8); // Fundamental
    createTone(baseFreq * 1.5, 'sine', 0.02, 0.15, 1.5); // Perfect fifth (harmonious)
    createTone(baseFreq * 2, 'sine', 0.03, 0.07, 1.3); // Octave (harmonious)
    
    // Add subtle 'shimmer' with a higher harmonics
    createTone(baseFreq * 3, 'sine', 0.1, 0.03, 1.1); // Higher harmonic for 'shimmer'
    
    // Add a very subtle 'wooden' quality with triangle wave
    createTone(baseFreq * 0.5, 'triangle', 0.01, 0.03, 1.6); // Lower octave with triangle for warmth
  };

  // Play a subtle confirmation sound when creating a reminder
  const playConfirmationSound = () => {
    if (!audioContext) return;
    
    // Create audio nodes
    const masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
    masterGain.gain.value = 0.1; // Even softer than the notification sound
    
    // Create a single gentle confirmation tone
    const createConfirmTone = (freq: number, type: OscillatorType, gainValue: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = type;
      oscillator.frequency.value = freq;
      
      // Connect the nodes
      oscillator.connect(gainNode);
      gainNode.connect(masterGain);
      
      // Gentle envelope
      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(gainValue, now + 0.05); // Quick fade in
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration); // Gentle fade out
      
      // Schedule
      oscillator.start(now);
      oscillator.stop(now + duration);
    };
    
    // Base frequency - G4 (392 Hz) - a pleasant confirmation tone
    const baseFreq = 392;
    
    // Single, simple confirmation tone
    createConfirmTone(baseFreq, 'sine', 0.2, 0.6);
    createConfirmTone(baseFreq * 1.5, 'sine', 0.1, 0.5); // Add a subtle fifth above
  };

  // Add a new reminder
  const addReminder = (message: string, time: Date) => {
    const newReminder: Reminder = {
      id: Date.now().toString(),
      message,
      time,
      completed: false
    };
    
    setReminders(prevReminders => [...prevReminders, newReminder]);
    
    // Play confirmation sound
    playConfirmationSound();
    
    // Show confirmation toast
    toast.success(
      <div className="flex flex-col">
        <div className="font-medium mb-1">Reminder set</div>
        <div className="text-sm">
          <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>,
      {
        duration: 3000,
      }
    );
    
    return newReminder;
  };

  // Remove a reminder
  const removeReminder = (id: string) => {
    setReminders(prevReminders => prevReminders.filter(reminder => reminder.id !== id));
    
    // Show removal toast
    toast.info('Reminder removed', {
      duration: 2000,
    });
  };

  // Clear all reminders
  const clearAllReminders = () => {
    // Only clear if there are active reminders
    const activeReminders = reminders.filter(r => !r.completed);
    if (activeReminders.length === 0) return;
    
    setReminders(prevReminders => prevReminders.filter(reminder => reminder.completed));
    
    // Show toast notification
    toast.info(`Cleared ${activeReminders.length} reminder${activeReminders.length !== 1 ? 's' : ''}`, {
      duration: 2000,
    });
  };

  // Check for upcoming reminders (within specified minutes)
  const hasUpcomingReminders = (minutes: number = 5) => {
    const now = new Date();
    const minutesInMs = minutes * 60 * 1000;
    
    return reminders.some(reminder => {
      if (reminder.completed) return false;
      
      const reminderTime = new Date(reminder.time);
      const timeUntilReminder = reminderTime.getTime() - now.getTime();
      
      // Return true if the reminder is within the specified time
      return timeUntilReminder > 0 && timeUntilReminder <= minutesInMs;
    });
  };

  return {
    reminders,
    addReminder,
    removeReminder,
    clearAllReminders,
    hasUpcomingReminders,
    markReminderComplete
  };
};