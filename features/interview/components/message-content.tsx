"use client";

import { useInterviewStore } from "@/features/interview/store/interview-store";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Sanitizes text for chat UI so unclosed asterisks or raw ** never show up as ugly symbols.
 */
function sanitizeChatText(text: string): string {
  if (!text) return "";
  // Fix unclosed bold asterisks or clean raw double asterisks if stray
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1") // Strip bold asterisks for clean text presentation
    .replace(/\\\*/g, "")            // Remove escaped asterisks
    .replace(/\*{2,}/g, "");         // Remove stray **
}

export function MessageContent({ content, isUser }: { content: string; isUser?: boolean }) {
  const showAiThinking = useInterviewStore((s) => s.showAiThinking);

  const textClass = isUser ? "text-emerald-100 font-medium text-[13.5px]" : "text-slate-100 font-normal text-[13.5px]";

  // Check for complete thinking format
  const completeThinkingMatch = content.match(/(?:\s*\*Thinking\.\.\.\*\s*\n)([\s\S]*?)(?:\n\s*---\s*\n)([\s\S]*)$/);
  
  if (completeThinkingMatch) {
    const answerContent = sanitizeChatText(completeThinkingMatch[2]);
    return (
      <div className="flex flex-col gap-1 mt-1">
        {showAiThinking && (
          <details key="thinking-complete" className="text-[11px] text-slate-400">
            <summary className="cursor-pointer hover:text-slate-300 select-none">Thinking Process</summary>
            <div className="mt-1 whitespace-pre-wrap pl-2 border-l border-slate-700/50 italic opacity-80 text-slate-300 text-xs">
              {completeThinkingMatch[1]}
            </div>
          </details>
        )}
        <div className={`leading-relaxed prose prose-sm dark:prose-invert max-w-none ${textClass}`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {answerContent}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  // Check for in-progress thinking format
  const thinkingInProgressMatch = content.match(/(?:\s*\*Thinking\.\.\.\*\s*\n)([\s\S]*)$/);
  if (thinkingInProgressMatch) {
    if (!showAiThinking) {
      return (
        <div className="text-xs text-muted-foreground/60 italic animate-pulse py-1">
          Thinking...
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-1 mt-1">
        <details key="thinking-progress" open className="text-[11px] text-slate-400">
          <summary className="cursor-pointer hover:text-slate-300 select-none animate-pulse">Thinking...</summary>
          <div className="mt-1 whitespace-pre-wrap pl-2 border-l border-slate-700/50 italic opacity-70 text-slate-300 text-xs">
            {thinkingInProgressMatch[1]}
          </div>
        </details>
      </div>
    );
  }

  // Regular content
  const cleanContent = sanitizeChatText(content);
  return (
    <div className={`leading-relaxed prose prose-sm dark:prose-invert max-w-none ${textClass}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {cleanContent}
      </ReactMarkdown>
    </div>
  );
}
