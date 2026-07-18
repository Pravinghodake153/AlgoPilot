"use client";

import { useEffect } from "react";
import { useInterviewStore, type TranscriptMessage } from "@/features/interview/store/interview-store";
import { ProblemPanel } from "./problem-panel";
import { ConversationPanel } from "./conversation-panel";
import { TextInput } from "./text-input";
import { VoiceControls } from "./voice-controls";
import { AIAvatar } from "./ai-avatar";
import { Timer } from "./timer";
import { InterviewNav } from "./interview-nav";
import { CodeEditor } from "@/features/editor/components/code-editor";
import { EditorControls } from "@/features/editor/components/editor-controls";
import { VoiceInput } from "./voice-input";

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
  };
  existingMessages: TranscriptMessage[];
}

/**
 * Main interview layout — 70/30 split.
 * Left: Problem description + Monaco code editor
 * Right: AI interviewer panel (avatar, transcript, controls)
 *
 * Per UI/UX spec:
 * - Left panel (editor + problem): 70%
 * - Right panel (AI interviewer): 30%
 * - Allow the divider to be resizable.
 * - The coding editor should always be the primary focus.
 */
export function InterviewClient({
  interview,
  existingMessages,
}: InterviewClientProps) {
  const initInterview = useInterviewStore((s) => s.initInterview);
  const mode = useInterviewStore((s) => s.mode);
  const status = useInterviewStore((s) => s.status);

  // Initialize the store on mount
  useEffect(() => {
    initInterview({
      interviewId: interview.id,
      language: interview.language,
      difficulty: interview.difficulty,
      duration: interview.duration,
      problemTitle: interview.problemTitle,
      problemDescription: interview.problemDescription,
      code: interview.code,
    });

    // Restore existing messages
    if (existingMessages.length > 0) {
      useInterviewStore.setState({ messages: existingMessages });
    } else {
      // Auto-start: get AI's opening message
      async function startInterview() {
        try {
          const res = await fetch(`/api/interviews/${interview.id}/start`, {
            method: "POST",
          });
          if (res.ok) {
            const data = await res.json();
            useInterviewStore.getState().addMessage("assistant", data.message);
          }
        } catch (error) {
          console.error("Failed to start interview:", error);
          useInterviewStore
            .getState()
            .addMessage(
              "assistant",
              `Hi, I'm Alex. Welcome to your ${interview.difficulty} coding interview. Take a moment to read the problem, and when you're ready, share your initial thoughts.`
            );
        }
      }
      startInterview();
    }

    return () => {
      useInterviewStore.getState().reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen flex-col">
      {/* Top Navigation */}
      <InterviewNav />

      {/* Main Content — 70/30 split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel (70%) — Problem + Editor */}
        <div className="flex w-[70%] flex-col border-r border-border">
          {/* Problem description */}
          <div className="h-[40%] overflow-y-auto border-b border-border">
            <ProblemPanel />
          </div>

          {/* Monaco Code Editor */}
          <CodeEditor />

          {/* Run Code + Submit + Console */}
          <EditorControls />
        </div>

        {/* Right Panel (30%) — AI Interviewer */}
        <div className="flex w-[30%] flex-col">
          {/* AI Avatar + Timer */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <AIAvatar />
            <Timer />
          </div>

          {/* Conversation Transcript */}
          <ConversationPanel />

          {/* Input Controls */}
          {status === "in_progress" && (
            <>
              {mode === "text" && <TextInput />}
              {mode === "voice" && <VoiceInput />}
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
      </div>
    </div>
  );
}
