import { useState, ChangeEvent, FormEvent } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface ReminderInputProps {
  onAddReminder: (message: string, time: Date) => void;
}

export const ReminderInput = ({ onAddReminder }: ReminderInputProps) => {
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
  };

  return (
    <div className="w-full max-w-md backdrop-blur-md bg-background/30 p-6 rounded-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="text"
          value={message}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setMessage(e.target.value)}
          placeholder="Enter your reminder"
          className="bg-background/50"
          autoFocus
          required
        />
        <Input
          type="time"
          value={timeStr}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setTimeStr(e.target.value)}
          className="bg-background/50"
          required
        />
        <Button type="submit" className="w-full">
          Set Reminder
        </Button>
      </form>
    </div>
  );
};