"use client";

import { useInterviewStore } from "@/features/interview/store/interview-store";

/**
 * Voice control bar — Mic toggle, Speaker toggle, Mode switch, End Interview.
 * Minimal controls per UI/UX spec.
 */
export function VoiceControls() {
  const isMicMuted = useInterviewStore((s) => s.isMicMuted);
  const isSpeakerMuted = useInterviewStore((s) => s.isSpeakerMuted);
  const mode = useInterviewStore((s) => s.mode);
  const toggleMic = useInterviewStore((s) => s.toggleMic);
  const toggleSpeaker = useInterviewStore((s) => s.toggleSpeaker);
  const setMode = useInterviewStore((s) => s.setMode);
  const setStatus = useInterviewStore((s) => s.setStatus);
  const setTimerActive = useInterviewStore((s) => s.setTimerActive);

  function handleEndInterview() {
    setTimerActive(false);
    setStatus("completed");
  }

  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
      {/* Left: Mic + Speaker */}
      <div className="flex items-center gap-1">
        {/* Mic toggle */}
        <button
          onClick={toggleMic}
          className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors cursor-pointer ${
            isMicMuted
              ? "text-red-400 hover:bg-red-400/10"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
          aria-label={isMicMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {isMicMuted ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="1" x2="23" y1="1" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" />
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.12 1.5-.34 2.18" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          )}
        </button>

        {/* Speaker toggle */}
        <button
          onClick={() => {
            toggleSpeaker();
            if (isSpeakerMuted && typeof window !== "undefined" && "speechSynthesis" in window) {
              try { window.speechSynthesis.speak(new SpeechSynthesisUtterance("")); } catch {}
            }
          }}
          className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors cursor-pointer ${
            isSpeakerMuted
              ? "text-red-400 hover:bg-red-400/10"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
          aria-label={isSpeakerMuted ? "Unmute speaker" : "Mute speaker"}
        >
          {isSpeakerMuted ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="22" x2="16" y1="9" y2="15" />
              <line x1="16" x2="22" y1="9" y2="15" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
        </button>
      </div>

      {/* Center: Mode toggle */}
      <div className="flex items-center rounded-md border border-border">
        <button
          onClick={() => setMode("text")}
          className={`h-7 rounded-l-md px-3 text-xs font-medium transition-colors cursor-pointer ${
            mode === "text"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Text
        </button>
        <button
          onClick={() => {
            setMode("voice");
            if (typeof window !== "undefined" && "speechSynthesis" in window) {
              try { window.speechSynthesis.speak(new SpeechSynthesisUtterance("")); } catch {}
            }
          }}
          className={`h-7 rounded-r-md px-3 text-xs font-medium transition-colors cursor-pointer ${
            mode === "voice"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Voice
        </button>
      </div>

      {/* Right: End Interview */}
      <button
        onClick={handleEndInterview}
        className="h-8 rounded-md px-3 text-xs font-medium text-red-400 transition-colors hover:bg-red-400/10 cursor-pointer"
      >
        End
      </button>
    </div>
  );
}
