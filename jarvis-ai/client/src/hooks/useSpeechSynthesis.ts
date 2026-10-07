import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSpeechSynthesisOptions {
  rate?: number;
  pitch?: number;
  enabled?: boolean;
}

export function useSpeechSynthesis({ rate = 1.0, pitch = 0.95, enabled = true }: UseSpeechSynthesisOptions = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      setIsSupported(true);

      const updateVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        // Look for British English or natural voice suitable for Jarvis
        const jarvisVoice = voices.find(
          (v) =>
            v.lang.includes('en-GB') ||
            v.name.includes('Daniel') ||
            v.name.includes('George') ||
            v.name.includes('Google UK English Male')
        ) || voices.find((v) => v.lang.startsWith('en')) || voices[0];

        selectedVoiceRef.current = jarvisVoice || null;
      };

      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported || !enabled || !text) return;

      window.speechSynthesis.cancel(); // stop existing speech

      // Clean markdown code blocks and formatting before speaking
      const cleanText = text
        .replace(/```[\s\S]*?```/g, 'Code block omitted.')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        .replace(/[*_#]/g, '')
        .trim();

      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      if (selectedVoiceRef.current) {
        utterance.voice = selectedVoiceRef.current;
      }
      utterance.rate = rate;
      utterance.pitch = pitch;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [isSupported, enabled, rate, pitch]
  );

  const cancel = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  return {
    isSpeaking,
    isSupported,
    speak,
    cancel,
  };
}
