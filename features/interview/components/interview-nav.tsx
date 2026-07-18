"use client";

import Link from "next/link";
import { useInterviewStore } from "@/features/interview/store/interview-store";

/**
 * Top navigation during interview.
 * Per UI/UX spec: Logo (left), Current Interview title (center), User controls (right).
 */
export function InterviewNav() {
  const problemTitle = useInterviewStore((s) => s.problemTitle);
  const language = useInterviewStore((s) => s.language);

  const LANGUAGE_LABELS: Record<string, string> = {
    javascript: "JavaScript",
    typescript: "TypeScript",
    python: "Python",
    java: "Java",
    cpp: "C++",
    go: "Go",
  };

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
      {/* Left: Logo */}
      <Link href="/dashboard" className="flex items-center gap-2">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-foreground"
        >
          <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
        </svg>
        <span className="text-sm font-semibold tracking-tight text-foreground">
          AlgoPilot
        </span>
      </Link>

      {/* Center: Problem info */}
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-foreground">{problemTitle}</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-muted-foreground">
          {LANGUAGE_LABELS[language] ?? language}
        </span>
      </div>

      {/* Right: Placeholder — UserButton from layout handles this */}
      <div className="w-20" />
    </header>
  );
}
