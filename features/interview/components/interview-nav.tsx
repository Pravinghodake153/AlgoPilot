"use client";

import Link from "next/link";
import { useInterviewStore } from "@/features/interview/store/interview-store";
import { Timer } from "./timer";

const LANGUAGE_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  cpp: "C++",
  go: "Go",
};

/**
 * Top navigation during interview.
 * Compact: Logo (left), Problem title + Timer (center), Layout toggles (right).
 */
export function InterviewNav() {
  const problemTitle = useInterviewStore((s) => s.problemTitle);
  const language = useInterviewStore((s) => s.language);
  const layoutMode = useInterviewStore((s) => s.layoutMode);
  const showProblem = useInterviewStore((s) => s.showProblem);
  const showAIPanel = useInterviewStore((s) => s.showAIPanel);
  const setLayoutMode = useInterviewStore((s) => s.setLayoutMode);
  const setShowProblem = useInterviewStore((s) => s.setShowProblem);
  const setShowAIPanel = useInterviewStore((s) => s.setShowAIPanel);

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

      {/* Center: Problem info + Timer */}
      <div className="flex items-center gap-3 text-sm">
        <span className="font-medium text-foreground max-w-[200px] truncate">
          {problemTitle}
        </span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-muted-foreground">
          {LANGUAGE_LABELS[language] ?? language}
        </span>
        <span className="text-muted-foreground/40">·</span>
        <Timer />
      </div>

      {/* Right: Layout controls */}
      <div className="flex items-center gap-1">
        {/* Toggle Problem Panel */}
        <button
          onClick={() => setShowProblem(!showProblem)}
          className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors cursor-pointer ${
            showProblem
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
          aria-label={showProblem ? "Hide problem" : "Show problem"}
          title={showProblem ? "Hide problem" : "Show problem"}
        >
          {/* Document icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" x2="8" y1="13" y2="13" />
            <line x1="16" x2="8" y1="17" y2="17" />
          </svg>
        </button>

        {/* Toggle AI Panel */}
        <button
          onClick={() => setShowAIPanel(!showAIPanel)}
          className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors cursor-pointer ${
            showAIPanel
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
          aria-label={showAIPanel ? "Hide AI panel" : "Show AI panel"}
          title={showAIPanel ? "Hide AI panel" : "Show AI panel"}
        >
          {/* Chat icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>

        {/* Divider */}
        <div className="mx-1 h-5 w-px bg-border" />

        {/* Layout: Horizontal */}
        <button
          onClick={() => setLayoutMode("horizontal")}
          className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors cursor-pointer ${
            layoutMode === "horizontal"
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
          aria-label="Horizontal layout"
          title="Side-by-side layout"
        >
          {/* Columns icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <line x1="12" x2="12" y1="3" y2="21" />
          </svg>
        </button>

        {/* Layout: Vertical */}
        <button
          onClick={() => setLayoutMode("vertical")}
          className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors cursor-pointer ${
            layoutMode === "vertical"
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
          aria-label="Vertical layout"
          title="Stacked layout"
        >
          {/* Rows icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <line x1="3" x2="21" y1="12" y2="12" />
          </svg>
        </button>
      </div>
    </header>
  );
}
