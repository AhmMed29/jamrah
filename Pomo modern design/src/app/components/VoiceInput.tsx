import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";

interface VoiceInputProps {
  onResult: (text: string) => void;
  placeholder?: string;
}

export const VoiceInput = ({ onResult, placeholder = "Speak to add a reminder..." }: VoiceInputProps) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if browser supports SpeechRecognition
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setSupported(false);
      return;
    }

    // Initialize SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    // Set up event handlers
    recognitionRef.current.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      if (isListening) {
        // Restart recognition if it stopped but we're still supposed to be listening
        recognitionRef.current.start();
      }
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isListening]);

  const toggleListening = () => {
    if (!supported) return;

    if (isListening) {
      recognitionRef.current?.stop();
      if (transcript) {
        onResult(transcript);
        setTranscript("");
      }
    } else {
      try {
        recognitionRef.current?.start();
      } catch (error) {
        console.error('Speech recognition error on start:', error);
      }
    }
    
    setIsListening(!isListening);
  };

  if (!supported) {
    return (
      <div className="text-center p-4">
        <p>Voice input is not supported in your browser.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center gap-2">
        <Button 
          onClick={toggleListening}
          variant={isListening ? "destructive" : "default"}
          className="rounded-full aspect-square p-0 w-12 h-12 flex items-center justify-center"
        >
          {isListening ? (
            <span className="h-4 w-4 rounded-sm bg-white" />
          ) : (
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          )}
        </Button>
        <div className="flex-1">
          <p className={`${isListening ? "text-primary" : "text-muted-foreground"}`}>
            {transcript || (isListening ? "Listening..." : placeholder)}
          </p>
        </div>
      </div>
    </div>
  );
};