import Link from "next/link";
import { formatRelativeTime, getScoreColor } from "@/lib/utils";

interface Interview {
  id: string;
  language: string;
  difficulty: string;
  duration: number;
  status: string;
  problemTitle: string;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  report: { overallScore: number } | null;
}

interface InterviewListProps {
  interviews: Interview[];
}

const LANGUAGE_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  cpp: "C++",
  go: "Go",
};

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "text-emerald-400",
  medium: "text-amber-400",
  hard: "text-red-400",
};

/**
 * Displays a list of previous interviews.
 * Empty state: "No previous interviews."
 */
export function InterviewList({ interviews }: InterviewListProps) {
  if (interviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No previous interviews.
        </p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Start your first interview to begin practicing.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {interviews.map((interview) => (
        <Link
          key={interview.id}
          href={
            interview.status === "completed"
              ? `/report/${interview.id}`
              : `/interview/${interview.id}`
          }
          className="group flex items-center justify-between rounded-lg border border-border px-4 py-3 transition-colors hover:bg-secondary/50"
        >
          {/* Left: Problem info */}
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground group-hover:text-foreground/90">
              {interview.problemTitle}
            </span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{LANGUAGE_LABELS[interview.language] ?? interview.language}</span>
              <span className="text-muted-foreground/40">·</span>
              <span className={DIFFICULTY_STYLES[interview.difficulty] ?? ""}>
                {interview.difficulty.charAt(0).toUpperCase() + interview.difficulty.slice(1)}
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span>{interview.duration} min</span>
            </div>
          </div>

          {/* Right: Score or status + date */}
          <div className="flex items-center gap-4">
            {interview.report ? (
              <span className={`text-sm font-semibold ${getScoreColor(interview.report.overallScore)}`}>
                {interview.report.overallScore}/100
              </span>
            ) : (
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
                {interview.status === "in_progress" ? "In Progress" : interview.status}
              </span>
            )}
            <span className="text-xs text-muted-foreground/60">
              {formatRelativeTime(interview.createdAt.toISOString())}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
