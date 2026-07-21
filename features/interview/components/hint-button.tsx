"use client";

import { useCallback } from "react";
import { useInterviewStore } from "@/features/interview/store/interview-store";
import { readSSEStream } from "@/lib/sse-utils";

/**
 * Hint button — allows candidates to request a hint from the AI interviewer.
 * Shows "Hints used: N" counter. Each hint affects the final score.
 * Sends a special context message to the AI so it provides a directed hint.
 */
export function HintButton() {
  const interviewId = useInterviewStore((s) => s.interviewId);
  const status = useInterviewStore((s) => s.status);
  const aiState = useInterviewStore((s) => s.aiState);
  const hintsUsed = useInterviewStore((s) => s.hintsUsed);
  const consumeHint = useInterviewStore((s) => s.useHint);
  const setAIState = useInterviewStore((s) => s.setAIState);
  const code = useInterviewStore((s) => s.code);
  const timeRemainingSeconds = useInterviewStore((s) => s.timeRemainingSeconds);

  const isDisabled =
    status !== "in_progress" ||
    aiState === "thinking" ||
    aiState === "speaking";

  const handleRequestHint = useCallback(async () => {
    if (!interviewId || isDisabled) return;

    consumeHint();
    setAIState("thinking");

    // Add a user message indicating the hint request
    useInterviewStore.getState().addMessage(
      "user",
      `[Hint requested (${hintsUsed + 1} used)]`
    );

    let isTimeout = false;
    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | undefined;
    const resetTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        isTimeout = true;
        controller.abort();
        try {
          await fetch(`/api/interviews/${interviewId}/log-error`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              errorType: "TIMEOUT",
              message: "Hint request timed out after 10 minutes of inactivity",
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
          message: `[CANDIDATE REQUESTED A HINT — This is hint #${hintsUsed + 1}. Give a small, targeted hint to help them make progress. Do not give the solution. The hint should nudge them toward the right data structure, algorithm, or approach.]`,
          code,
          timeRemainingSeconds,
        }),
      });

      if (!response.ok) throw new Error("Failed to get hint");

      // Add placeholder message
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

      await readSSEStream(
        response,
        // onToken
        (token) => {
          resetTimeout();
          useInterviewStore.setState((state) => ({
            messages: state.messages.map((m) =>
              m.id === msgId ? { ...m, content: m.content + token } : m
            ),
          }));
        },
        // onDone
        (fullText) => {
          clearTimeout(timeoutId);
          useInterviewStore.setState((state) => ({
            messages: state.messages.map((m) =>
              m.id === msgId ? { ...m, content: fullText } : m
            ),
          }));
          setAIState("idle");
        },
        // onError
        (err) => {
          clearTimeout(timeoutId);
          console.error("Hint stream error:", err);
          const errMsg = isTimeout
            ? "We encountered an error. Please try again."
            : "I encountered a connection issue while generating the hint. Please try again.";
          useInterviewStore.setState((state) => ({
            messages: state.messages.map((m) =>
              m.id === msgId
                ? { ...m, content: errMsg }
                : m
            ),
          }));
          setAIState("idle");
        }
      );
    } catch (err) {
      clearTimeout(timeoutId);
      const errMsg = isTimeout
        ? "We encountered an error. Please try again."
        : "I'd suggest thinking about what data structure would help you solve this efficiently. Consider the time complexity requirements.";
      useInterviewStore.getState().addMessage("assistant", errMsg);
      setAIState("idle");
    }
  }, [interviewId, isDisabled, hintsUsed, consumeHint, setAIState, code, timeRemainingSeconds]);

  if (status !== "in_progress") return null;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleRequestHint}
        disabled={isDisabled}
        className="inline-flex h-7 items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 text-[11px] font-medium text-amber-400 transition-colors hover:bg-amber-500/20 disabled:opacity-40 cursor-pointer"
        title="Request a hint (affects your score)"
      >
        {/* Lightbulb icon */}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
          <path d="M9 18h6" />
          <path d="M10 22h4" />
        </svg>
        Get Hint
      </button>

      {hintsUsed > 0 && (
        <span className="text-[10px] text-amber-400/70">
          {hintsUsed} used
        </span>
      )}
    </div>
  );
}
