"use client";

import { create } from "zustand";
import type { AIState, InterviewMode, MessageRole } from "@/types";

// ─── Store Types ─────────────────────────────

export type LayoutMode = "horizontal" | "vertical";

export interface TranscriptMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
}

// ─── Layout Persistence ──────────────────────

const LAYOUT_STORAGE_KEY = "algopilot_layout_prefs";

interface LayoutPrefs {
  layoutMode: LayoutMode;
  showProblem: boolean;
  showAIPanel: boolean;
  editorSplitPercent: number;
  problemSplitPercent: number;
}

function loadLayoutPrefs(): LayoutPrefs {
  if (typeof window === "undefined") {
    return {
      layoutMode: "horizontal",
      showProblem: true,
      showAIPanel: true,
      editorSplitPercent: 70,
      problemSplitPercent: 40,
    };
  }
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as LayoutPrefs;
  } catch { /* ignore */ }
  return {
    layoutMode: "horizontal",
    showProblem: true,
    showAIPanel: true,
    editorSplitPercent: 70,
    problemSplitPercent: 40,
  };
}

function saveLayoutPrefs(prefs: LayoutPrefs) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(prefs));
  } catch { /* ignore */ }
}

// ─── State Interface ─────────────────────────

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
  selectedVoiceId: string | null;
  sttLanguage: string;

  // Streaming lock — prevents new requests while one is active
  isStreaming: boolean;

  // Layout
  layoutMode: LayoutMode;
  showProblem: boolean;
  showAIPanel: boolean;
  editorSplitPercent: number; // % of width for editor panel (horizontal)
  problemSplitPercent: number; // % of height for problem panel

  // Hints
  hintsUsed: number;

  // Autosave
  saveStatus: "idle" | "saving" | "saved" | "error";

  // Actions
  initInterview: (data: {
    interviewId: string;
    language: string;
    difficulty: string;
    duration: number;
    problemTitle: string;
    problemDescription: string;
    code: string;
    status?: InterviewState["status"];
    timeRemainingSeconds?: number;
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
  setSelectedVoiceId: (id: string | null) => void;
  setSttLanguage: (lang: string) => void;
  setIsStreaming: (streaming: boolean) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  setShowProblem: (show: boolean) => void;
  setShowAIPanel: (show: boolean) => void;
  setEditorSplitPercent: (percent: number) => void;
  setProblemSplitPercent: (percent: number) => void;
  useHint: () => void;
  setSaveStatus: (status: InterviewState["saveStatus"]) => void;
  reset: () => void;
}

// ─── Initial State ───────────────────────────

const layoutPrefs = loadLayoutPrefs();

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
  selectedVoiceId: null as string | null,
  sttLanguage: "en-US",
  isStreaming: false,
  layoutMode: layoutPrefs.layoutMode,
  showProblem: layoutPrefs.showProblem,
  showAIPanel: layoutPrefs.showAIPanel,
  editorSplitPercent: layoutPrefs.editorSplitPercent,
  problemSplitPercent: layoutPrefs.problemSplitPercent,
  hintsUsed: 0,
  saveStatus: "idle" as const,
};

// ─── Store ───────────────────────────────────

export const useInterviewStore = create<InterviewState>((set, get) => ({
  ...initialState,

  initInterview: (data) =>
    set({
      interviewId: data.interviewId,
      status: data.status || "setup",
      language: data.language,
      difficulty: data.difficulty,
      duration: data.duration,
      problemTitle: data.problemTitle,
      problemDescription: data.problemDescription,
      code: data.code,
      timeRemainingSeconds: data.timeRemainingSeconds ?? data.duration * 60,
      timerActive: data.status === "in_progress",
      messages: [],
      aiState: "idle",
      hintsUsed: 0,
      saveStatus: "idle",
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

  setSelectedVoiceId: (selectedVoiceId) => set({ selectedVoiceId }),

  setSttLanguage: (sttLanguage) => set({ sttLanguage }),

  setIsStreaming: (isStreaming) => set({ isStreaming }),

  // Layout actions — persist to localStorage
  setLayoutMode: (layoutMode) => {
    set({ layoutMode });
    const s = get();
    saveLayoutPrefs({
      layoutMode,
      showProblem: s.showProblem,
      showAIPanel: s.showAIPanel,
      editorSplitPercent: s.editorSplitPercent,
      problemSplitPercent: s.problemSplitPercent,
    });
  },

  setShowProblem: (showProblem) => {
    set({ showProblem });
    const s = get();
    saveLayoutPrefs({
      layoutMode: s.layoutMode,
      showProblem,
      showAIPanel: s.showAIPanel,
      editorSplitPercent: s.editorSplitPercent,
      problemSplitPercent: s.problemSplitPercent,
    });
  },

  setShowAIPanel: (showAIPanel) => {
    set({ showAIPanel });
    const s = get();
    saveLayoutPrefs({
      layoutMode: s.layoutMode,
      showProblem: s.showProblem,
      showAIPanel,
      editorSplitPercent: s.editorSplitPercent,
      problemSplitPercent: s.problemSplitPercent,
    });
  },

  setEditorSplitPercent: (editorSplitPercent) => {
    set({ editorSplitPercent });
    const s = get();
    saveLayoutPrefs({
      layoutMode: s.layoutMode,
      showProblem: s.showProblem,
      showAIPanel: s.showAIPanel,
      editorSplitPercent,
      problemSplitPercent: s.problemSplitPercent,
    });
  },

  setProblemSplitPercent: (problemSplitPercent) => {
    set({ problemSplitPercent });
    const s = get();
    saveLayoutPrefs({
      layoutMode: s.layoutMode,
      showProblem: s.showProblem,
      showAIPanel: s.showAIPanel,
      editorSplitPercent: s.editorSplitPercent,
      problemSplitPercent,
    });
  },

  useHint: () => set((state) => ({ hintsUsed: state.hintsUsed + 1 })),

  setSaveStatus: (saveStatus) => set({ saveStatus }),

  reset: () => set(initialState),
}));
