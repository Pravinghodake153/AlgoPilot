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
        <div className="flex flex-col gap-2 p-2">
          {messages.map((msg) => {
            const contentLower = (msg.content || "").toLowerCase();

            // Detect Hint message
            const isHintMessage =
              contentLower.includes("[hint requested") ||
              contentLower.includes("here is a hint") ||
              contentLower.includes("hint:") ||
              contentLower.includes("here's a hint");

            let containerStyle = "bg-secondary/20 shadow-sm";
            let labelColor = "text-emerald-400 font-medium";
            let roleLabel = "You";
            let IconSvg = (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            );

            if (isHintMessage) {
              containerStyle = "bg-cyan-950/30 shadow-sm";
              labelColor = "text-cyan-400 font-semibold";
              roleLabel = msg.role === "assistant" ? "Interviewer (Hint Provided)" : "You (Hint Requested)";
              IconSvg = (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
                  <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                  <path d="M9 18h6" />
                  <path d="M10 22h4" />
                </svg>
              );
            } else if (msg.role === "assistant") {
              containerStyle = "bg-slate-900/50 shadow-sm";
              labelColor = "text-blue-400 font-medium";
              roleLabel = "Interviewer";
              IconSvg = (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M9 14h6" />
                  <circle cx="9" cy="9" r="1" />
                  <circle cx="15" cy="9" r="1" />
                </svg>
              );
            } else {
              containerStyle = "bg-emerald-950/20 shadow-sm";
            }

            return (
              <div
                key={msg.id}
                className={`transcript-message p-3 rounded-lg border-none transition-all ${containerStyle}`}
              >
                {/* Header with Icon and Role Label */}
                <div className="flex items-center gap-1.5 mb-1.5">
                  {IconSvg}
                  <span className={`text-xs ${labelColor}`}>
                    {roleLabel}
                  </span>
                </div>

                {/* Content */}
                {(!msg.content || !msg.content.trim()) ? (
                  (aiState === "thinking" || aiState === "speaking") ? (
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
                  ) : (
                    <div className="mt-1 text-xs text-amber-400/90 italic flex items-center gap-1.5 py-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>[Response incomplete. Please tap Record or send your message again.]</span>
                    </div>
                  )
                ) : (
                  <MessageContent content={msg.content} isUser={msg.role === "user"} />
                )}
              </div>
            );
          })}

          {/* Typing indicator when AI is thinking (only if not already rendering inside an empty assistant message) */}
          {aiState === "thinking" &&
            !(
              messages.length > 0 &&
              messages[messages.length - 1].role === "assistant" &&
              (!messages[messages.length - 1].content ||
                !messages[messages.length - 1].content.trim())
            ) && (
              <div className="transcript-message p-3 rounded-lg border-none bg-slate-900/50 shadow-sm">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M9 14h6" />
                    <circle cx="9" cy="9" r="1" />
                    <circle cx="15" cy="9" r="1" />
                  </svg>
                  <span className="text-xs font-medium text-blue-400">
                    Interviewer
                  </span>
                </div>
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
