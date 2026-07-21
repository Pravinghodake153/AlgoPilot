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
}: ReportClientProps) {
  const [report, setReport] = useState<ReportData | null>(initialReport);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
