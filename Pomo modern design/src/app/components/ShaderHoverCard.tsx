import { motion, AnimatePresence } from "framer-motion";
import { Clock, X } from "lucide-react";
import { Reminder } from "./ReminderManager";
import { 
  HoverCard, 
  HoverCardTrigger, 
  HoverCardContent 
} from "./ui/hover-card";

interface ShaderHoverCardProps {
  reminders: Reminder[];
  onRemove: (id: string) => void;
  children: React.ReactNode;
}

export const ShaderHoverCard = ({ 
  reminders, 
  onRemove,
  children
}: ShaderHoverCardProps) => {
  // Only show active (non-completed) reminders
  const activeReminders = reminders.filter(reminder => !reminder.completed);
  
  if (activeReminders.length === 0) {
    return <>{children}</>;
  }
  
  // Format time function
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <HoverCard openDelay={100} closeDelay={100}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      
      <HoverCardContent align="center" side="top" className="w-[350px] backdrop-blur-md bg-background/90 border border-border/50 rounded-lg z-50">
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
  );
};