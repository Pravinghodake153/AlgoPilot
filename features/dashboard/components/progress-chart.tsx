"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ProgressChartProps {
  interviews: Array<{
    id: string;
    createdAt: Date;
    report: { overallScore: number } | null;
  }>;
}

export function ProgressChart({ interviews }: ProgressChartProps) {
  // Only consider completed interviews with a report
  const completed = useMemo(() => {
    return interviews
      .filter((i) => i.report !== null)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(-10); // Show last 10
  }, [interviews]);

  if (completed.length < 2) {
    return null; // Not enough data to show progress
  }

  const latestScore = completed[completed.length - 1].report!.overallScore;
  const previousScore = completed[completed.length - 2].report!.overallScore;
  const diff = latestScore - previousScore;

  const trendIcon =
    diff > 0 ? (
      <TrendingUp className="h-4 w-4 text-emerald-500" />
    ) : diff < 0 ? (
      <TrendingDown className="h-4 w-4 text-rose-500" />
    ) : (
      <Minus className="h-4 w-4 text-muted-foreground" />
    );

  const trendText =
    diff > 0
      ? `+${diff} points from last interview`
      : diff < 0
      ? `${diff} points from last interview`
      : "No change from last interview";

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 mb-8 mt-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold leading-none tracking-tight">
            Performance Trend
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-1.5">
            {trendIcon}
            {trendText}
          </p>
        </div>
      </div>
      <div className="h-[120px] w-full flex items-end gap-2 pt-4">
        {completed.map((interview, i) => {
          const score = interview.report!.overallScore;
          const height = Math.max(score, 5); // min height 5%
          
          let color = "bg-primary/20 hover:bg-primary/30"; // default
          if (score >= 80) color = "bg-emerald-500/80 hover:bg-emerald-500";
          else if (score >= 60) color = "bg-amber-500/80 hover:bg-amber-500";
          else if (score < 60) color = "bg-rose-500/80 hover:bg-rose-500";

          return (
            <div
              key={interview.id}
              className="group relative flex flex-1 flex-col justify-end items-center h-full"
            >
              {/* Tooltip */}
              <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-popover text-popover-foreground text-xs rounded px-2 py-1 pointer-events-none whitespace-nowrap z-10 shadow-md border">
                {score} pts • {format(new Date(interview.createdAt), "MMM d")}
              </div>
              {/* Bar */}
              <div
                className={`w-full rounded-t-sm transition-all duration-300 ${color}`}
                style={{ height: `${height}%` }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
