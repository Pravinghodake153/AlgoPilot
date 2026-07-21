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
 * Supports multiple languages including Hindi ("hi-IN").
 */
export function useWebSpeech({
  onResult,
  onError,
  continuous = true,
  language = "en-US",
}: UseWebSpeechOptions) {
  const [isListening, setIsListening] = useState(false);
  const isSupported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldBeListeningRef = useRef(false);
  const isPausedRef = useRef(false);

  // Store callbacks in refs to avoid stale closures without causing re-renders/re-inits
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  }, [onResult, onError]);

  // Initialize recognition
  const initRecognition = useCallback(() => {
    if (typeof window === "undefined") return null;

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) return null;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = continuous;
    recognition.interimResults = false;
    // Support Hindi by accepting multiple languages
    // For Hindi: "hi-IN", for English: "en-US"
    recognition.lang = language;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // If manually muted/paused, ignore result
      if (isPausedRef.current) return;

      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        const transcript = last[0].transcript.trim();
        if (transcript) {
          onResultRef.current(transcript);
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== "aborted" && event.error !== "no-speech") {
        onErrorRef.current?.(event.error);
      }
      // Only mark as not listening if we shouldn't be
      if (!shouldBeListeningRef.current) {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Auto-restart if we should still be listening AND we are not paused
      if (shouldBeListeningRef.current && !isPausedRef.current) {
        try {
          recognition.start();
        } catch {
          setIsListening(false);
          shouldBeListeningRef.current = false;
        }
      } else {
        setIsListening(false);
      }
    };

    return recognition;
  }, [continuous, language]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      onError?.("Speech recognition not supported in this browser");
      return;
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch { /* ignore */ }
    }

    const recognition = initRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    shouldBeListeningRef.current = true;
    isPausedRef.current = false;

    try {
      recognition.start();
      setIsListening(true);
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      setIsListening(false);
      shouldBeListeningRef.current = false;
    }
  }, [isSupported, initRecognition, onError]);

  const stopListening = useCallback(() => {
    shouldBeListeningRef.current = false;
    isPausedRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  /**
   * Temporarily pause recognition (e.g. while AI speaks to avoid feedback).
   * Call resumeListening() to restart it.
   */
  const pauseListening = useCallback(() => {
    isPausedRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch { /* ignore */ }
    }
    setIsListening(false);
  }, []);

  /**
   * Resume recognition after a pause.
   */
  const resumeListening = useCallback(() => {
    if (!shouldBeListeningRef.current || !isSupported) return;

    isPausedRef.current = false;

    // Stop existing first
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch { /* ignore */ }
    }

    const recognition = initRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
    } catch {
      // Will auto-retry via onend
    }
  }, [isSupported, initRecognition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldBeListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch { /* ignore */ }
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
  };
}

// Prime the voices loading asynchronously at import time
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.getVoices();
}

/**
 * Speak text aloud using Web Speech Synthesis API ($0 cost).
 * Includes workaround for Chrome's cancel-before-speak bug.
 *
 * @param text The text to speak
 * @param options Configuration options
 * @param options.lang Language/voice (defaults to "en-US")
 */
export function speak(
  text: string,
  options?: {
    rate?: number;
    pitch?: number;
    lang?: string;
    onEnd?: () => void;
    onError?: () => void;
  }
): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    options?.onError?.();
    return;
  }

  // Cancel only if currently speaking or pending to avoid locked states
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    window.speechSynthesis.cancel();
  }

  // If paused, resume
  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }

  // Chrome bug workaround: after cancel(), there's a brief window where
  // speak() is silently ignored. Use a slightly longer delay to let it settle.
  setTimeout(() => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate ?? 1.0;
    utterance.pitch = options?.pitch ?? 1.0;
    utterance.lang = options?.lang ?? "en-US";

    const voices = window.speechSynthesis.getVoices();
    const targetLang = options?.lang ?? "en-US";
    
    // Only search/override voice if it's not standard en-US (to let browser choose default premium voice)
    if (targetLang !== "en-US") {
      const matchedVoice = voices.find((v) => v.lang === targetLang) || 
                           voices.find((v) => v.lang.startsWith(targetLang.split("-")[0]));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
    }

    let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

    const cleanup = () => {
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }
      (window as any)._currentUtterance = null;
    };

    utterance.onend = () => {
      cleanup();
      options?.onEnd?.();
    };

    utterance.onerror = (event) => {
      cleanup();
      console.error("SpeechSynthesis error:", event);
      options?.onError?.();
    };

    // Prevent garbage collection bug in Chrome by storing globally
    (window as any)._currentUtterance = utterance;

    window.speechSynthesis.speak(utterance);

    // Chrome pause/resume workaround for long texts (> ~15 seconds)
    // Chrome silently stops speaking after ~15s. This keeps it alive.
    keepAliveInterval = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        cleanup();
        return;
      }
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }, 10000);
  }, 150);
}

/**
 * Stop any current speech synthesis.
 */
export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    (window as any)._currentUtterance = null;
  }
}
