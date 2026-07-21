"use client";

import { useRef, useCallback } from "react";
import { speak, stopSpeaking } from "@/hooks/use-web-speech";
import { useInterviewStore } from "@/features/interview/store/interview-store";

/**
 * Centralized Text-to-Speech hook.
 * Manages sentence-level buffering and a speaking queue.
 * Works regardless of mode (text or voice) — driven by isSpeakerMuted state.
 *
 * Lives at the parent level so it never unmounts during mode switches.
 */
export function useTTS() {
  const sentenceBufferRef = useRef("");
  const ttsQueueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef(false);
  const isDoneStreamingRef = useRef(false);

  /**
   * Speak sentences from the queue one at a time.
   * When the queue empties after streaming is done, transitions aiState.
   */
  const speakNextInQueue = useCallback(function processNext() {
    if (isSpeakingRef.current || ttsQueueRef.current.length === 0) {
      // Queue is empty — if streaming is done, transition state
      if (
        ttsQueueRef.current.length === 0 &&
        !isSpeakingRef.current &&
        isDoneStreamingRef.current
      ) {
        const store = useInterviewStore.getState();
        if (store.mode === "voice") {
          store.setAIState("listening");
        } else {
          store.setAIState("idle");
        }
        isDoneStreamingRef.current = false;
      }
      return;
    }

    const sentence = ttsQueueRef.current.shift()!;
    isSpeakingRef.current = true;

    const voiceName = useInterviewStore.getState().selectedVoiceId;

    speak(sentence, {
      rate: 1.0,
      voiceName: voiceName?.startsWith("default-") ? null : voiceName,
      onEnd: () => {
        isSpeakingRef.current = false;
        processNext();
      },
      onError: () => {
        isSpeakingRef.current = false;
        processNext();
      },
    });
  }, []);

  /**
   * Buffer a token for TTS. Extracts complete sentences and queues them.
   * Call this on every non-reasoning token from the stream.
   */
  const bufferToken = useCallback(
    (token: string) => {
      const isSpeakerMuted = useInterviewStore.getState().isSpeakerMuted;
      if (isSpeakerMuted) return;

      sentenceBufferRef.current += token;

      // Extract complete sentences (ending with . ? or !)
      const buf = sentenceBufferRef.current;
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
      speakNextInQueue();
    },
    [speakNextInQueue]
  );

  /**
   * Flush any remaining text in the buffer and mark streaming as done.
   * Called when the SSE stream completes.
   */
  const flushAndFinish = useCallback(() => {
    const isSpeakerMuted = useInterviewStore.getState().isSpeakerMuted;

    if (!isSpeakerMuted && sentenceBufferRef.current.trim()) {
      ttsQueueRef.current.push(sentenceBufferRef.current.trim());
      sentenceBufferRef.current = "";
    }

    isDoneStreamingRef.current = true;

    if (!isSpeakerMuted && ttsQueueRef.current.length > 0) {
      speakNextInQueue();
    } else if (!isSpeakingRef.current) {
      // Nothing queued, nothing speaking — transition immediately
      isDoneStreamingRef.current = false;
      const store = useInterviewStore.getState();
      if (store.mode === "voice") {
        store.setAIState("listening");
      } else {
        store.setAIState("idle");
      }
    }
  }, [speakNextInQueue]);

  /**
   * Reset all TTS state. Called before starting a new stream.
   */
  const resetTTS = useCallback(() => {
    stopSpeaking();
    sentenceBufferRef.current = "";
    ttsQueueRef.current = [];
    isSpeakingRef.current = false;
    isDoneStreamingRef.current = false;
  }, []);

  /**
   * Stop all TTS and clear queue. Called on unmount or manual stop.
   */
  const stopAll = useCallback(() => {
    stopSpeaking();
    sentenceBufferRef.current = "";
    ttsQueueRef.current = [];
    isSpeakingRef.current = false;
    isDoneStreamingRef.current = false;
  }, []);

  return {
    bufferToken,
    flushAndFinish,
    resetTTS,
    stopAll,
  };
}
