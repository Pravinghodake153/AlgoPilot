"use client";

import { useState, useEffect, useRef } from "react";
import { useInterviewStore } from "@/features/interview/store/interview-store";
import { getAvailableVoices, type VoiceOption } from "@/hooks/use-web-speech";
import { speakBackend } from "@/hooks/use-tts";

export function InterviewLobby({
  onReady,
}: {
  onReady: () => void;
}) {
  const [micStatus, setMicStatus] = useState<"checking" | "ok" | "error">("checking");
  const [speakerTested, setSpeakerTested] = useState(false);
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const testAudioRef = useRef<HTMLAudioElement | null>(null);
  const mode = useInterviewStore((s) => s.mode);
  const setMode = useInterviewStore((s) => s.setMode);
  const interviewId = useInterviewStore((s) => s.interviewId);
  const selectedVoiceId = useInterviewStore((s) => s.selectedVoiceId);
  const setSelectedVoiceId = useInterviewStore((s) => s.setSelectedVoiceId);
  const isResuming = useInterviewStore((s) => s.status === "in_progress");
  const duration = useInterviewStore((s) => s.duration);
  const mounted = useRef(false);

  // Resume immediately if resuming
  useEffect(() => {
    if (isResuming && !mounted.current) {
      mounted.current = true;
      const timer = setTimeout(() => {
        onReady();
      }, 1500); // Small delay to show "Resuming" toast effect
      return () => clearTimeout(timer);
    }
  }, [isResuming, onReady]);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const available = getAvailableVoices();
      setVoices(available);
      if (!selectedVoiceId && available.length > 0) {
        setSelectedVoiceId(available[0].id);
      }
    };

    loadVoices();

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
      return () => {
        window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      };
    }
  }, [selectedVoiceId, setSelectedVoiceId]);

  // Request mic permission
  useEffect(() => {
    if (isResuming) return;

    let stream: MediaStream | null = null;
    
    async function checkMic() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicStatus("ok");
        stream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.error("Mic check failed:", err);
        setMicStatus("error");
      }
    }

    checkMic();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isResuming]);

  // Cleanup test audio on unmount
  useEffect(() => {
    return () => {
      if (testAudioRef.current) {
        testAudioRef.current.pause();
        testAudioRef.current = null;
      }
    };
  }, []);

  const handleTestSpeaker = async () => {
    if (isPlayingTest) {
      handleStopSpeaker();
      return;
    }

    setSpeakerTested(true);
    setIsPlayingTest(true);

    if (interviewId) {
      try {
        const audio = await speakBackend(
          "Hello! I am your AI interviewer. Your speaker is working.",
          interviewId,
          () => setIsPlayingTest(false), // onEnd
          () => setIsPlayingTest(false)  // onError
        );
        if (audio) {
          testAudioRef.current = audio;
        } else {
          setIsPlayingTest(false);
        }
      } catch (err) {
        console.error("Test speaker failed:", err);
        setIsPlayingTest(false);
      }
    } else {
      setIsPlayingTest(false);
    }
  };

  const handleStopSpeaker = () => {
    if (testAudioRef.current) {
      testAudioRef.current.pause();
      testAudioRef.current = null;
    }
    setIsPlayingTest(false);
  };

  if (isResuming) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background/80 backdrop-blur-sm z-50 fixed inset-0">
        <div className="flex flex-col items-center gap-4 p-8 rounded-xl bg-card border border-border shadow-xl">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <h2 className="text-lg font-semibold">Resuming your interview...</h2>
          <p className="text-sm text-muted-foreground">Restoring state and transcript</p>
        </div>
      </div>
    );
  }

  let introTime = Math.round(duration * 0.15);
  let problemTime = Math.round(duration * 0.35);
  let codeTime = Math.round(duration * 0.35);
  let wrapTime = duration - introTime - problemTime - codeTime;

  // Provide cleaner, realistic presets for common standard durations
  if (duration === 20) {
    introTime = 3;
    problemTime = 7;
    codeTime = 7;
    wrapTime = 3;
  } else if (duration === 30) {
    introTime = 4;
    problemTime = 11;
    codeTime = 11;
    wrapTime = 4;
  } else if (duration === 45) {
    introTime = 5;
    problemTime = 15;
    codeTime = 20;
    wrapTime = 5;
  } else if (duration === 60) {
    introTime = 5;
    problemTime = 20;
    codeTime = 25;
    wrapTime = 10;
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        <div className="border-b border-border bg-muted/30 p-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Pre-Interview Check</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Let&apos;s make sure your setup is ready before we start the timer.
          </p>
        </div>

        <div className="p-6 sm:p-8">
          <div className="grid gap-8 sm:grid-cols-2">
            
            {/* Device Check Section */}
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-medium text-foreground">1. Device Check</h3>
                
                <div className="space-y-3">
                  {/* Microphone */}
                  <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${micStatus === 'ok' ? 'bg-emerald-500/20 text-emerald-500' : micStatus === 'error' ? 'bg-red-500/20 text-red-500' : 'bg-secondary text-muted-foreground animate-pulse'}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                          <line x1="12" x2="12" y1="19" y2="22" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Microphone</p>
                        <p className="text-[11px] text-muted-foreground">
                          {micStatus === 'ok' ? 'Permission granted' : micStatus === 'error' ? 'Permission denied' : 'Checking...'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Speaker */}
                  <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${speakerTested ? 'bg-emerald-500/20 text-emerald-500' : 'bg-secondary text-muted-foreground'}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Speaker</p>
                        <p className="text-[11px] text-muted-foreground">
                          {speakerTested ? 'Tested successfully' : 'Not tested yet'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleTestSpeaker}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                        isPlayingTest
                          ? "bg-red-500/20 text-red-500 hover:bg-red-500/30"
                          : "bg-secondary text-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {isPlayingTest ? "Stop" : "Test"}
                    </button>
                  </div>

                  {/* Voice Selector */}
                  <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium">Interviewer Voice</p>
                        <select 
                          value={selectedVoiceId || ""}
                          onChange={(e) => setSelectedVoiceId(e.target.value)}
                          className="mt-1 block w-full rounded-md border-0 py-1 pl-2 pr-8 text-[11px] text-muted-foreground bg-secondary focus:ring-1 focus:ring-primary outline-none cursor-pointer truncate"
                        >
                          <optgroup label="Male Voices">
                            {voices.filter(v => v.gender === "male").map(v => (
                              <option key={v.id} value={v.id}>{v.label}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Female Voices">
                            {voices.filter(v => v.gender === "female").map(v => (
                              <option key={v.id} value={v.id}>{v.label}</option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mode Selection */}
              <div>
                <h3 className="mb-3 text-sm font-medium text-foreground">2. Interview Mode</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMode("voice")}
                    className={`flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors ${mode === "voice" ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-secondary/50"}`}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mode === "voice" ? "text-primary" : "text-muted-foreground"}>
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" x2="12" y1="19" y2="22" />
                    </svg>
                    <span className={`text-xs font-medium ${mode === "voice" ? "text-foreground" : "text-muted-foreground"}`}>Voice (Realistic)</span>
                  </button>
                  <button
                    onClick={() => setMode("text")}
                    className={`flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors ${mode === "text" ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-secondary/50"}`}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mode === "text" ? "text-primary" : "text-muted-foreground"}>
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span className={`text-xs font-medium ${mode === "text" ? "text-foreground" : "text-muted-foreground"}`}>Text Chat</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Structure Section */}
            <div>
              <h3 className="mb-3 text-sm font-medium text-foreground">Interview Structure</h3>
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="mb-4 text-xs text-muted-foreground">
                  Your {duration}-minute interview will follow this format:
                </p>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      <div className="h-full w-px bg-border my-1" />
                    </div>
                    <div className="pb-2">
                      <p className="text-sm font-medium text-foreground">1. Introduction</p>
                      <p className="text-xs text-muted-foreground">~{introTime} min • Clarify the problem</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-purple-500" />
                      <div className="h-full w-px bg-border my-1" />
                    </div>
                    <div className="pb-2">
                      <p className="text-sm font-medium text-foreground">2. Problem Solving</p>
                      <p className="text-xs text-muted-foreground">~{problemTime} min • Discuss approach & complexity</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-orange-500" />
                      <div className="h-full w-px bg-border my-1" />
                    </div>
                    <div className="pb-2">
                      <p className="text-sm font-medium text-foreground">3. Coding & Testing</p>
                      <p className="text-xs text-muted-foreground">~{codeTime} min • Implement and run tests</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">4. Wrap-up</p>
                      <p className="text-xs text-muted-foreground">~{wrapTime} min • Final optimization thoughts</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="border-t border-border bg-muted/30 p-6 flex justify-between items-center">
          <p className="text-xs text-muted-foreground">
            Make sure you&apos;re in a quiet environment.
          </p>
          <button
            onClick={onReady}
            disabled={mode === "voice" && micStatus === "error"}
            className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
          >
            I&apos;m Ready, Start
          </button>
        </div>
      </div>
    </div>
  );
}
