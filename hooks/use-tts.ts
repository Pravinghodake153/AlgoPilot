"use client";

import { useRef, useCallback } from "react";
import { useInterviewStore } from "@/features/interview/store/interview-store";

/**
 * Centralized Text-to-Speech hook using OpenRouter Backend TTS.
 * Manages sentence-level buffering and a speaking queue.
 * Fetches audio blobs from our backend API and plays them sequentially.
 */

/**
 * Utility to speak a single string via backend TTS.
 * Useful for one-off messages (e.g. welcome message).
 */
export async function speakBackend(text: string, interviewId: string, onEnd?: () => void, onError?: () => void) {
  try {
    const selectedVoiceId = useInterviewStore.getState().selectedVoiceId;
    const res = await fetch(`/api/interviews/${interviewId}/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: selectedVoiceId }),
    });
    if (!res.ok) throw new Error("TTS failed");
    
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    
    audio.onended = () => {
      URL.revokeObjectURL(url);
      if (onEnd) onEnd();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      if (onError) onError();
    };
    
    await audio.play();
    return audio;
  } catch (e) {
    console.error(e);
    if (onError) onError();
    return null;
  }
}

export function useTTS() {
  const sentenceBufferRef = useRef("");
  const ttsQueueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef(false);
  const isDoneStreamingRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  /**
   * Stop currently playing audio.
   */
  const stopSpeaking = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.src = "";
      currentAudioRef.current = null;
    }
  }, []);

  /**
   * Speak sentences from the queue one at a time.
   */
  const speakNextInQueue = useCallback(async function processNext() {
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

    const store = useInterviewStore.getState();
    const interviewId = store.interviewId;
    const selectedVoiceId = store.selectedVoiceId;

    try {
      const res = await fetch(`/api/interviews/${interviewId}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sentence, voice: selectedVoiceId }),
      });

      if (!res.ok) {
        throw new Error(`TTS failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        isSpeakingRef.current = false;
        currentAudioRef.current = null;
        processNext();
      };

      audio.onerror = () => {
        console.error("Audio playback error");
        URL.revokeObjectURL(url);
        isSpeakingRef.current = false;
        currentAudioRef.current = null;
        processNext();
      };

      await audio.play();
    } catch (e) {
      console.error("TTS fetch/play error:", e);
      isSpeakingRef.current = false;
      processNext();
    }
  }, []);

  /**
   * Buffer a token for TTS. Groups text into larger paragraphs or chunks (>180 chars) for natural intonation.
   */
  const bufferToken = useCallback(
    (token: string) => {
      const isSpeakerMuted = useInterviewStore.getState().isSpeakerMuted;
      if (isSpeakerMuted) return;

      sentenceBufferRef.current += token;
      const buf = sentenceBufferRef.current;

      // Check if we have a paragraph separator (double newline or single newline if it marks a list item)
      const paragraphIndex = buf.indexOf("\n\n");
      
      if (paragraphIndex !== -1) {
        const paragraph = buf.slice(0, paragraphIndex).trim();
        if (paragraph.length > 2) {
          ttsQueueRef.current.push(paragraph);
        }
        sentenceBufferRef.current = buf.slice(paragraphIndex + 2);
        speakNextInQueue();
      } else if (buf.length > 200) {
        // Find the last sentence boundary (. ! ?) in the buffer to avoid splitting mid-sentence
        const lastSentenceBoundary = Math.max(
          buf.lastIndexOf("."),
          buf.lastIndexOf("?"),
          buf.lastIndexOf("!")
        );
        
        // Ensure we don't split on abbreviation or very early in the buffer
        if (lastSentenceBoundary !== -1 && lastSentenceBoundary > 50) {
          const chunk = buf.slice(0, lastSentenceBoundary + 1).trim();
          if (chunk.length > 2) {
            ttsQueueRef.current.push(chunk);
          }
          sentenceBufferRef.current = buf.slice(lastSentenceBoundary + 1);
          speakNextInQueue();
        }
      }
    },
    [speakNextInQueue]
  );

  /**
   * Flush any remaining text in the buffer and mark streaming as done.
   */
  const flushAndFinish = useCallback(() => {
    const isSpeakerMuted = useInterviewStore.getState().isSpeakerMuted;

    if (!isSpeakerMuted && sentenceBufferRef.current.trim().length > 2) {
      ttsQueueRef.current.push(sentenceBufferRef.current.trim());
      sentenceBufferRef.current = "";
    } else {
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
  }, [stopSpeaking]);

  /**
   * Stop all TTS and clear queue. Called on unmount or manual stop.
   */
  const stopAll = useCallback(() => {
    stopSpeaking();
    sentenceBufferRef.current = "";
    ttsQueueRef.current = [];
    isSpeakingRef.current = false;
    isDoneStreamingRef.current = false;
  }, [stopSpeaking]);

  return {
    bufferToken,
    flushAndFinish,
    resetTTS,
    stopAll,
  };
}
