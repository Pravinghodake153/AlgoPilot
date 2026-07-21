"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MessageContent({ content }: { content: string }) {
  // Check for complete thinking format
  const completeThinkingMatch = content.match(/(?:\s*\*Thinking\.\.\.\*\s*\n)([\s\S]*?)(?:\n\s*---\s*\n)([\s\S]*)$/);
  
  if (completeThinkingMatch) {
    return (
      <div className="flex flex-col gap-1 mt-1">
        <details key="thinking-complete" className="text-[11px] text-slate-500">
          <summary className="cursor-pointer hover:text-slate-400 select-none">Thinking Process</summary>
          <div className="mt-1 whitespace-pre-wrap pl-2 border-l border-slate-700/50 italic opacity-80">
            {completeThinkingMatch[1]}
          </div>
        </details>
        <div className="leading-relaxed prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {completeThinkingMatch[2]}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  // Check for in-progress thinking format
  const thinkingInProgressMatch = content.match(/(?:\s*\*Thinking\.\.\.\*\s*\n)([\s\S]*)$/);
  if (thinkingInProgressMatch) {
    return (
      <div className="flex flex-col gap-1 mt-1">
        <details key="thinking-progress" open className="text-[11px] text-slate-500">
          <summary className="cursor-pointer hover:text-slate-400 select-none animate-pulse">Thinking...</summary>
          <div className="mt-1 whitespace-pre-wrap pl-2 border-l border-slate-700/50 italic opacity-60">
            {thinkingInProgressMatch[1]}
          </div>
        </details>
      </div>
    );
  }

  // Regular content
  return (
    <div className="leading-relaxed prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
