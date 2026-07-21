"use client";

import { useEffect, useRef } from "react";
import { useInterviewStore } from "@/features/interview/store/interview-store";

import { MessageContent } from "./message-content";/**
 * Live conversation transcript panel.
 * Auto-scrolls to latest message.
 * Shows typing indicator when AI is thinking.
 * Professional styling — NOT WhatsApp/Discord bubbles per UI/UX spec.
 */
export function ConversationPanel() {
  const messages = useInterviewStore((s) => s.messages);
  const aiState = useInterviewStore((s) => s.aiState);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or when typing starts
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, aiState]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto"
    >
      {messages.length === 0 && aiState !== "thinking" ? (
        <div className="flex h-full items-center justify-center px-4">
          <p className="text-sm text-muted-foreground/50">
            The interview will begin shortly...
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`transcript-message ${
                msg.role === "assistant"
                  ? "bg-transparent"
                  : "bg-secondary/30"
              }`}
            >
              {/* Role label */}
              <span
                className={`text-xs font-medium ${
                  msg.role === "assistant"
                    ? "text-blue-400"
                    : "text-emerald-400"
                }`}
              >
                {msg.role === "assistant" ? "Interviewer" : "You"}
              </span>
              {/* Content */}
              <MessageContent content={msg.content} />
            </div>
          ))}

          {/* Typing indicator when AI is thinking */}
          {aiState === "thinking" && (
            <div className="transcript-message bg-transparent">
              <span className="text-xs font-medium text-blue-400">
                Interviewer
              </span>
              <div className="mt-2 flex items-center gap-1">
                <span
                  className="inline-block h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce"
                  style={{ animationDelay: "0ms", animationDuration: "600ms" }}
                />
                <span
                  className="inline-block h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce"
                  style={{ animationDelay: "150ms", animationDuration: "600ms" }}
                />
                <span
                  className="inline-block h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce"
                  style={{ animationDelay: "300ms", animationDuration: "600ms" }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
