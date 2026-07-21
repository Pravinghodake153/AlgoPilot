"use client";

import { useEffect, useRef } from "react";
import { useInterviewStore } from "@/features/interview/store/interview-store";
import { formatTime } from "@/lib/utils";

/**
 * Determine the current interview phase based on elapsed time.
 */
function getPhase(
  timeRemainingSeconds: number,
  totalDurationSeconds: number
): { label: string; color: string } {
  if (totalDurationSeconds === 0) return { label: "Setup", color: "text-muted-foreground" };

  const elapsed = totalDurationSeconds - timeRemainingSeconds;
  const pct = elapsed / totalDurationSeconds;

  if (pct < 0.15) return { label: "Intro", color: "text-blue-400" };
  if (pct < 0.70) return { label: "Problem Solving", color: "text-emerald-400" };
  if (pct < 0.90) return { label: "Coding & Testing", color: "text-amber-400" };
  return { label: "Wrap-up", color: "text-red-400" };
}

/**
 * Timer component — displays remaining time in MM:SS format.
 * Shows current interview phase.
 * Triggers AI farewell at 30 seconds and auto-ends at 0.
 */
export function Timer() {
  const timeRemaining = useInterviewStore((s) => s.timeRemainingSeconds);
  const timerActive = useInterviewStore((s) => s.timerActive);
  const duration = useInterviewStore((s) => s.duration);
  const setTimeRemaining = useInterviewStore((s) => s.setTimeRemaining);
  const setTimerActive = useInterviewStore((s) => s.setTimerActive);
  const setStatus = useInterviewStore((s) => s.setStatus);
  const addMessage = useInterviewStore((s) => s.addMessage);
  const interviewId = useInterviewStore((s) => s.interviewId);
  const code = useInterviewStore((s) => s.code);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const farewellSentRef = useRef(false);

  const totalDurationSeconds = duration * 60;
  const phase = getPhase(timeRemaining, totalDurationSeconds);

  // Persist timer state to localStorage every 5 seconds
  useEffect(() => {
    if (interviewId && timeRemaining % 5 === 0 && timeRemaining > 0) {
      localStorage.setItem(`interview_time_${interviewId}`, timeRemaining.toString());
    }
  }, [timeRemaining, interviewId]);

  useEffect(() => {
    if (!timerActive) return;

    intervalRef.current = setInterval(() => {
      setTimeRemaining(Math.max(0, timeRemaining - 1));

      // At 30 seconds, trigger AI farewell (once)
      if (timeRemaining === 30 && !farewellSentRef.current && interviewId) {
        farewellSentRef.current = true;
        // Send a farewell chat to the AI so it says goodbye
        fetch(`/api/interviews/${interviewId}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "[The interview timer has 30 seconds remaining. Please wrap up with a brief goodbye.]",
            code,
            timeRemainingSeconds: 30,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.response) {
              addMessage("assistant", data.response);
            }
          })
          .catch(() => {
            addMessage(
              "assistant",
              "We're out of time. Thank you for your effort today, it was great working through this problem with you. Good luck!"
            );
          });
      }

      // Auto-end and submit when time hits 0
      if (timeRemaining <= 1) {
        setTimerActive(false);

        // Auto-save code to DB before completing
        if (interviewId) {
          fetch(`/api/interviews/${interviewId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, action: "submit" }),
          }).catch(() => {
            // Best-effort save
          });
        }
        
        if (interviewId) {
          localStorage.removeItem(`interview_time_${interviewId}`);
        }
        
        setStatus("completed");
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [
    timerActive,
    timeRemaining,
    setTimeRemaining,
    setTimerActive,
    setStatus,
    interviewId,
    code,
    addMessage,
  ]);

  const isLow = timeRemaining <= 300; // 5 minutes
  const isCritical = timeRemaining <= 60; // 1 minute

  return (
    <div className="flex items-center gap-2 text-sm">
      {/* Phase label */}
      <span className={`text-[11px] font-medium ${phase.color}`}>
        {phase.label}
      </span>

      <span className="text-muted-foreground/30">·</span>

      {/* Clock icon */}
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isCritical ? "text-red-400" : isLow ? "text-amber-400" : "text-muted-foreground"}
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span
        className={`font-mono font-medium tabular-nums ${
          isCritical ? "text-red-400" : isLow ? "text-amber-400" : "text-muted-foreground"
        }`}
      >
        {formatTime(timeRemaining)}
      </span>
    </div>
  );
}
