"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useInterviewStore } from "@/features/interview/store/interview-store";
import { useWebSpeech, stopSpeaking } from "@/hooks/use-web-speech";


/**
 * Voice input — shows when interview is in voice mode.
 * Contains both Auto Mode (continuous browser STT) and Manual Mode (Push-to-Talk via backend).
 */
interface VoiceInputProps {
  sendMessage: (text: string) => void;
  stopGeneration: () => void;
}

export function VoiceInput({ sendMessage, stopGeneration }: VoiceInputProps) {
  const isMicMuted = useInterviewStore((s) => s.isMicMuted);
  const aiState = useInterviewStore((s) => s.aiState);
  const isStreaming = useInterviewStore((s) => s.isStreaming);
  const sttLanguage = useInterviewStore((s) => s.sttLanguage);
  const setAIState = useInterviewStore((s) => s.setAIState);
  const mode = useInterviewStore((s) => s.mode);
  
  const voiceInputMode = useInterviewStore((s) => s.voiceInputMode);
  const setVoiceInputMode = useInterviewStore((s) => s.setVoiceInputMode);
  const interviewId = useInterviewStore((s) => s.interviewId);
  const toggleMic = useInterviewStore((s) => s.toggleMic);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isManualRecording, setIsManualRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);

  // Web Audio Visualizer Refs
  const volumeRef = useRef<HTMLSpanElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  // MediaRecorder Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // ─── Volume Visualizer ─────────────────────────

  const stopVolumeVisualizer = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (audioContextRef.current) {
      if (audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    analyserRef.current = null;
    dataArrayRef.current = null;

    if (volumeRef.current) {
      volumeRef.current.style.transform = "scale(1)";
      volumeRef.current.style.opacity = "0.2";
    }
  }, []);

  const highVolumeStartTimeRef = useRef<number | null>(null);

  const startVolumeVisualizer = useCallback(async (): Promise<MediaStream | null> => {
    if (typeof window === "undefined" || !navigator.mediaDevices) return null;
    if (useInterviewStore.getState().isMicMuted) {
      stopVolumeVisualizer();
      return null;
    }

    stopVolumeVisualizer();

    try {
      // 🎧 Enable WebRTC Echo Cancellation, Noise Suppression & Auto Gain Control
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return stream;

      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;

      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      dataArrayRef.current = dataArray;

      const updateVolume = () => {
        if (!analyserRef.current || !dataArrayRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);

        let sum = 0;
        for (let i = 0; i < dataArrayRef.current.length; i++) {
          sum += dataArrayRef.current[i];
        }
        const average = sum / dataArrayRef.current.length;

        if (volumeRef.current) {
          const scale = 1.0 + (average / 255.0) * 0.7;
          const opacity = Math.min(0.9, 0.2 + (average / 255.0) * 0.7);
          volumeRef.current.style.transform = `scale(${scale})`;
          volumeRef.current.style.opacity = `${opacity}`;
        }

        // ⏱️ Intentional Barge-in Handling during AI speech
        const currentAiState = useInterviewStore.getState().aiState;
        if (currentAiState === "speaking") {
          // If candidate is speaking loudly (>40% volume amplitude) directly into mic
          if (average > 100) {
            if (!highVolumeStartTimeRef.current) {
              highVolumeStartTimeRef.current = Date.now();
            } else if (Date.now() - highVolumeStartTimeRef.current > 400) {
              // High volume sustained for > 400ms -> Candidate intentionally interrupting AI!
              stopSpeaking();
              useInterviewStore.getState().setAIState("listening");
              highVolumeStartTimeRef.current = null;
            }
          } else {
            highVolumeStartTimeRef.current = null;
          }
        } else {
          highVolumeStartTimeRef.current = null;
        }

        animationFrameIdRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
      return stream;
    } catch (err: any) {
      console.error("Error starting volume visualizer:", err);
      setErrorMessage(`Microphone access failed: ${err.message}`);
      return null;
    }
  }, [stopVolumeVisualizer]);


  // ─── Manual Recording Logic (MediaRecorder) ────

  const startManualRecording = async () => {
    if (useInterviewStore.getState().isMicMuted) {
      setErrorMessage("Unmute your microphone to start recording.");
      return;
    }
    setErrorMessage(null);
    const stream = await startVolumeVisualizer();
    if (!stream) return;

    try {
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stopVolumeVisualizer(); // this also stops the tracks

        if (audioChunksRef.current.length === 0 || audioBlob.size === 0) {
          setAIState("idle");
          return;
        }

        setIsProcessingAudio(true);
        setAIState("thinking");

        try {
          const formData = new FormData();
          formData.append("file", audioBlob, "audio.webm");
          const res = await fetch(`/api/interviews/${interviewId}/stt`, {
            method: "POST",
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            if (data.text && data.text.trim().length > 0) {
               sendMessage(data.text);
            } else {
               setAIState("idle"); 
            }
          } else {
             const err = await res.text();
             setErrorMessage(`STT Failed (Backend Error)`);
             console.error(err);
             setAIState("idle");
          }
        } catch (e: any) {
          setErrorMessage(`Network error: ${e.message}`);
          setAIState("idle");
        } finally {
          setIsProcessingAudio(false);
        }
      };

      mediaRecorder.start();
      setIsManualRecording(true);
      setAIState("listening");

    } catch (e: any) {
      setErrorMessage(e.message);
    }
  };

  const stopManualRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsManualRecording(false);
    }
  };


  // ─── Auto Speech Recognition (Web Speech API) ──

  const handleSpeechResult = useCallback(
    (transcript: string) => {
      if (!transcript.trim()) return;
      sendMessage(transcript);
    },
    [sendMessage]
  );

  const { isListening, isSupported, startListening, stopListening } =
    useWebSpeech({
      onResult: handleSpeechResult,
      onError: (error) => {
        console.error("Speech error:", error);
        if (error === "not-allowed") {
          setErrorMessage("Microphone permission blocked.");
        } else if (error === "network") {
          setErrorMessage("Network error: Chrome STT requires active internet.");
        } else {
          setErrorMessage(`Speech Error: ${error}`);
        }
      },
      continuous: true,
      language: sttLanguage,
    });

  // ─── Derived State ─────────────────────────────

  const isGenerating = isStreaming || aiState === "thinking" || isProcessingAudio;

  const shouldListenAuto =
    mode === "voice" &&
    voiceInputMode === "auto" &&
    !isMicMuted &&
    !isGenerating &&
    aiState !== "speaking";

  const isActiveAuto = isListening && mode === "voice" && voiceInputMode === "auto" && !isMicMuted;
  const isActive = voiceInputMode === "auto" ? isActiveAuto : isManualRecording;

  // ─── Effects ───────────────────────────────────

  // Master cleanup
  useEffect(() => {
    return () => {
      stopListening();
      stopSpeaking();
      stopVolumeVisualizer();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync Auto Speech Recognition
  useEffect(() => {
    if (voiceInputMode === "manual") {
      stopListening();
      return;
    }

    if (shouldListenAuto) {
      if (!isListening) {
        setErrorMessage(null);
        startListening();
        setAIState("listening");
      }
    } else {
      stopListening();
      if (mode === "voice" && aiState === "listening" && !isManualRecording) {
        setAIState("idle");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldListenAuto, voiceInputMode]);

  // Stop all audio capture when mic is muted
  useEffect(() => {
    if (isMicMuted) {
      stopListening();
      stopVolumeVisualizer();
      if (isManualRecording) {
        stopManualRecording();
      }
    }
  }, [isMicMuted, stopListening, stopVolumeVisualizer, isManualRecording]);

  // Sync volume visualizer for Auto Mode
  useEffect(() => {
    if (voiceInputMode === "auto") {
      if (isActiveAuto) {
        startVolumeVisualizer();
      } else {
        stopVolumeVisualizer();
      }
    }
    return () => {
      if (voiceInputMode === "auto") {
        stopVolumeVisualizer();
      }
    };
  }, [isActiveAuto, voiceInputMode, startVolumeVisualizer, stopVolumeVisualizer]);

  // ─── Click Handler ─────────────────────────────

  function handleButtonClick() {
    if (isGenerating) {
      stopGeneration();
      return;
    }

    setErrorMessage(null);

    if (voiceInputMode === "auto") {
      toggleMic();
      if (isMicMuted) stopSpeaking(); 
    } else {
      // Manual Mode
      if (isManualRecording) {
        stopManualRecording();
      } else {
        stopSpeaking();
        startManualRecording();
      }
    }
  }

  // ─── Render ────────────────────────────────────

  if (!isSupported && voiceInputMode === "auto") {
    // If auto is not supported (e.g. non-Chrome browser), fallback to manual
    setVoiceInputMode("manual");
  }

  return (
    <div className="flex flex-col items-center gap-4 border-t border-border px-4 py-6 bg-card/50 relative">
      
      {/* Mode Toggle */}
      <div className="absolute top-2 right-4 flex bg-secondary rounded-full p-1 border border-border/50">
        <button
          onClick={() => setVoiceInputMode("auto")}
          className={`px-3 py-1 text-[10px] rounded-full transition-colors ${
            voiceInputMode === "auto" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Auto
        </button>
        <button
          onClick={() => setVoiceInputMode("manual")}
          className={`px-3 py-1 text-[10px] rounded-full transition-colors ${
            voiceInputMode === "manual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Record
        </button>
      </div>

      {/* Listening / Generating / Stop button */}
      <button
        onClick={handleButtonClick}
        className="group relative flex h-16 w-16 items-center justify-center rounded-full transition-all cursor-pointer mt-2"
        aria-label={
          isGenerating
            ? "Stop generating"
            : isActive
              ? "Stop listening"
              : "Start listening"
        }
      >
        {/* Audio Volume Visualizer ring */}
        <span
          ref={volumeRef}
          className="absolute inset-0 rounded-full bg-emerald-500/25 blur-[2px] transition-all duration-75 ease-out"
          style={{
            display: isActive ? "block" : "none",
            transform: "scale(1)",
            opacity: "0.2",
          }}
        />

        <span
          className={`relative flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
            isGenerating
              ? "bg-red-500/20 text-red-500 hover:bg-red-500/30"
              : isActive
                ? "bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                : aiState === "speaking"
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-secondary text-muted-foreground group-hover:bg-secondary/80 group-hover:text-foreground"
          }`}
        >
          {isGenerating ? (
            /* Stop square icon */
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          ) : isActive && voiceInputMode === "manual" ? (
             /* Stop Recording Icon */
             <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
               <rect x="6" y="6" width="12" height="12" rx="2" />
             </svg>
          ) : aiState === "speaking" ? (
            /* Speaker icon when AI is speaking */
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          ) : (
            /* Microphone icon */
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          )}
        </span>
      </button>

      <div className="flex flex-col items-center">
        <span className="text-sm font-medium text-foreground">
          {isProcessingAudio ? "Transcribing..." : isGenerating
            ? "Stop Generating"
            : isActive
              ? voiceInputMode === "manual" ? "Recording... (Tap to Send)" : "Listening..."
              : aiState === "speaking"
                ? "AI is speaking..."
                : voiceInputMode === "manual" ? "Tap to Record" : (isMicMuted ? "Mic is Off" : "Tap to mute")}
        </span>
        {voiceInputMode === "manual" && !isActive && !isGenerating && (
           <span className="text-[10px] text-muted-foreground mt-1">
             Your audio is sent securely.
           </span>
        )}
      </div>

      {errorMessage && (
        <span className="text-[11px] text-red-400 text-center max-w-[280px] px-2 leading-tight bg-red-500/10 py-1.5 rounded-md mt-1">
          {errorMessage}
        </span>
      )}
    </div>
  );
}
