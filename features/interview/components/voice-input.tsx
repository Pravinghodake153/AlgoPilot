"use client";

import { useEffect, useRef, useCallback } from "react";
import { useInterviewStore } from "@/features/interview/store/interview-store";
import { useWebSpeech, stopSpeaking } from "@/hooks/use-web-speech";


/**
 * Voice input — shows when interview is in voice mode.
 * Only handles Speech Recognition (STT) lifecycle.
 * All streaming/fetch/TTS logic is centralized in the parent.
 */
interface VoiceInputProps {
  sendMessage: (text: string) => void;
}

export function VoiceInput({ sendMessage }: VoiceInputProps) {
  const isMicMuted = useInterviewStore((s) => s.isMicMuted);
  const aiState = useInterviewStore((s) => s.aiState);
  const isStreaming = useInterviewStore((s) => s.isStreaming);
  const sttLanguage = useInterviewStore((s) => s.sttLanguage);
  const setAIState = useInterviewStore((s) => s.setAIState);

  const isMountedRef = useRef(true);

  const handleSpeechResult = useCallback(
    (transcript: string) => {
      if (!transcript.trim()) return;
      sendMessage(transcript);
    },
    [sendMessage]
  );

  const {
    isListening,
    isSupported,
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
  } = useWebSpeech({
    onResult: handleSpeechResult,
    onError: (error) => console.error("Speech error:", error),
    continuous: true,
    language: sttLanguage,
  });

  // Auto-start listening on mount if not muted
  useEffect(() => {
    isMountedRef.current = true;
    if (!isMicMuted && !isStreaming) {
      startListening();
      if (aiState === "idle") {
        setAIState("listening");
      }
    }
    return () => {
      isMountedRef.current = false;
      stopListening();
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync mic mute and AI state with speech recognition
  useEffect(() => {
    if (isMicMuted || aiState === "thinking" || aiState === "speaking" || isStreaming) {
      pauseListening();
    } else {
      resumeListening();
    }
  }, [isMicMuted, aiState, isStreaming, pauseListening, resumeListening]);

  const isActive = isListening && !isMicMuted;

  function handleToggleListening() {
    if (isListening) {
      stopSpeaking();
      stopListening();
      setAIState("idle");
    } else {
      // Unlock the speech synthesis engine with a user gesture
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const unlockUtterance = new SpeechSynthesisUtterance(".");
        unlockUtterance.volume = 0.01;
        window.speechSynthesis.speak(unlockUtterance);
      }

      startListening();
      setAIState("listening");
    }
  }

  if (!isSupported) {
    return (
      <div className="flex items-center justify-center border-t border-border px-4 py-4">
        <p className="text-xs text-muted-foreground">
          Voice input is not supported in this browser. Use Chrome for best
          results.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 border-t border-border px-4 py-4">
      {/* Listening indicator */}
      <button
        onClick={handleToggleListening}
        disabled={aiState === "thinking" || isStreaming}
        className="group relative flex h-14 w-14 items-center justify-center rounded-full transition-all cursor-pointer disabled:opacity-40"
        aria-label={isActive ? "Stop listening" : "Start listening"}
      >
        {/* Pulse ring when active */}
        {isActive && (
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" />
        )}

        <span
          className={`relative flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
            isActive
              ? "bg-emerald-500/20 text-emerald-400"
              : aiState === "speaking"
                ? "bg-blue-500/20 text-blue-400"
                : "bg-secondary text-muted-foreground group-hover:text-foreground"
          }`}
        >
          {aiState === "speaking" ? (
            /* Speaker icon when AI is speaking */
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          ) : (
            /* Microphone icon */
            <svg
              width="20"
              height="20"
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
        </span>
      </button>

      <span className="text-xs text-muted-foreground">
        {isActive
          ? "Listening..."
          : aiState === "thinking"
            ? "AI is thinking..."
            : aiState === "speaking"
              ? "AI is speaking..."
              : "Tap to speak"}
      </span>
    </div>
  );
}
