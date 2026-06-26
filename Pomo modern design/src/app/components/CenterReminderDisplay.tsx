import { useState, useEffect, useRef } from "react";
import { Reminder } from "./ReminderManager";
import { motion, AnimatePresence } from "framer-motion";

interface CenterReminderDisplayProps {
  reminders: Reminder[];
  onRemove: (id: string) => void;
  size: number;
  onComplete?: (id: string) => void;
}

// Format time function
const formatTime = (date: Date) => {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
};

// Truncate text with ellipsis if it's too long
const truncateText = (text: string, maxLength: number = 60) => {
  if (!text) return '';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

export const CenterReminderDisplay = ({
  reminders,
  onRemove,
  size,
  onComplete
}: CenterReminderDisplayProps) => {
  const activeReminders = reminders.filter(r => !r.completed);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displaySize, setDisplaySize] = useState(size * 0.7);
  const [isHovering, setIsHovering] = useState(false);
  const [isNearCenter, setIsNearCenter] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Get current reminder or return placeholder
  const currentReminder = activeReminders[currentIndex] || { 
    id: 'placeholder', 
    message: '', 
    time: new Date(), 
    completed: false 
  };
  
  // Resize display for responsive design
  useEffect(() => {
    setDisplaySize(size * 0.7);
  }, [size]);
  
  // Auto rotate reminders every 5 seconds
  useEffect(() => {
    if (activeReminders.length <= 1) return;
    
    const intervalId = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % activeReminders.length);
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, [activeReminders.length]);
  
  // Reset index if we're beyond array bounds
  useEffect(() => {
    if (currentIndex >= activeReminders.length && activeReminders.length > 0) {
      setCurrentIndex(0);
    }
  }, [activeReminders.length, currentIndex]);

  // Track mouse position relative to center
  const handleMouseMove = (event: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Calculate distance from center
      const deltaX = event.clientX - centerX;
      const deltaY = event.clientY - centerY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // Consider "near center" if within 30% of radius from center
      const radius = rect.width / 2;
      const isNear = distance < (radius * 0.3);
      
      setIsNearCenter(isNear);
    }
  };
  
  // Reset when mouse leaves
  const handleMouseLeave = () => {
    setIsNearCenter(false);
  };
  
  // If no active reminders, return null
  if (activeReminders.length === 0) return null;
  
  // Determine if we should show the mark as done button
  const showMarkAsDone = isHovering && isNearCenter;
  
  return (
    <div 
      className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-10"
      style={{ 
        width: displaySize,
        height: displaySize
      }}
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentReminder.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          className="w-full h-full flex flex-col items-center justify-center rounded-full bg-black/30 backdrop-blur-lg p-6 border border-white/10"
          onHoverStart={() => setIsHovering(true)}
          onHoverEnd={() => setIsHovering(false)}
        >
          
          {/* Main Content - Centered */}
          <div className="flex flex-col items-center justify-center h-full w-full relative">
            {/* Time - Above Message */}
            <div className="text-center max-w-full break-words text-[12px] font-[Inter] mb-4 text-primary/80">
              {formatTime(currentReminder.time)}
            </div>
            
            {/* Reminder Message - Always Centered */}
            <div className="flex-1 flex items-center justify-center w-full mt-[0px] mr-[0px] mb-[12px] ml-[0px]">
              <h2 className={`text-center max-w-full break-words ${
                currentReminder.message && currentReminder.message.length > 42 ? 'text-[20px]' : 'text-[24px]'
              }`}>
                {truncateText(currentReminder.message)}
              </h2>
            </div>
            
            {/* Mark as Done Button - Centered and only visible on hover near center */}
            {onComplete && (
              <AnimatePresence>
                {showMarkAsDone && (
                  <motion.div
                    className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-full overflow-hidden"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 400,
                      damping: 30
                    }}
                  >
                    {/* Full-size black backdrop that matches the reminder circle */}
                    <div className="absolute inset-0 w-full h-full bg-black rounded-full -z-10"></div>
                    
                    <motion.button
                      className="flex items-center justify-center px-8 py-2.5 rounded-full bg-black/80 hover:bg-black transition-all duration-300 border border-white/10 h-auto backdrop-blur-sm"
                      onClick={() => onComplete(currentReminder.id)}
                      initial={{ opacity: 0, y: 5, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 0.1, duration: 0.2 }}
                      whileHover={{ scale: 1.05, borderColor: "rgba(255, 255, 255, 0.2)" }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span className="text-sm tracking-wide text-white">Mark as done</span>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
          
          {/* Reminder Carousel Indicators - Bottom */}
          {activeReminders.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center justify-center space-x-1">
              {activeReminders.map((_, idx) => (
                <motion.button
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === currentIndex ? 'bg-primary' : 'bg-primary/30'
                  }`}
                  onClick={() => setCurrentIndex(idx)}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label={`View reminder ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}