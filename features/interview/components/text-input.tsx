"use client";

import { useState, useRef, useCallback } from "react";
import { useInterviewStore } from "@/features/interview/store/interview-store";


/**
 * Text input for sending messages to the AI interviewer.
 * Supports Enter to send, Shift+Enter for newline.
 *
 * All streaming/fetch logic is centralized in the parent via useChatStream.
 * This component only handles the textarea UI.
 */
interface TextInputProps {
  sendMessage: (text: string) => void;
}

export function TextInput({ sendMessage }: TextInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const aiState = useInterviewStore((s) => s.aiState);
  const status = useInterviewStore((s) => s.status);
  const isStreaming = useInterviewStore((s) => s.isStreaming);

  const isDisabled = status !== "in_progress" || isStreaming || aiState === "thinking";

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isDisabled) return;

    sendMessage(trimmed);
    setInput("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input, isDisabled, sendMessage]);

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
            : isStreaming
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
