"use client";

import { useEffect, useRef } from "react";
import { useInterviewStore } from "@/features/interview/store/interview-store";
import { formatTime } from "@/lib/utils";

/**
 * Timer component — displays remaining time in MM:SS format.
 * Subtly changes color when under 5 minutes (per UI/UX spec).
 * No flashing — just a calm color shift.
 */
export function Timer() {
  const timeRemaining = useInterviewStore((s) => s.timeRemainingSeconds);
  const timerActive = useInterviewStore((s) => s.timerActive);
  const setTimeRemaining = useInterviewStore((s) => s.setTimeRemaining);
  const setTimerActive = useInterviewStore((s) => s.setTimerActive);
  const setStatus = useInterviewStore((s) => s.setStatus);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!timerActive) return;

    intervalRef.current = setInterval(() => {
      setTimeRemaining(Math.max(0, timeRemaining - 1));

      if (timeRemaining <= 1) {
        setTimerActive(false);
        setStatus("completed");
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerActive, timeRemaining, setTimeRemaining, setTimerActive, setStatus]);

  const isLow = timeRemaining <= 300; // 5 minutes

  return (
    <div className="flex items-center gap-2 text-sm tabular-nums">
      {/* Clock icon */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isLow ? "text-amber-400" : "text-muted-foreground"}
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span
        className={`font-mono font-medium ${
          isLow ? "text-amber-400" : "text-muted-foreground"
        }`}
      >
        {formatTime(timeRemaining)}
      </span>
    </div>
  );
}
