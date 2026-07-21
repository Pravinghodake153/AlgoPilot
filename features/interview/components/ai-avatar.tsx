"use client";

import { useInterviewStore } from "@/features/interview/store/interview-store";

/**
 * AI Interviewer avatar — shows name, avatar, and current state.
 * State indicator differs based on mode ("voice" vs "text"):
 * Voice mode: Listening (green pulse), Thinking (amber dots), Speaking (blue wave), Idle
 * Text mode: Thinking (amber dots), Responding (blue typing dots), Idle
 */
export function AIAvatar() {
  const aiState = useInterviewStore((s) => s.aiState);
  const mode = useInterviewStore((s) => s.mode);

  const isVoice = mode === "voice";

  // Label configuration based on state and mode
  const getLabel = () => {
    if (aiState === "thinking") return "Thinking";
    if (aiState === "listening") return isVoice ? "Listening" : "Idle";
    if (aiState === "speaking") return isVoice ? "Speaking" : "Responding";
    return "Idle";
  };

  const getDotClass = () => {
    if (aiState === "thinking") return "bg-amber-400";
    if (aiState === "listening") return isVoice ? "bg-emerald-400" : "bg-muted-foreground/40";
    if (aiState === "speaking") return "bg-blue-400";
    return "bg-muted-foreground/40";
  };

  const shouldAnimateDot = () => {
    if (aiState === "idle") return false;
    if (aiState === "listening") return isVoice;
    return true;
  };

  const selectedVoiceId = useInterviewStore((s) => s.selectedVoiceId);
  const isFemale = selectedVoiceId && (selectedVoiceId.startsWith("af_") || selectedVoiceId.startsWith("if_") || selectedVoiceId.startsWith("bf_"));
  const interviewerName = isFemale ? "Nova" : "Alex";

  const label = getLabel();

  return (
    <div className="flex items-center gap-3">
      {/* Avatar circle */}
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-foreground/70"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>

        {/* State dot */}
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${getDotClass()} ${
            shouldAnimateDot() ? "animate-pulse" : ""
          }`}
        />
      </div>

      {/* Name + State */}
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground leading-tight">
          {interviewerName}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground leading-tight">
          {aiState === "thinking" ? (
            <span className="flex items-center gap-0.5">
              <span className="inline-block h-1 w-1 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="inline-block h-1 w-1 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="inline-block h-1 w-1 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              <span className="ml-1">{label}</span>
            </span>
          ) : aiState === "speaking" ? (
            isVoice ? (
              <span className="flex items-center gap-0.5">
                {/* Sound wave bars for Voice mode */}
                <span className="inline-block h-2 w-0.5 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: "0ms" }} />
                <span className="inline-block h-3 w-0.5 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: "100ms" }} />
                <span className="inline-block h-1.5 w-0.5 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: "200ms" }} />
                <span className="inline-block h-2.5 w-0.5 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: "300ms" }} />
                <span className="ml-1">{label}</span>
              </span>
            ) : (
              <span className="flex items-center gap-0.5 text-blue-400">
                {/* Typing indicator dots for Text mode */}
                <span className="inline-block h-1 w-1 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: "0ms" }} />
                <span className="inline-block h-1 w-1 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: "200ms" }} />
                <span className="inline-block h-1 w-1 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: "400ms" }} />
                <span className="ml-1">{label}</span>
              </span>
            )
          ) : (
            label
          )}
        </span>
      </div>
    </div>
  );
}
