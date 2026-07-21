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

// ─── Voice Catalog ───────────────────────────

export interface VoiceOption {
  id: string;
  name: string;
  label: string;
  gender: "male" | "female";
}

/**
 * Get available English voices from the browser, categorized as male/female.
 * Returns a curated list of 5 voices (3 male, 2 female) when available,
 * falling back to whatever the browser offers.
 */
export function getAvailableVoices(): VoiceOption[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return getDefaultVoiceList();
  }

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return getDefaultVoiceList();

  const englishVoices = voices.filter(
    (v) => v.lang.startsWith("en")
  );

  if (englishVoices.length === 0) return getDefaultVoiceList();

  // Heuristic to guess gender from voice name
  const femaleKeywords = ["female", "woman", "samantha", "karen", "moira", "tessa", "fiona", "victoria", "zira", "hazel", "susan", "linda", "jenny", "aria", "sara", "emma"];
  const maleKeywords = ["male", "man", "daniel", "alex", "fred", "tom", "james", "david", "mark", "guy", "thomas", "oliver", "george", "ryan"];

  const categorized: VoiceOption[] = englishVoices.map((v) => {
    const nameLower = v.name.toLowerCase();
    let gender: "male" | "female" = "male"; // default

    if (femaleKeywords.some((kw) => nameLower.includes(kw))) {
      gender = "female";
    } else if (maleKeywords.some((kw) => nameLower.includes(kw))) {
      gender = "male";
    }

    return {
      id: v.name,
      name: v.name,
      label: `${v.name.split(" ").slice(0, 2).join(" ")}`,
      gender,
    };
  });

  // Pick up to 3 male and 2 female
  const males = categorized.filter((v) => v.gender === "male").slice(0, 3);
  const females = categorized.filter((v) => v.gender === "female").slice(0, 2);

  const result = [...males, ...females];

  // If we don't have enough, fill from the full list
  if (result.length < 3) {
    for (const v of categorized) {
      if (!result.find((r) => r.id === v.id)) {
        result.push(v);
        if (result.length >= 5) break;
      }
    }
  }

  return result.length > 0 ? result : getDefaultVoiceList();
}

function getDefaultVoiceList(): VoiceOption[] {
  return [
    { id: "default-male-1", name: "Default Male", label: "Alex (Default)", gender: "male" },
    { id: "default-male-2", name: "Default Male 2", label: "Daniel", gender: "male" },
    { id: "default-male-3", name: "Default Male 3", label: "Thomas", gender: "male" },
    { id: "default-female-1", name: "Default Female", label: "Samantha", gender: "female" },
    { id: "default-female-2", name: "Default Female 2", label: "Karen", gender: "female" },
  ];
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
