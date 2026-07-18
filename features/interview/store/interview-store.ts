"use client";

import { create } from "zustand";
import type { AIState, InterviewMode, MessageRole } from "@/types";

// ─── Store Types ─────────────────────────────

export interface TranscriptMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
}

interface InterviewState {
  // Interview metadata
  interviewId: string | null;
  status: "setup" | "in_progress" | "completed" | "cancelled";
  language: string;
  difficulty: string;
  duration: number; // minutes
  problemTitle: string;
  problemDescription: string;
  code: string;

  // Timer
  timeRemainingSeconds: number;
  timerActive: boolean;

  // AI state
  aiState: AIState;

  // Interaction mode
  mode: InterviewMode;

  // Transcript
  messages: TranscriptMessage[];

  // Voice
  isMicMuted: boolean;
  isSpeakerMuted: boolean;

  // Actions
  initInterview: (data: {
    interviewId: string;
    language: string;
    difficulty: string;
    duration: number;
    problemTitle: string;
    problemDescription: string;
    code: string;
  }) => void;
  setStatus: (status: InterviewState["status"]) => void;
  setCode: (code: string) => void;
  setAIState: (state: AIState) => void;
  setMode: (mode: InterviewMode) => void;
  addMessage: (role: MessageRole, content: string) => void;
  setTimeRemaining: (seconds: number) => void;
  setTimerActive: (active: boolean) => void;
  toggleMic: () => void;
  toggleSpeaker: () => void;
  reset: () => void;
}

// ─── Initial State ───────────────────────────

const initialState = {
  interviewId: null as string | null,
  status: "setup" as const,
  language: "",
  difficulty: "",
  duration: 0,
  problemTitle: "",
  problemDescription: "",
  code: "",
  timeRemainingSeconds: 0,
  timerActive: false,
  aiState: "idle" as AIState,
  mode: "text" as InterviewMode,
  messages: [] as TranscriptMessage[],
  isMicMuted: false,
  isSpeakerMuted: false,
};

// ─── Store ───────────────────────────────────

export const useInterviewStore = create<InterviewState>((set) => ({
  ...initialState,

  initInterview: (data) =>
    set({
      interviewId: data.interviewId,
      status: "in_progress",
      language: data.language,
      difficulty: data.difficulty,
      duration: data.duration,
      problemTitle: data.problemTitle,
      problemDescription: data.problemDescription,
      code: data.code,
      timeRemainingSeconds: data.duration * 60,
      timerActive: true,
      messages: [],
      aiState: "idle",
    }),

  setStatus: (status) => set({ status }),

  setCode: (code) => set({ code }),

  setAIState: (aiState) => set({ aiState }),

  setMode: (mode) => set({ mode }),

  addMessage: (role, content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          role,
          content,
          timestamp: Date.now(),
        },
      ],
    })),

  setTimeRemaining: (seconds) => set({ timeRemainingSeconds: seconds }),

  setTimerActive: (active) => set({ timerActive: active }),

  toggleMic: () => set((state) => ({ isMicMuted: !state.isMicMuted })),

  toggleSpeaker: () =>
    set((state) => ({ isSpeakerMuted: !state.isSpeakerMuted })),

  reset: () => set(initialState),
}));
