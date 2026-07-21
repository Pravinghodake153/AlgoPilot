"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { useInterviewStore } from "@/features/interview/store/interview-store";
import { useWebSpeech, speak, stopSpeaking } from "@/hooks/use-web-speech";
import { readSSEStream } from "@/lib/sse-utils";


/**
 * Voice input — shows when interview is in voice mode.
 * Listens for speech, sends transcript to AI, streams response tokens,
 * and starts TTS on the first complete sentence while the rest generates.
 */
export function VoiceInput() {
  const addMessage = useInterviewStore((s) => s.addMessage);
  const setAIState = useInterviewStore((s) => s.setAIState);
  const interviewId = useInterviewStore((s) => s.interviewId);
  const isMicMuted = useInterviewStore((s) => s.isMicMuted);
  const isSpeakerMuted = useInterviewStore((s) => s.isSpeakerMuted);
  const aiState = useInterviewStore((s) => s.aiState);
  const code = useInterviewStore((s) => s.code);
  const timeRemainingSeconds = useInterviewStore((s) => s.timeRemainingSeconds);
  const [lastExecResult, setLastExecResult] = useState<Record<string, unknown> | null>(null);

  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Track pending TTS sentences for sentence-level streaming
  const sentenceBufferRef = useRef("");
  const ttsQueueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef(false);

  // Listen for code execution results via custom event
  useEffect(() => {
    function handleExecResult(e: CustomEvent) {
      setLastExecResult(e.detail);
    }
    window.addEventListener("code-execution-result", handleExecResult as EventListener);
    return () => window.removeEventListener("code-execution-result", handleExecResult as EventListener);
  }, []);

  /**
   * Speak sentences from the queue one at a time.
   * Called whenever a new sentence is added to the queue.
   */
  const speakNextInQueue = useCallback(function processNext() {
    if (isSpeakingRef.current || ttsQueueRef.current.length === 0) return;

    const sentence = ttsQueueRef.current.shift()!;
    isSpeakingRef.current = true;

    speak(sentence, {
      rate: 1.0,
      onEnd: () => {
        isSpeakingRef.current = false;
        // Speak next sentence or transition to listening
        if (ttsQueueRef.current.length > 0) {
          processNext();
        } else {
          // All sentences spoken, go back to listening
          setAIState("listening");
        }
      },
      onError: () => {
        isSpeakingRef.current = false;
        if (ttsQueueRef.current.length > 0) {
          processNext();
        } else {
          setAIState("listening");
        }
      },
    });
  }, [setAIState]);

  /**
   * Extract complete sentences from the buffer and queue them for TTS.
   * A sentence boundary is defined as text ending with . ? or !
   */
  const flushSentences = useCallback(() => {
    const buf = sentenceBufferRef.current;
    // Match sentences ending with punctuation
    const sentenceRegex = /[^.!?]*[.!?]+/g;
    let match;
    let lastIndex = 0;

    while ((match = sentenceRegex.exec(buf)) !== null) {
      const sentence = match[0].trim();
      if (sentence.length > 2) {
        ttsQueueRef.current.push(sentence);
      }
      lastIndex = sentenceRegex.lastIndex;
    }

    // Keep the remainder in the buffer
    sentenceBufferRef.current = buf.slice(lastIndex);

    // Start speaking if not already
    if (!isSpeakerMuted) {
      speakNextInQueue();
    }
  }, [isSpeakerMuted, speakNextInQueue]);

  const handleSpeechResult = useCallback(
    async (transcript: string) => {
      if (!interviewId) return;

      // Add user message
      addMessage("user", transcript);
      setAIState("thinking");

      // Reset TTS state
      sentenceBufferRef.current = "";
      ttsQueueRef.current = [];
      isSpeakingRef.current = false;

      let isTimeout = false;
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      let timeoutId: NodeJS.Timeout | undefined;
      const resetTimeout = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          isTimeout = true;
          controller.abort();
          
          if (!isMountedRef.current) return;
          
          try {
            await fetch(`/api/interviews/${interviewId}/log-error`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                errorType: "TIMEOUT",
                message: "Voice message AI response timed out after 10 minutes of inactivity",
              }),
            });
          } catch (err) {
            console.error("Failed to log timeout to DB:", err);
          }
        }, 600000);
      };

      resetTimeout();

      try {
        const response = await fetch(`/api/interviews/${interviewId}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            message: transcript,
            code,
            executionResult: lastExecResult,
            timeRemainingSeconds,
          }),
        });

        if (!response.ok) throw new Error("Chat failed");

        // Create a placeholder message for streaming
        const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

        useInterviewStore.setState((state) => ({
          messages: [
            ...state.messages,
            {
              id: msgId,
              role: "assistant" as const,
              content: "",
              timestamp: Date.now(),
            },
          ],
        }));

        setAIState("speaking");
        setLastExecResult(null);

        await readSSEStream(
          response,
          // onToken: update message and buffer for TTS
          (token, isReasoning) => {
            resetTimeout();
            useInterviewStore.setState((state) => ({
              messages: state.messages.map((m) =>
                m.id === msgId ? { ...m, content: m.content + token } : m
              ),
            }));

            // Buffer tokens for sentence-level TTS
            if (!isSpeakerMuted && !isReasoning) {
              sentenceBufferRef.current += token;
              flushSentences();
            }
          },
          // onDone: finalize message and speak any remaining text
          (fullText) => {
            clearTimeout(timeoutId);
            useInterviewStore.setState((state) => ({
              messages: state.messages.map((m) =>
                m.id === msgId ? { ...m, content: fullText } : m
              ),
            }));

            // Flush remaining buffered text as the final sentence
            if (!isSpeakerMuted && sentenceBufferRef.current.trim()) {
              ttsQueueRef.current.push(sentenceBufferRef.current.trim());
              sentenceBufferRef.current = "";
            }
            
            if (!isSpeakerMuted && ttsQueueRef.current.length > 0) {
              speakNextInQueue();
            } else if (!isSpeakingRef.current) {
              setAIState("listening");
            }
          },
          // onError
          (err) => {
            clearTimeout(timeoutId);
            if (!isMountedRef.current) return;
            
            const errMsg = isTimeout
              ? "We encountered an error. Please try again."
              : "Sorry, I encountered a connection issue. Could you repeat that?";
            
            useInterviewStore.setState((state) => ({
              messages: state.messages.map((m) =>
                m.id === msgId ? { ...m, content: errMsg } : m
              ),
            }));
            setAIState("idle");
          }
        );
      } catch (err) {
        clearTimeout(timeoutId);
        if (!isMountedRef.current) return;
        
        const errMsg = isTimeout
          ? "We encountered an error. Please try again."
          : "Sorry, I encountered a connection issue. Could you repeat that?";
        
        useInterviewStore.setState((state) => ({
          messages: [
            ...state.messages,
            {
              id: `err-${Date.now()}`,
              role: "assistant",
              content: errMsg,
              timestamp: Date.now(),
            },
          ],
        }));
        setAIState("idle");
      }
    },
    [interviewId, addMessage, setAIState, isSpeakerMuted, code, lastExecResult, timeRemainingSeconds, flushSentences, speakNextInQueue]
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
    language: "en-US",
  });

  // Auto-start listening on mount if not muted
  useEffect(() => {
    if (!isMicMuted) {
      startListening();
      if (aiState === "idle") {
        setAIState("listening");
      }
    }
    // Cleanup on unmount
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopListening();
      stopSpeaking();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      useInterviewStore.getState().setAIState("idle");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync mic mute state with speech recognition hook
  useEffect(() => {
    if (isMicMuted || aiState === "thinking" || aiState === "speaking") {
      pauseListening();
    } else {
      resumeListening();
    }
  }, [isMicMuted, aiState, pauseListening, resumeListening]);

  // Auto-start/stop based on mic mute
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
