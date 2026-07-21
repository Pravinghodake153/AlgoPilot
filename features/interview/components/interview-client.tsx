"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useInterviewStore, type TranscriptMessage } from "@/features/interview/store/interview-store";
import { ProblemPanel } from "./problem-panel";
import { ConversationPanel } from "./conversation-panel";
import { TextInput } from "./text-input";
import { VoiceControls } from "./voice-controls";
import { AIAvatar } from "./ai-avatar";
import { InterviewNav } from "./interview-nav";
import { CodeEditor } from "@/features/editor/components/code-editor";
import { EditorControls } from "@/features/editor/components/editor-controls";
import { VoiceInput } from "./voice-input";
import { HintButton } from "./hint-button";
import { InterviewLobby } from "./interview-lobby";
import { WarningToast } from "./warning-toast";
import { CameraPreview } from "./camera-preview";
import { ResizableSplitter } from "@/components/resizable-splitter";
import { useChatStream } from "@/hooks/use-chat-stream";
import { useTTS } from "@/hooks/use-tts";
import { useTabSwitchDetection } from "@/hooks/use-tab-switch-detection";
import { useFaceDetection } from "@/hooks/use-face-detection";

import { useRouter } from "next/navigation";
import { speakBackend } from "@/hooks/use-tts";

interface InterviewClientProps {
  interview: {
    id: string;
    language: string;
    difficulty: string;
    duration: number;
    status: string;
    problemTitle: string;
    problemDescription: string;
    code: string;
    tabSwitchCount?: number;
    outOfFrameCount?: number;
    startedAt: number | null;
  };
  existingMessages: TranscriptMessage[];
}

/**
 * Main interview layout — flexible, resizable panels.
 * Supports horizontal (side-by-side) and vertical (stacked) layouts.
 * Panels (problem, AI chat) are collapsible for a minimal interview experience.
 *
 * KEY ARCHITECTURE: useChatStream and useTTS hooks live HERE so they
 * never unmount during mode switches. Both TextInput and VoiceInput
 * are always mounted (hidden via CSS) to prevent remount issues.
 */
