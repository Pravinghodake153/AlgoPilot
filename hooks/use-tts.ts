"use client";

import { useRef, useCallback } from "react";
import { useInterviewStore } from "@/features/interview/store/interview-store";

/**
 * Centralized Text-to-Speech hook using OpenRouter Backend TTS.
 * Manages sentence-level buffering and a speaking queue.
 * Fetches audio blobs from our backend API and plays them sequentially.
 */

/**
 * Helper to strip markdown symbols and convert punctuation for natural breathing pauses in TTS:
 * - Hyphens (—, --) -> ellipses (...)
 * - Semicolons (;) and Colons (:) -> commas (,)
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return "";
  return text
    // Remove markdown code blocks
    .replace(/```[\s\S]*?```/g, " ")
    // Remove bold/italic markers
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    // Remove inline backticks
    .replace(/`([^`]+)`/g, "$1")
    // Remove headers (# Header)
    .replace(/^\s*#+\s+/gm, "")
    // Remove bullet points
    .replace(/^\s*[-*+]\s+/gm, "")
    // Remove escaped or stray asterisks
    .replace(/[*`_#]/g, "")
    // Convert long hyphens and double dashes into breathing ellipses
    .replace(/(?:—|--)/g, "... ")
    // Convert semicolons and colons into commas for soft natural pauses
    .replace(/;/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Cached TTS Speed setting fetched from /api/tts/settings (default 1.0)
 */
let cachedTtsSpeed = 1.0;
let isTtsSpeedFetched = false;

async function getActiveTtsSpeed(): Promise<number> {
  if (isTtsSpeedFetched) return cachedTtsSpeed;
  try {
    const res = await fetch("/api/tts/settings");
    if (res.ok) {
      const data = await res.json();
      if (typeof data.ttsSpeed === "number" && !isNaN(data.ttsSpeed)) {
        cachedTtsSpeed = data.ttsSpeed;
      }
    }
  } catch (e) {
    console.warn("Failed to fetch TTS speed setting:", e);
  } finally {
    isTtsSpeedFetched = true;
  }
  return cachedTtsSpeed;
}

/**
 * Global audio cache keyed by `${voiceId}:${text}` to prevent redundant OpenRouter API calls and save money.
 * Capped at 40 entries with LRU eviction and URL.revokeObjectURL() to prevent browser memory leaks.
 */
const audioCacheMap = new Map<string, string>();
const MAX_AUDIO_CACHE_SIZE = 40;
let activeAudioUrl: string | null = null;

function setInAudioCache(key: string, url: string) {
  if (audioCacheMap.has(key)) {
    const existingUrl = audioCacheMap.get(key);
    if (existingUrl && existingUrl !== url && existingUrl !== activeAudioUrl) {
      try {
        URL.revokeObjectURL(existingUrl);
      } catch {}
    }
    audioCacheMap.delete(key);
  } else if (audioCacheMap.size >= MAX_AUDIO_CACHE_SIZE) {
    // Find the oldest entry that is NOT the currently active/playing URL to prevent audio decode interruption
    let keyToEvict: string | null = null;
    for (const k of audioCacheMap.keys()) {
      const u = audioCacheMap.get(k);
      if (u && u !== activeAudioUrl) {
        keyToEvict = k;
        break;
      }
    }
    if (keyToEvict) {
      const oldestUrl = audioCacheMap.get(keyToEvict);
      if (oldestUrl) {
        try {
          URL.revokeObjectURL(oldestUrl);
        } catch {}
      }
      audioCacheMap.delete(keyToEvict);
    }
  }
  audioCacheMap.set(key, url);
}

