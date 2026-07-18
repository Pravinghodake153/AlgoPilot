"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface UseWebSpeechOptions {
  onResult: (transcript: string) => void;
  onError?: (error: string) => void;
  continuous?: boolean;
  language?: string;
}

/**
 * Web Speech API hook for speech-to-text recognition.
 * Uses browser-native SpeechRecognition API ($0 cost).
 */
export function useWebSpeech({
  onResult,
  onError,
  continuous = true,
  language = "en-US",
}: UseWebSpeechOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Check support on mount
  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
    setIsSupported(supported);
  }, []);

  // Initialize recognition
  const initRecognition = useCallback(() => {
    if (typeof window === "undefined") return null;

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) return null;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = continuous;
    recognition.interimResults = false;
    recognition.lang = language;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        const transcript = last[0].transcript.trim();
        if (transcript) {
          onResult(transcript);
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== "aborted") {
        onError?.(event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      // Auto-restart if continuous mode and still supposed to be listening
      if (continuous && isListening) {
        try {
          recognition.start();
        } catch {
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    return recognition;
  }, [continuous, language, onResult, onError, isListening]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      onError?.("Speech recognition not supported in this browser");
      return;
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const recognition = initRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      setIsListening(false);
    }
  }, [isSupported, initRecognition, onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
  };
}

/**
 * Speak text aloud using Web Speech Synthesis API ($0 cost).
 */
export function speak(
  text: string,
  options?: {
    rate?: number;
    pitch?: number;
    onEnd?: () => void;
    onError?: () => void;
  }
): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    options?.onError?.();
    return;
  }

  // Cancel any current speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options?.rate ?? 1.0;
  utterance.pitch = options?.pitch ?? 1.0;

  if (options?.onEnd) utterance.onend = options.onEnd;
  if (options?.onError) utterance.onerror = options.onError;

  window.speechSynthesis.speak(utterance);
}

/**
 * Stop any current speech synthesis.
 */
export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