export function InterviewClient({
  interview,
  existingMessages,
}: InterviewClientProps) {
  const router = useRouter();
  const initInterview = useInterviewStore((s) => s.initInterview);
  const mode = useInterviewStore((s) => s.mode);
  const status = useInterviewStore((s) => s.status);
  const layoutMode = useInterviewStore((s) => s.layoutMode);
  const showProblem = useInterviewStore((s) => s.showProblem);
  const showAIPanel = useInterviewStore((s) => s.showAIPanel);
  const editorSplitPercent = useInterviewStore((s) => s.editorSplitPercent);
  const problemSplitPercent = useInterviewStore((s) => s.problemSplitPercent);
  const setEditorSplitPercent = useInterviewStore((s) => s.setEditorSplitPercent);
  const setProblemSplitPercent = useInterviewStore((s) => s.setProblemSplitPercent);

  const setStatus = useInterviewStore((s) => s.setStatus);
  const setTimerActive = useInterviewStore((s) => s.setTimerActive);
  const [lobbyCompleted, setLobbyCompleted] = useState(false);

  // ─── Proctoring: Tab Switch Detection ─────
  const isInterviewActive = status === "in_progress" && lobbyCompleted;
  const {
    tabSwitchCount,
    showWarning: showTabWarning,
    warningMessage: tabWarningMessage,
    dismissWarning: dismissTabWarning,
  } = useTabSwitchDetection({
    enabled: isInterviewActive,
    interviewId: interview.id,
    initialCount: interview.tabSwitchCount ?? 0,
  });

  const {
    showWarning: showFaceWarning,
    warningMessage: faceWarningMessage,
    outOfFrameCount,
    stream: cameraStream,
    dismissWarning: dismissFaceWarning,
  } = useFaceDetection({
    enabled: isInterviewActive,
    interviewId: interview.id,
    initialCount: interview.outOfFrameCount ?? 0,
    intervalMs: 500,
    missThreshold: 1,
    mode: mode,
  });

  // ─── Centralized TTS Hook ──────────────────
  const { bufferToken, flushAndFinish, resetTTS, stopAll: stopTTS } = useTTS();

  // ─── Centralized Chat Stream Hook ──────────
  const streamCallbacks = useMemo(
    () => ({
      onToken: (token: string, isReasoning?: boolean) => {
        // Buffer tokens for TTS (skip reasoning tokens)
        if (!isReasoning) {
          bufferToken(token);
        }
      },
      onDone: (_fullText: string) => {
        // Flush remaining TTS buffer and let TTS handle state transition
        flushAndFinish();
      },
      onError: (_err: Error) => {
        // Stop TTS on error — forceRecovery in the hook handles aiState
        stopTTS();
      },
    }),
    [bufferToken, flushAndFinish, stopTTS]
  );

  const { sendMessage, stopGeneration } = useChatStream(streamCallbacks);

  // Stable sendMessage for child components
  const handleSendMessage = useCallback(
    (text: string) => {
      resetTTS(); // Clear any previous TTS state
      sendMessage(text);
    },
    [sendMessage, resetTTS]
  );

  const handleStopGeneration = useCallback(() => {
    stopGeneration();
    resetTTS();
  }, [stopGeneration, resetTTS]);

  // Redirect to report page when interview is completed
  useEffect(() => {
    if (status === "completed") {
      router.push(`/report/${interview.id}`);
    }
  }, [status, interview.id, router]);

  // Initialize the store on mount
  useEffect(() => {
    let computedTime: number | undefined = undefined;
    if (interview.startedAt && interview.status === "in_progress") {
      const elapsedMs = Date.now() - interview.startedAt;
      const totalMs = interview.duration * 60 * 1000;
      computedTime = Math.max(0, Math.floor((totalMs - elapsedMs) / 1000));
    } else if (interview.status === "setup") {
      computedTime = interview.duration * 60;
    }

    const isResuming = existingMessages.length > 0;

    initInterview({
      interviewId: interview.id,
      language: interview.language,
      difficulty: interview.difficulty,
      duration: interview.duration,
      problemTitle: interview.problemTitle,
      problemDescription: interview.problemDescription,
      code: interview.code,
      status: isResuming ? "in_progress" : "setup",
      timeRemainingSeconds: computedTime,
    });

    // Restore existing messages
    if (isResuming) {
      useInterviewStore.setState({ messages: existingMessages });
    }

    return () => {
      stopTTS();
      useInterviewStore.getState().reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle start/resume when lobby finishes
  const handleLobbyReady = (interviewStyle: string = "Standard") => {
    setLobbyCompleted(true);
    setStatus("in_progress");
    setTimerActive(true);

    // Prime speech synthesis on user gesture
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        const prime = new SpeechSynthesisUtterance("");
        window.speechSynthesis.speak(prime);
      } catch (e) {
        console.error("Failed to prime SpeechSynthesis:", e);
      }
    }

    if (existingMessages.length === 0) {
      // Auto-start: get AI's opening message
      async function startInterview() {
        const currentStore = useInterviewStore.getState();
        const selectedVoiceId = currentStore.selectedVoiceId;
        const isFemale = selectedVoiceId && (selectedVoiceId.startsWith("af_") || selectedVoiceId.startsWith("if_") || selectedVoiceId.startsWith("bf_"));
        const interviewerName = isFemale ? "Nova" : "Alex";

        try {
          const res = await fetch(`/api/interviews/${interview.id}/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ voiceId: selectedVoiceId, interviewStyle }),
          });
          if (!res.ok) {
            throw new Error(`Failed to start interview: ${res.statusText}`);
          }

          const data = await res.json();
          useInterviewStore.getState().addMessage("assistant", data.message);

          if (!currentStore.isSpeakerMuted) {
            currentStore.setAIState("speaking");
            speakBackend(data.message, interview.id, () => {
              const s = useInterviewStore.getState();
              if (s.mode === "voice") {
                s.setAIState("listening");
              } else {
                s.setAIState("idle");
              }
            }, () => {
              const s = useInterviewStore.getState();
              if (s.mode === "voice") {
                s.setAIState("listening");
              } else {
                s.setAIState("idle");
              }
            });
          }
        } catch (error) {
          console.error("Failed to start interview:", error);
          const fallbackMsg = `Hi, I'm ${interviewerName}. Welcome to your ${interview.difficulty} coding interview. Take a moment to read the problem, and when you're ready, share your initial thoughts.`;
          useInterviewStore.getState().addMessage("assistant", fallbackMsg);

          if (!currentStore.isSpeakerMuted) {
            currentStore.setAIState("speaking");
            speakBackend(fallbackMsg, interview.id, () => {
              const s = useInterviewStore.getState();
              if (s.mode === "voice") {
                s.setAIState("listening");
              } else {
                s.setAIState("idle");
              }
            }, () => {
              const s = useInterviewStore.getState();
              if (s.mode === "voice") {
                s.setAIState("listening");
              } else {
                s.setAIState("idle");
              }
            });
          }
        }
      }
      startInterview();
    }
  };

  // ─── Editor Panel (problem + code editor + controls) ──────

  const editorPanel = (
    <div className={`flex flex-1 overflow-hidden ${layoutMode === "horizontal" ? "flex-row" : "flex-col"}`}>
      {/* Problem description — collapsible */}
      {showProblem && (
        <>
          <div
            className={`overflow-auto border-border ${layoutMode === "horizontal" ? "border-r" : "border-b"}`}
            style={
              layoutMode === "horizontal"
                ? { width: `${problemSplitPercent}%` }
                : { height: `${problemSplitPercent}%` }
            }
          >
            <ProblemPanel />
          </div>
          <ResizableSplitter
            splitPercent={problemSplitPercent}
            onResize={setProblemSplitPercent}
            direction={layoutMode === "horizontal" ? "horizontal" : "vertical"}
            minFirst={15}
            maxFirst={60}
          />
        </>
      )}

      {/* Monaco Code Editor */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <CodeEditor />

        {/* Run Code + Submit + Hint + Console */}
        <EditorControls>
          <HintButton />
        </EditorControls>
      </div>
    </div>
  );

  // ─── AI Panel (avatar, transcript, input) ─────────────────

  const aiPanel = showAIPanel ? (
    <div className="flex flex-col overflow-hidden" style={{ width: `${100 - editorSplitPercent}%` }}>
      {/* AI Avatar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <AIAvatar />
      </div>

      {/* Conversation Transcript */}
      <ConversationPanel />

      {/* Input Controls — BOTH always mounted, toggled via CSS */}
      {status === "in_progress" && (
        <>
          <div style={{ display: mode === "text" ? "block" : "none" }}>
            <TextInput sendMessage={handleSendMessage} stopGeneration={handleStopGeneration} />
          </div>
          <div style={{ display: mode === "voice" ? "block" : "none" }}>
            <VoiceInput sendMessage={handleSendMessage} stopGeneration={handleStopGeneration} />
          </div>
          <VoiceControls />
        </>
      )}

      {/* Completed state */}
      {status === "completed" && (
        <div className="flex items-center justify-center border-t border-border px-4 py-4">
          <p className="text-sm text-muted-foreground">
            Interview ended. Generating report...
          </p>
        </div>
      )}
    </div>
  ) : null;

  // ─── Floating chat bubble when AI panel is hidden ─────────

  const unreadBubble = !showAIPanel ? (
    <button
      onClick={() => useInterviewStore.getState().setShowAIPanel(true)}
      className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg hover:bg-blue-600 transition-colors cursor-pointer"
      aria-label="Show AI panel"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  ) : null;

  if (!lobbyCompleted) {
    return <InterviewLobby onReady={handleLobbyReady} />;
  }

  // ─── Layout Render ────────────────────────────────────────

  return (
    <div className="flex h-screen flex-col">
      {/* Top Navigation */}
      <InterviewNav />

      {/* Proctoring Warning Toasts */}
      <WarningToast
        message={tabWarningMessage}
        isVisible={showTabWarning}
        onDismiss={dismissTabWarning}
        durationMs={5000}
      />
      <WarningToast
        message={faceWarningMessage}
        isVisible={showFaceWarning && !showTabWarning}
        onDismiss={dismissFaceWarning}
        durationMs={5000}
      />

      {/* Camera Preview Floating Window */}
      {isInterviewActive && <CameraPreview stream={cameraStream} />}

      {/* Proctoring Status Indicator */}
      {isInterviewActive && (tabSwitchCount > 0 || outOfFrameCount > 0) && (
        <div className="flex items-center justify-center gap-4 bg-red-500/10 border-b border-red-500/20 px-4 py-1.5 text-xs text-red-400">
          {tabSwitchCount > 0 && (
            <span className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              Tab switches: {tabSwitchCount}
            </span>
          )}
          {outOfFrameCount > 0 && (
            <span className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Out of frame: {outOfFrameCount}
            </span>
          )}
        </div>
      )}

      {/* Main Content (Always Editor on Left, AI on Right) */}
      <div className="flex flex-1 overflow-hidden">
        <div
          className="flex flex-col overflow-hidden border-r border-border"
          style={{ width: showAIPanel ? `${editorSplitPercent}%` : "100%" }}
        >
          {editorPanel}
        </div>

        {showAIPanel && (
          <ResizableSplitter
            splitPercent={editorSplitPercent}
            onResize={setEditorSplitPercent}
            direction="horizontal"
            minFirst={40}
            maxFirst={85}
          />
        )}

        {aiPanel}
      </div>

      {/* Floating bubble when AI panel is hidden */}
      {unreadBubble}
    </div>
  );
}