async function getOrFetchAudioUrl(text: string, voiceId: string, interviewId: string): Promise<string> {
  const clean = cleanTextForSpeech(text);
  if (!clean) return "";

  const key = `${voiceId || "default"}:${clean}`;
  let url = audioCacheMap.get(key);

  if (!url) {
    const res = await fetch(`/api/interviews/${interviewId}/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: clean, voice: voiceId }),
    });

    if (!res.ok) {
      throw new Error(`TTS API failed with status ${res.status}`);
    }

    const blob = await res.blob();
    url = URL.createObjectURL(blob);
    setInAudioCache(key, url);
  }

  return url;
}

/**
 * Utility to speak test audio for pre-interview check.
 * Caches the generated audio blob by voiceId & text so subsequent test clicks require ZERO API calls.
 */
export async function speakTestBackend(text: string, voiceId: string, interviewId: string, onEnd?: () => void, onError?: () => void) {
  try {
    const url = await getOrFetchAudioUrl(text, voiceId, interviewId);
    if (!url) return null;
    const audio = new Audio(url);
    audio.playbackRate = await getActiveTtsSpeed();
    
    audio.onended = () => {
      if (onEnd) onEnd();
    };
    audio.onerror = () => {
      if (onError) onError();
    };
    
    await audio.play();
    return audio;
  } catch (e) {
    console.error("Test audio error:", e);
    if (onError) onError();
    return null;
  }
}

/**
 * Utility to speak a single string via backend TTS.
 * Useful for one-off messages (e.g. welcome message).
 */
export async function speakBackend(text: string, interviewId: string, onEnd?: () => void, onError?: () => void) {
  try {
    const selectedVoiceId = useInterviewStore.getState().selectedVoiceId || "af_heart";
    const url = await getOrFetchAudioUrl(text, selectedVoiceId, interviewId);
    if (!url) return null;
    const audio = new Audio(url);
    audio.playbackRate = await getActiveTtsSpeed();
    
    audio.onended = () => {
      if (onEnd) onEnd();
    };
    audio.onerror = () => {
      if (onError) onError();
    };
    
    await audio.play();
    return audio;
  } catch (e) {
    console.error("Speak backend error:", e);
    if (onError) onError();
    return null;
  }
}

interface UseTTSResult {
  bufferToken: (token: string) => void;
  flushAndFinish: () => void;
  resetTTS: () => void;
  stopAll: () => void;
}

export function useTTS(): UseTTSResult {
  const sentenceBufferRef = useRef<string>("");
  const ttsQueueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef<boolean>(false);
  const isDoneStreamingRef = useRef<boolean>(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  /**
   * Stop currently playing audio.
   */
  const stopSpeaking = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.src = "";
      currentAudioRef.current = null;
      activeAudioUrl = null;
    }
  }, []);

  /**
   * Speak sentences from the queue one at a time with Gapless Pre-fetching.
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
        activeAudioUrl = null;
      }
      return;
    }

    const sentence = ttsQueueRef.current.shift()!;
    isSpeakingRef.current = true;

    const store = useInterviewStore.getState();
    const interviewId = store.interviewId;
    const selectedVoiceId = store.selectedVoiceId || "af_heart";

    try {
      if (!interviewId) throw new Error("No interviewId active");
      store.setAIState("speaking");

      if (selectedVoiceId.startsWith("local_")) {
        const { speak } = await import("@/hooks/use-web-speech");
        const gender = selectedVoiceId === "local_female" ? "female" : "male";
        
        const voices = typeof window !== "undefined" ? window.speechSynthesis.getVoices() : [];
        const matchedVoice = voices.find(v => {
          const nameLower = v.name.toLowerCase();
          const isFemale = nameLower.includes("female") || nameLower.includes("zira") || nameLower.includes("samantha") || nameLower.includes("hazel") || nameLower.includes("siri");
          return gender === "female" ? isFemale : !isFemale;
        });

        speak(sentence, {
          rate: await getActiveTtsSpeed(),
          voiceName: matchedVoice?.name || null,
          onEnd: () => {
            isSpeakingRef.current = false;
            currentAudioRef.current = null;
            activeAudioUrl = null;
            processNext();
          },
          onError: () => {
            isSpeakingRef.current = false;
            currentAudioRef.current = null;
            activeAudioUrl = null;
            processNext();
          }
        });
        return;
      }

      const url = await getOrFetchAudioUrl(sentence, selectedVoiceId, interviewId);
      if (!url) {
        isSpeakingRef.current = false;
        activeAudioUrl = null;
        processNext();
        return;
      }

      // Track currently playing/active audio URL
      activeAudioUrl = url;

      // 🚀 GAPLESS PRE-FETCHING: If more sentences are queued, pre-fetch the next sentence in background!
      if (ttsQueueRef.current.length > 0) {
        const nextSentence = ttsQueueRef.current[0];
        getOrFetchAudioUrl(nextSentence, selectedVoiceId, interviewId).catch(() => {});
      }

      const audio = new Audio(url);
      audio.playbackRate = await getActiveTtsSpeed();
      currentAudioRef.current = audio;

      audio.onended = () => {
        isSpeakingRef.current = false;
        currentAudioRef.current = null;
        activeAudioUrl = null;
        processNext();
      };

      audio.onerror = () => {
        console.error("Audio playback error");
        isSpeakingRef.current = false;
        currentAudioRef.current = null;
        activeAudioUrl = null;
        processNext();
      };

      await audio.play();
    } catch (e) {
      console.error("TTS fetch/play error:", e);
      isSpeakingRef.current = false;
      activeAudioUrl = null;
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
