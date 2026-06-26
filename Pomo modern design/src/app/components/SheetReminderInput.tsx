import { useState, ChangeEvent, FormEvent } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from "./ui/sheet";

interface SheetReminderInputProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddReminder: (message: string, time: Date) => void;
}

export const SheetReminderInput = ({ 
  open, 
  onOpenChange, 
  onAddReminder 
}: SheetReminderInputProps) => {
  const [message, setMessage] = useState("");
  const [timeStr, setTimeStr] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!message || !timeStr) return;
    
    // Parse time string
    const [hours, minutes] = timeStr.split(':').map(Number);
    const reminderTime = new Date();
    
    reminderTime.setHours(hours, minutes, 0, 0);
    
    // If the time is in the past, assume it's for tomorrow
    if (reminderTime < new Date()) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }
    
    onAddReminder(message, reminderTime);
    
    // Reset form
    setMessage("");
    setTimeStr("");
    
    // Close the sheet
    onOpenChange(false);
  };

  // Generate default time (current time rounded to next 15 minutes)
  const generateDefaultTime = () => {
    if (timeStr) return;
    
    const now = new Date();
    // Round to next 15 minutes
    const minutes = Math.ceil(now.getMinutes() / 15) * 15;
    now.setMinutes(minutes);
    now.setSeconds(0);
    
    // Format as HH:MM
    const hoursStr = now.getHours().toString().padStart(2, '0');
    const minutesStr = now.getMinutes().toString().padStart(2, '0');
    setTimeStr(`${hoursStr}:${minutesStr}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="rounded-t-xl bg-background border-t border-border max-w-[550px] mx-auto"
      >
        <SheetHeader className="px-4 pt-6">
          <SheetTitle className="text-center text-[32px]">
            What do you want to be reminded today?
          </SheetTitle>
          <SheetDescription className="text-center">
            Add time for when you need to be reminded
          </SheetDescription>
        </SheetHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 px-4 py-4">
          <div className="space-y-4">
            <div>
              <Input
                type="text"
                value={message}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setMessage(e.target.value)}
                placeholder="I need to..."
                className="bg-secondary/50 border-0 h-14 transition-colors focus:bg-secondary/80 text-left"
                autoFocus
                required
              />
            </div>
            
            <div className="relative">
              <Input
                type="time"
                value={timeStr}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setTimeStr(e.target.value)}
                className="bg-secondary/50 border-0 h-14 transition-colors focus:bg-secondary/80 text-center"
                required
                onFocus={generateDefaultTime}
              />
            </div>
          </div>
          
          <SheetFooter className="pb-6 px-4">
            <Button type="submit" className="w-full" size="xl">
              Set Reminder
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};