"use client";

import { useCallback } from "react";
import { useInterviewStore } from "@/features/interview/store/interview-store";
import { useWebSpeech, speak, stopSpeaking } from "@/hooks/use-web-speech";

/**
 * Voice input — shows when interview is in voice mode.
 * Listens for speech, sends transcript to AI, speaks response.
 */
export function VoiceInput() {
  const addMessage = useInterviewStore((s) => s.addMessage);
  const setAIState = useInterviewStore((s) => s.setAIState);
  const interviewId = useInterviewStore((s) => s.interviewId);
  const isMicMuted = useInterviewStore((s) => s.isMicMuted);
  const isSpeakerMuted = useInterviewStore((s) => s.isSpeakerMuted);
  const aiState = useInterviewStore((s) => s.aiState);

  const handleSpeechResult = useCallback(
    async (transcript: string) => {
      if (!interviewId) return;

      // Add user message
      addMessage("user", transcript);
      setAIState("thinking");

      try {
        const response = await fetch(`/api/interviews/${interviewId}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: transcript }),
        });

        if (!response.ok) throw new Error("Chat failed");

        const data = await response.json();
        addMessage("assistant", data.response);

        // Speak the response
        if (!isSpeakerMuted) {
          setAIState("speaking");
          speak(data.response, {
            rate: 1.0,
            onEnd: () => setAIState("listening"),
            onError: () => setAIState("listening"),
          });
        } else {
          setAIState("listening");
        }
      } catch {
        addMessage(
          "assistant",
          "Sorry, I had a connection issue. Could you repeat that?"
        );
        setAIState("listening");
      }
    },
    [interviewId, addMessage, setAIState, isSpeakerMuted]
  );

  const { isListening, isSupported, startListening, stopListening } =
    useWebSpeech({
      onResult: handleSpeechResult,
      onError: (error) => console.error("Speech error:", error),
      continuous: true,
    });

  // Auto-start/stop based on mic mute
  const isActive = isListening && !isMicMuted;

  function handleToggleListening() {
    if (isListening) {
      stopListening();
      setAIState("idle");
    } else {
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
        disabled={aiState === "thinking"}
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
              : "bg-secondary text-muted-foreground group-hover:text-foreground"
          }`}
        >
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
