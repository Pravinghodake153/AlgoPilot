"use client";

import { useState, useEffect, useRef } from "react";
import { useInterviewStore } from "@/features/interview/store/interview-store";
import {
  getAvailableVoices,
  STT_LANGUAGES,
  type VoiceOption,
} from "@/hooks/use-web-speech";

/**
 * Voice control bar — Mic toggle, Speaker toggle, Voice picker,
 * Language selector, Mode switch, End Interview.
 */
export function VoiceControls() {
  const isMicMuted = useInterviewStore((s) => s.isMicMuted);
  const isSpeakerMuted = useInterviewStore((s) => s.isSpeakerMuted);
  const mode = useInterviewStore((s) => s.mode);
  const selectedVoiceId = useInterviewStore((s) => s.selectedVoiceId);
  const sttLanguage = useInterviewStore((s) => s.sttLanguage);
  const toggleMic = useInterviewStore((s) => s.toggleMic);
  const toggleSpeaker = useInterviewStore((s) => s.toggleSpeaker);
  const setMode = useInterviewStore((s) => s.setMode);
  const setStatus = useInterviewStore((s) => s.setStatus);
  const setTimerActive = useInterviewStore((s) => s.setTimerActive);
  const setSelectedVoiceId = useInterviewStore((s) => s.setSelectedVoiceId);
  const setSttLanguage = useInterviewStore((s) => s.setSttLanguage);

  const interviewId = useInterviewStore((s) => s.interviewId);
  const code = useInterviewStore((s) => s.code);
  const [showConfirm, setShowConfirm] = useState(false);

  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const voicePickerRef = useRef<HTMLDivElement>(null);
  const langPickerRef = useRef<HTMLDivElement>(null);

  // Load voices (may load async on first call)
  useEffect(() => {
    const loadVoices = () => {
      const available = getAvailableVoices();
      setVoices(available);
      // Set default voice if none selected
      if (!selectedVoiceId && available.length > 0) {
        setSelectedVoiceId(available[0].id);
      }
    };

    loadVoices();

    // Chrome loads voices asynchronously
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
      return () => {
        window.speechSynthesis.removeEventListener(
          "voiceschanged",
          loadVoices
        );
      };
    }
  }, [selectedVoiceId, setSelectedVoiceId]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        voicePickerRef.current &&
        !voicePickerRef.current.contains(e.target as Node)
      ) {
        setShowVoicePicker(false);
      }
      if (
        langPickerRef.current &&
        !langPickerRef.current.contains(e.target as Node)
      ) {
        setShowLangPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleEndClick() {
    setShowConfirm(true);
  }

  async function handleConfirmEnd() {
    setShowConfirm(false);
    try {
      await fetch(`/api/interviews/${interviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, action: "submit" }),
      });
    } catch (e) {
      console.error("Failed to save code on end:", e);
    }
    setTimerActive(false);
    setStatus("completed");
  }

  const selectedVoice = voices.find((v) => v.id === selectedVoiceId);
  const selectedLang = STT_LANGUAGES.find((l) => l.code === sttLanguage);

  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
      {/* Left: Mic + Speaker + Voice picker + Language */}
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

        {/* Separator */}
        <div className="mx-1 h-5 w-px bg-border" />

        {/* Voice Picker */}
        <div className="relative" ref={voicePickerRef}>
          <button
            onClick={() => {
              setShowVoicePicker(!showVoicePicker);
              setShowLangPicker(false);
            }}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground cursor-pointer"
            aria-label="Select voice"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            </svg>
            <span className="max-w-[60px] truncate">
              {selectedVoice?.label || "Voice"}
            </span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {showVoicePicker && (
            <div className="absolute bottom-full left-0 mb-1 min-w-[180px] rounded-lg border border-border bg-background shadow-xl z-50">
              <div className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                Male Voices
              </div>
              {voices
                .filter((v) => v.gender === "male")
                .map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setSelectedVoiceId(v.id);
                      setShowVoicePicker(false);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-secondary cursor-pointer ${
                      selectedVoiceId === v.id
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    {selectedVoiceId === v.id && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    <span className={selectedVoiceId === v.id ? "" : "ml-[18px]"}>
                      {v.label}
                    </span>
                  </button>
                ))}
              <div className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 border-t border-border">
                Female Voices
              </div>
              {voices
                .filter((v) => v.gender === "female")
                .map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setSelectedVoiceId(v.id);
                      setShowVoicePicker(false);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-secondary cursor-pointer ${
                      selectedVoiceId === v.id
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    {selectedVoiceId === v.id && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    <span className={selectedVoiceId === v.id ? "" : "ml-[18px]"}>
                      {v.label}
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Language Selector */}
        <div className="relative" ref={langPickerRef}>
          <button
            onClick={() => {
              setShowLangPicker(!showLangPicker);
              setShowVoicePicker(false);
            }}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground cursor-pointer"
            aria-label="Select language"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span className="max-w-[50px] truncate">
              {selectedLang?.label.split(" ")[0] || "Lang"}
            </span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {showLangPicker && (
            <div className="absolute bottom-full left-0 mb-1 min-w-[150px] rounded-lg border border-border bg-background shadow-xl z-50">
              {STT_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setSttLanguage(lang.code);
                    setShowLangPicker(false);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-secondary cursor-pointer ${
                    sttLanguage === lang.code
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {sttLanguage === lang.code && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  <span className={sttLanguage === lang.code ? "" : "ml-[18px]"}>
                    {lang.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
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
        onClick={handleEndClick}
        className="h-8 rounded-md px-3 text-xs font-medium text-red-400 transition-colors hover:bg-red-400/10 cursor-pointer"
      >
        End
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowConfirm(false)}
            aria-hidden
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
            <h3 className="text-base font-semibold text-foreground">End Interview?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to end the interview? Your current code will be saved and your evaluation report will be generated.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="h-9 rounded-md px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEnd}
                className="h-9 rounded-md bg-red-500 px-5 text-sm font-medium text-white transition-colors hover:bg-red-600 cursor-pointer"
              >
                End Interview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
