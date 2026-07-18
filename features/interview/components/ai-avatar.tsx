"use client";

import { useInterviewStore } from "@/features/interview/store/interview-store";

const STATE_LABELS: Record<string, string> = {
  idle: "",
  listening: "Listening...",
  thinking: "Thinking...",
  speaking: "Speaking...",
};

const STATE_COLORS: Record<string, string> = {
  idle: "bg-muted",
  listening: "bg-emerald-500/20 ring-emerald-500/40",
  thinking: "bg-amber-500/20 ring-amber-500/40",
  speaking: "bg-blue-500/20 ring-blue-500/40",
};

/**
 * AI avatar with visual state indicator.
 * Shows a subtle pulsing ring when speaking, a colored indicator for listening/thinking.
 * Per UI/UX spec: "AI avatar, Speaking indicator, Listening indicator, Live transcript"
 */
export function AIAvatar() {
  const aiState = useInterviewStore((s) => s.aiState);
  const isSpeaking = aiState === "speaking";

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar circle */}
      <div
        className={`relative flex h-16 w-16 items-center justify-center rounded-full ${
          STATE_COLORS[aiState] ?? STATE_COLORS.idle
        } ${isSpeaking ? "avatar-speaking ring-2" : ""} transition-all duration-300`}
      >
        {/* Bot icon */}
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-foreground"
        >
          <path d="M12 8V4H8" />
          <rect width="16" height="12" x="4" y="8" rx="2" />
          <path d="m9 15 1.5-1.5L12 15l1.5-1.5L15 15" />
        </svg>
      </div>

      {/* State label */}
      {aiState !== "idle" && (
        <span className="text-xs text-muted-foreground animate-pulse">
          {STATE_LABELS[aiState]}
        </span>
      )}
    </div>
  );
}
