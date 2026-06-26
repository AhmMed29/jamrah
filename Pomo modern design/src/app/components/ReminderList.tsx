import { Reminder } from "./ReminderManager";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, X } from "lucide-react";

interface ReminderListProps {
  reminders: Reminder[];
  onRemove: (id: string) => void;
}

export const ReminderList = ({ reminders, onRemove }: ReminderListProps) => {
  // Only show active (non-completed) reminders
  const activeReminders = reminders.filter(reminder => !reminder.completed);
  
  if (activeReminders.length === 0) {
    return null;
  }
  
  // Format time function
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div 
      className="w-full max-w-[550px] backdrop-blur-md bg-background/30 p-4 rounded-xl border border-border/50"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-2 px-1">
        <h2 className="text-center">Active Reminders</h2>
      </div>
      <AnimatePresence mode="popLayout">
        <ul className="space-y-3">
          {activeReminders.map((reminder, index) => (
            <motion.li 
              key={reminder.id} 
              className="flex items-center justify-between p-4 rounded-lg bg-secondary/40 backdrop-blur-sm shadow-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ 
                duration: 0.3, 
                delay: index * 0.05,
                ease: [0.4, 0.0, 0.2, 1]
              }}
            >
              <div className="flex-1 overflow-hidden">
                <p>{reminder.message}</p>
                <div className="flex items-center text-muted-foreground mt-1">
                  <Clock className="w-4 h-4 mr-2" />
                  <p className="text-sm">{formatTime(reminder.time)}</p>
                </div>
              </div>
              <motion.button 
                onClick={() => onRemove(reminder.id)}
                className="ml-3 text-destructive hover:text-destructive-foreground p-2 rounded-full hover:bg-destructive/10 transition-colors"
                aria-label="Remove reminder"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-5 h-5" />
              </motion.button>
            </motion.li>
          ))}
        </ul>
      </AnimatePresence>
    </motion.div>
  );
};