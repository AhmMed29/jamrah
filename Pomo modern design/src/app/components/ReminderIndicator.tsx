import { motion, AnimatePresence } from "framer-motion";
import { Clock, X, Bell } from "lucide-react";
import { Reminder } from "./ReminderManager";
import { 
  HoverCard, 
  HoverCardTrigger, 
  HoverCardContent 
} from "./ui/hover-card";

interface ReminderIndicatorProps {
  reminders: Reminder[];
  onRemove: (id: string) => void;
  canvasSize: number;
}

export const ReminderIndicator = ({ 
  reminders, 
  onRemove,
  canvasSize
}: ReminderIndicatorProps) => {
  // Only show active (non-completed) reminders
  const activeReminders = reminders.filter(reminder => !reminder.completed);
  
  if (activeReminders.length === 0) {
    return null;
  }
  
  // Format time function
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Calculate position based on canvas size
  const topPosition = -Math.min(60, canvasSize * 0.1);

  return (
    <motion.div
      className="absolute left-1/2 transform -translate-x-1/2"
      style={{ top: `${topPosition}px` }}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>
          <motion.button
            className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/80 backdrop-blur-sm shadow-lg hover:bg-primary/90 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Bell className="w-5 h-5 text-primary-foreground" />
            {activeReminders.length > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs">
                {activeReminders.length}
              </span>
            )}
          </motion.button>
        </HoverCardTrigger>
        
        <HoverCardContent align="center" side="bottom" className="w-[350px] backdrop-blur-md bg-background/90 border border-border/50 rounded-lg">
          <div className="mb-2">
            <h2 className="text-center">Active Reminders</h2>
          </div>
          
          <AnimatePresence mode="popLayout">
            <ul className="space-y-2">
              {activeReminders.map((reminder, index) => (
                <motion.li 
                  key={reminder.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/40 backdrop-blur-sm"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ 
                    duration: 0.2, 
                    delay: index * 0.03,
                    ease: [0.4, 0.0, 0.2, 1]
                  }}
                >
                  <div className="flex-1 overflow-hidden">
                    <p>{reminder.message}</p>
                    <div className="flex items-center text-muted-foreground mt-1">
                      <Clock className="w-3 h-3 mr-2" />
                      <p className="text-sm">{formatTime(reminder.time)}</p>
                    </div>
                  </div>
                  <motion.button 
                    onClick={() => onRemove(reminder.id)}
                    className="ml-3 text-destructive hover:text-destructive-foreground p-1 rounded-full hover:bg-destructive/10 transition-colors"
                    aria-label="Remove reminder"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </motion.li>
              ))}
            </ul>
          </AnimatePresence>
        </HoverCardContent>
      </HoverCard>
    </motion.div>
  );
};