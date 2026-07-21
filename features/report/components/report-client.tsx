"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getScoreColor } from "@/lib/utils";
import { FeedbackButton } from "@/features/feedback/components/feedback-button";
import { MessageContent } from "@/features/interview/components/message-content";

// ─── Staged Report Progress ─────────────────

const REPORT_STAGES = [
  { label: "Analyzing transcript", duration: 3000 },
  { label: "Evaluating code quality", duration: 3000 },
  { label: "Scoring communication", duration: 3000 },
  { label: "Generating recommendations", duration: 3000 },
  { label: "Finalizing report", duration: 6000 },
];

function ReportProgress() {
  const [currentStage, setCurrentStage] = useState(0);

  useEffect(() => {
    if (currentStage >= REPORT_STAGES.length - 1) return;

    const timer = setTimeout(() => {
      setCurrentStage((s) => Math.min(s + 1, REPORT_STAGES.length - 1));
    }, REPORT_STAGES[currentStage].duration);

    return () => clearTimeout(timer);
  }, [currentStage]);

  const progress = ((currentStage + 1) / REPORT_STAGES.length) * 100;

  return (
    <div className="mt-10 flex flex-col items-center justify-center py-16">
      {/* Spinner */}
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-foreground" />

      {/* Stage label */}
      <p className="mt-4 text-sm text-foreground font-medium">
        {REPORT_STAGES[currentStage].label}...
      </p>

      {/* Progress bar */}
      <div className="mt-4 w-64 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-foreground/60 transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stage indicators */}
      <div className="mt-4 flex flex-col gap-1.5">
        {REPORT_STAGES.map((stage, i) => (
          <div key={stage.label} className="flex items-center gap-2 text-xs">
            {i < currentStage ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : i === currentStage ? (
              <span className="h-3 w-3 rounded-full border-2 border-foreground/60 animate-pulse" />
            ) : (
              <span className="h-3 w-3 rounded-full border border-muted-foreground/30" />
            )}
            <span
              className={
                i < currentStage
                  ? "text-emerald-400"
                  : i === currentStage
                    ? "text-foreground"
                    : "text-muted-foreground/40"
              }
            >
              {stage.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ReportData {
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  problemSolvingScore: number;
  optimizationScore: number;
  codeQualityScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  summary: string;
  nextSteps?: string[];
  transcriptAnnotations?: { messageIndex: number; tag: string; rationale: string }[];
  timeComplexity?: string;
  spaceComplexity?: string;
  isSolved?: boolean;
  estimatedLevel?: string;
}

interface ReportClientProps {
  interview: {
    id: string;
    problemTitle: string;
    difficulty: string;
    language: string;
    duration: number;
    code: string;
    createdAt: string;
  };
  report: ReportData | null;
  messageCount: number;
  messages?: { role: string; content: string; createdAt: Date }[];
  isOwner?: boolean;
  isPublic?: boolean;
}

const LANGUAGE_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  cpp: "C++",
  go: "Go",
};

/**
 * Report page client component.
 * Shows scores, strengths, weaknesses, suggestions, and summary.
 * Triggers report generation if not yet generated.
 */
export function ReportClient({
  interview,
  report: initialReport,
  messageCount,
  messages = [],
  isOwner = true,
  isPublic = false,
}: ReportClientProps) {
  const [report, setReport] = useState<ReportData | null>(initialReport);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPublicState, setIsPublicState] = useState(isPublic);
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  // Auto-generate report if not present
  useEffect(() => {
    if (!report && !isGenerating) {
      generateReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generateReport() {
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/interviews/${interview.id}/report`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("Failed to generate report");

      const data = await res.json();
      setReport(data.report);
    } catch {
      setError("Failed to generate report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleTogglePublic() {
    if (!isOwner) return;
    setIsToggling(true);
    try {
      const res = await fetch(`/api/reports/${interview.id}/toggle-public`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !isPublicState }),
      });
      if (!res.ok) throw new Error("Failed to toggle");
      const data = await res.json();
      setIsPublicState(data.isPublic);
    } catch (e) {
      console.error(e);
      alert("Failed to update public status.");
    } finally {
      setIsToggling(false);
    }
  }

  function handleShare() {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setShowShareTooltip(true);
    setTimeout(() => setShowShareTooltip(false), 2000);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard"
            className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            Interview Report
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span>{interview.problemTitle}</span>
            <span className="text-muted-foreground/40">·</span>
            <span>{LANGUAGE_LABELS[interview.language] ?? interview.language}</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="capitalize">{interview.difficulty}</span>
            <span className="text-muted-foreground/40">·</span>
            <span>{messageCount} messages</span>
          </div>
        </div>
        
        {/* Share Button / Privacy Toggle */}
        <div className="flex items-center gap-3">
          {isOwner && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2">
              <span className={isPublicState ? "text-emerald-500" : ""}>
                {isPublicState ? "Public" : "Private"}
              </span>
              <button 
                onClick={handleTogglePublic}
                disabled={isToggling}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${isPublicState ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`}
              >
                <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${isPublicState ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          )}

          {(isPublicState || isOwner) && (
            <div className="relative">
              <button 
                onClick={handleShare}
                className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                Share Score
              </button>
              {showShareTooltip && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 rounded bg-foreground px-2 py-1 text-xs text-background shadow-md">
                  Link Copied!
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <FeedbackButton />

      {/* Loading state — staged progress */}
      {isGenerating && <ReportProgress />}

      {/* Error state */}
      {error && (
        <div className="mt-10 flex flex-col items-center gap-3 py-16">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={generateReport}
            className="h-9 rounded-md bg-secondary px-4 text-sm font-medium text-foreground hover:bg-secondary/80 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Report content */}
      {report && (
        <div className="mt-8 flex flex-col gap-8">
          
          {/* Advanced Metrics / Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col rounded-xl border border-border p-4 bg-card">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Status</span>
              <div className="flex items-center gap-2">
                {report.isSolved ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span className="font-semibold text-emerald-500">Solved</span>
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    <span className="font-semibold text-amber-500">Not Solved</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col rounded-xl border border-border p-4 bg-card">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Time</span>
              <span className="font-semibold font-mono text-foreground text-lg">{report.timeComplexity || "N/A"}</span>
            </div>

            <div className="flex flex-col rounded-xl border border-border p-4 bg-card">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Space</span>
              <span className="font-semibold font-mono text-foreground text-lg">{report.spaceComplexity || "N/A"}</span>
            </div>

            <div className="flex flex-col rounded-xl border border-border p-4 bg-card">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Level</span>
              <span className="font-semibold text-primary">{report.estimatedLevel || "Unknown"}</span>
            </div>
          </div>

          {/* Overall Score */}
          <div className="flex items-center gap-6 rounded-xl border border-border p-6">
            <div className="flex flex-col items-center">
              <span
                className={`text-4xl font-bold tabular-nums ${getScoreColor(report.overallScore)}`}
              >
                {report.overallScore}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                / 100
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold">Overall Score</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {report.summary}
              </p>
            </div>
          </div>

          {/* Score Breakdown */}
          <div>
            <h2 className="mb-4 text-sm font-semibold text-muted-foreground">
              Score Breakdown
            </h2>
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: "Technical", score: report.technicalScore },
                { label: "Communication", score: report.communicationScore },
                { label: "Problem Solving", score: report.problemSolvingScore },
                { label: "Optimization", score: report.optimizationScore },
                { label: "Code Quality", score: report.codeQualityScore },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col items-center rounded-lg border border-border p-4"
                >
                  <span
                    className={`text-xl font-bold tabular-nums ${getScoreColor(item.score)}`}
                  >
                    {item.score}
                  </span>
                  <span className="mt-1 text-center text-[10px] text-muted-foreground">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-emerald-400">
              Strengths
            </h2>
            <div className="flex flex-col gap-2">
              {report.strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 shrink-0 text-emerald-400"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="text-foreground/80">{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Weaknesses */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-amber-400">
              Areas for Improvement
            </h2>
            <div className="flex flex-col gap-2">
              {report.weaknesses.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 shrink-0 text-amber-400"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" x2="12" y1="8" y2="12" />
                    <line x1="12" x2="12.01" y1="16" y2="16" />
                  </svg>
                  <span className="text-foreground/80">{w}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Suggestions */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-blue-400">
              Suggestions
            </h2>
            <div className="flex flex-col gap-2">
              {report.suggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 shrink-0 text-blue-400"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                  <span className="text-foreground/80">{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actionable Next Steps */}
          {report.nextSteps && report.nextSteps.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-purple-400">
                Actionable Next Steps
              </h2>
              <div className="flex flex-col gap-2">
                {report.nextSteps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-purple-400">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                    <span className="text-foreground/80">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transcript Annotations */}
          {messages.length > 0 && (
            <div className="mt-6 border-t border-border pt-6">
              <h2 className="mb-4 text-sm font-semibold">
                Annotated Interview Transcript
              </h2>
              <div className="flex flex-col gap-4 rounded-xl border border-border p-4 bg-muted/20 h-[500px] overflow-y-auto">
                {messages.map((msg, i) => {
                  const annotation = report.transcriptAnnotations?.find(
                    (a) => a.messageIndex === i
                  );
                  const isAssistant = msg.role === "assistant";

                  return (
                    <div
                      key={i}
                      className={`flex flex-col max-w-[85%] ${
                        isAssistant ? "self-start" : "self-end"
                      }`}
                    >
                      <div
                        className={`rounded-xl px-4 py-3 text-sm ${
                          isAssistant
                            ? "bg-secondary text-secondary-foreground"
                            : "bg-primary text-primary-foreground"
                        }`}
                      >
                        <MessageContent content={msg.content} />
                      </div>
                      {annotation && (
                        <div className="mt-2 flex items-start gap-2 text-xs p-2 rounded-md border border-purple-500/30 bg-purple-500/10 text-purple-200 w-fit">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" x2="12" y1="8" y2="12" />
                            <line x1="12" x2="12.01" y1="16" y2="16" />
                          </svg>
                          <div className="flex flex-col">
                            <span className="font-semibold">{annotation.tag}</span>
                            <span className="opacity-90">{annotation.rationale}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 border-t border-border pt-6 mt-4">
            <Link
              href="/dashboard"
              className="h-9 rounded-md bg-secondary px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80 inline-flex items-center"
            >
              Back to Dashboard
            </Link>
            <Link
              href="/dashboard"
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 inline-flex items-center gap-1.5"
            >
              Start New Interview
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
