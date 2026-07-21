"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useInterviewStore } from "@/features/interview/store/interview-store";
import { readSSEStream } from "@/lib/sse-utils";


/**
 * Text input for sending messages to the AI interviewer.
 * Supports Enter to send, Shift+Enter for newline.
 * Reads streaming SSE responses for real-time display.
 */
export function TextInput() {
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      useInterviewStore.getState().setAIState("idle");
    };
  }, []);

  const [input, setInput] = useState("");
  const [lastExecResult, setLastExecResult] = useState<Record<string, unknown> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamingMsgIdRef = useRef<string | null>(null);
  const addMessage = useInterviewStore((s) => s.addMessage);
  const aiState = useInterviewStore((s) => s.aiState);
  const status = useInterviewStore((s) => s.status);
  const setAIState = useInterviewStore((s) => s.setAIState);
  const interviewId = useInterviewStore((s) => s.interviewId);
  const code = useInterviewStore((s) => s.code);
  const timeRemainingSeconds = useInterviewStore((s) => s.timeRemainingSeconds);

  const isDisabled = status !== "in_progress" || aiState === "thinking";

  // Listen for code execution results via custom event
  useEffect(() => {
    function handleExecResult(e: CustomEvent) {
      setLastExecResult(e.detail);
    }
    window.addEventListener("code-execution-result", handleExecResult as EventListener);
    return () => window.removeEventListener("code-execution-result", handleExecResult as EventListener);
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isDisabled || !interviewId) return;

    // Add user message to transcript
    addMessage("user", trimmed);
    setInput("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Send to AI
    setAIState("thinking");

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
              message: "Text message AI response timed out after 10 minutes of inactivity",
            }),
          });
        } catch (err) {
          console.error("Failed to log timeout to DB:", err);
        }
      }, 600000);
    };

    resetTimeout();

    try {
      // 1. Initialize chat and get conversation history
      const initRes = await fetch(`/api/interviews/${interviewId}/chat-init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: trimmed,
          code,
          executionResult: lastExecResult,
          timeRemainingSeconds,
        }),
      });

      if (!initRes.ok) {
        throw new Error("Failed to initialize chat");
      }

      const { conversationHistory } = await initRes.json();

      // 2. Stream AI response from Edge route
      const response = await fetch(`/api/interviews/${interviewId}/chat-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get stream response");
      }

      // Create a placeholder message for streaming
      const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      streamingMsgIdRef.current = msgId;

      // Add empty assistant message that we'll update as tokens arrive
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
        // onToken: update the message content incrementally
        (token) => {
          resetTimeout();
          useInterviewStore.setState((state) => ({
            messages: state.messages.map((m) =>
              m.id === msgId ? { ...m, content: m.content + token } : m
            ),
          }));
        },
        // onDone: finalize
        async (fullText) => {
          clearTimeout(timeoutId);
          // Ensure the message has the complete text
          useInterviewStore.setState((state) => ({
            messages: state.messages.map((m) =>
              m.id === msgId ? { ...m, content: fullText } : m
            ),
          }));
          streamingMsgIdRef.current = null;
          setLastExecResult(null);
          setAIState("idle");

          // Save AI message to DB
          try {
            await fetch(`/api/interviews/${interviewId}/messages`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                role: "assistant",
                content: fullText,
              }),
            });
          } catch (e) {
            console.error("Failed to save AI message:", e);
          }
        },
        // onError
        (err) => {
          clearTimeout(timeoutId);
          console.error("Stream error:", err);
          const errMsg = isTimeout
            ? "We encountered an error. Please try again."
            : "Sorry, I encountered a connection issue. Could you repeat that?";
          useInterviewStore.setState((state) => ({
            messages: state.messages.map((m) =>
              m.id === msgId
                ? { ...m, content: errMsg }
                : m
            ),
          }));
          streamingMsgIdRef.current = null;
          if (isMountedRef.current) {
            setAIState("idle");
          }
        }
      );
    } catch (err) {
      clearTimeout(timeoutId);
      if (!isMountedRef.current) return;
      
      const errMsg = isTimeout
        ? "We encountered an error. Please try again."
        : "Sorry, I encountered a connection issue. Could you repeat that?";
      addMessage("assistant", errMsg);
      setAIState("idle");
    }
  }, [input, isDisabled, interviewId, addMessage, setAIState, code, lastExecResult, timeRemainingSeconds]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  return (
    <div className="flex items-end gap-2 border-t border-border px-4 py-3">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={
          aiState === "thinking"
            ? "AI is thinking..."
            : aiState === "speaking"
              ? "AI is responding..."
              : isDisabled
                ? "Waiting..."
                : "Type your response..."
        }
        disabled={isDisabled}
        rows={1}
        className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-40"
      />
      <button
        onClick={handleSend}
        disabled={isDisabled || !input.trim()}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30 cursor-pointer"
        aria-label="Send message"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 2 11 13" />
          <path d="m22 2-7 20-4-9-9-4 20-7z" />
        </svg>
      </button>
    </div>
  );
}
