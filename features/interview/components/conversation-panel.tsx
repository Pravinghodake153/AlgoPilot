"use client";

import { useEffect, useRef } from "react";
import { useInterviewStore } from "@/features/interview/store/interview-store";

/**
 * Live conversation transcript panel.
 * Auto-scrolls to latest message.
 * Professional styling — NOT WhatsApp/Discord bubbles per UI/UX spec.
 */
export function ConversationPanel() {
  const messages = useInterviewStore((s) => s.messages);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto"
    >
      {messages.length === 0 ? (
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
              <p className="mt-1 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                {msg.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
