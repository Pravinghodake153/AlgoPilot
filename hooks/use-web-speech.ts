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
 *
 * IMPORTANT: This hook uses a session-based architecture to prevent
 * race conditions between start/stop/restart cycles. Each call to
 * startListening() creates a new session ID, and onend only restarts
 * if the session is still active.
 */
export function useWebSpeech({
  onResult,
  onError,
  continuous = true,
  language = "en-US",
}: UseWebSpeechOptions) {
  const [isListening, setIsListening] = useState(false);
  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // Session counter: incremented on every start, checked in onend to prevent stale restarts
  const sessionIdRef = useRef(0);
  // Set to true when we explicitly want to stop — checked synchronously in onend
  const stoppedRef = useRef(true);

  // Store callbacks in refs to avoid stale closures
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  }, [onResult, onError]);

  /**
   * Safely abort and discard the current recognition instance.
   * Sets recognitionRef to null so no stale reference can restart.
   */
  const destroyRecognition = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      // Remove event handlers to prevent any further callbacks
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.abort();
      } catch {
        /* already stopped */
      }
      recognitionRef.current = null;
    }
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      onErrorRef.current?.("Speech recognition not supported in this browser");
      return;
    }

    // Destroy any existing instance first
    destroyRecognition();

    // Create fresh recognition instance
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = continuous;
    recognition.interimResults = false;
    recognition.lang = language;

    // Capture session ID for this start cycle
    const mySession = ++sessionIdRef.current;
    stoppedRef.current = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // If stopped since we started, ignore
      if (stoppedRef.current) return;

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
      // Don't report aborted (we cause this) or no-speech (normal silence)
      if (event.error !== "aborted" && event.error !== "no-speech") {
        onErrorRef.current?.(event.error);
      }
    };

    recognition.onend = () => {
      // CRITICAL: Check both the stopped flag AND session ID.
      // If either doesn't match, do NOT restart — it means stopListening
      // was called or a newer session superseded this one.
      if (stoppedRef.current || sessionIdRef.current !== mySession) {
        setIsListening(false);
        return;
      }

      // Auto-restart for continuous listening
      try {
        recognition.start();
      } catch {
        // start() can throw if the recognition is in a bad state
        setIsListening(false);
        stoppedRef.current = true;
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      setIsListening(false);
      stoppedRef.current = true;
    }
  }, [isSupported, continuous, language, destroyRecognition]);

  const stopListening = useCallback(() => {
    // Set stopped flag FIRST — this prevents onend from restarting
    stoppedRef.current = true;
    // Increment session to invalidate any pending onend callbacks
    sessionIdRef.current++;
    destroyRecognition();
    setIsListening(false);
  }, [destroyRecognition]);

  // Cleanup on unmount — always release the microphone
  useEffect(() => {
    return () => {
      stoppedRef.current = true;
      sessionIdRef.current++;
      const rec = recognitionRef.current;
      if (rec) {
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        try {
          rec.abort();
        } catch {
          /* ignore */
        }
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

// ─── Voice Catalog ───────────────────────────

export interface VoiceOption {
  id: string;
  name: string;
  label: string;
  gender: "male" | "female";
}

/**
 * Returns the 10 supported Kokoro-82m voices.
 */
export function getAvailableVoices(): VoiceOption[] {
  return [
    {
      id: "am_adam",
      name: "am_adam",
      label: "Adam (US Male)",
      gender: "male",
    },
    {
      id: "am_michael",
      name: "am_michael",
      label: "Michael (US Male)",
      gender: "male",
    },
    {
      id: "am_fenrir",
      name: "am_fenrir",
      label: "Fenrir (US Male)",
      gender: "male",
    },
    {
      id: "am_puck",
      name: "am_puck",
      label: "Puck (US Male)",
      gender: "male",
    },
    {
      id: "am_echo",
      name: "am_echo",
      label: "Echo (US Male)",
      gender: "male",
    },
    {
      id: "af_heart",
      name: "af_heart",
      label: "Nova (US Female)",
      gender: "female",
    },
    {
      id: "af_bella",
      name: "af_bella",
      label: "Bella (US Female)",
      gender: "female",
    },
    {
      id: "af_sarah",
      name: "af_sarah",
      label: "Sarah (US Female)",
      gender: "female",
    },
    {
      id: "af_nicole",
      name: "af_nicole",
      label: "Nicole (US Female)",
      gender: "female",
    },
    {
      id: "af_sky",
      name: "af_sky",
      label: "Sky (US Female)",
      gender: "female",
    },
    {
      id: "if_sara",
      name: "if_sara",
      label: "Sara (India Female)",
      gender: "female",
    },
  ];
}

function getDefaultVoiceList(): VoiceOption[] {
  return getAvailableVoices();
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
 */
export function speak(
  text: string,
  options?: {
    rate?: number;
    pitch?: number;
    lang?: string;
    voiceName?: string | null;
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

    // Use specific voice if voiceName is provided
    if (options?.voiceName) {
      const selectedVoice = voices.find((v) => v.name === options.voiceName);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
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

/**
 * Available STT languages for the speech recognition dropdown.
 */
export const STT_LANGUAGES = [
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "en-IN", label: "English (India)" },
  { code: "hi-IN", label: "Hindi" },
] as const;
