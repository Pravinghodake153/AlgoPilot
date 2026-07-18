"use client";

import { useInterviewStore } from "@/features/interview/store/interview-store";

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "text-emerald-400 bg-emerald-400/10",
  medium: "text-amber-400 bg-amber-400/10",
  hard: "text-red-400 bg-red-400/10",
};

/**
 * Problem panel — displays coding question above the editor.
 * Per UI/UX spec: Title, Difficulty badge, Problem statement, Examples, Constraints.
 * "No unnecessary borders. Readable typography."
 */
export function ProblemPanel() {
  const problemTitle = useInterviewStore((s) => s.problemTitle);
  const problemDescription = useInterviewStore((s) => s.problemDescription);
  const difficulty = useInterviewStore((s) => s.difficulty);

  return (
    <div className="overflow-y-auto px-5 py-4">
      {/* Title + Difficulty badge */}
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold tracking-tight">{problemTitle}</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            DIFFICULTY_STYLES[difficulty] ?? ""
          }`}
        >
          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
        </span>
      </div>

      {/* Problem description — preserves formatting from the API */}
      <div className="mt-4 text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap font-mono">
        {problemDescription}
      </div>
    </div>
  );
}
