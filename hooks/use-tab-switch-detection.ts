"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface UseTabSwitchDetectionOptions {
  enabled: boolean;
  interviewId?: string;
  initialCount?: number;
}

interface TabSwitchState {
  tabSwitchCount: number;
  showWarning: boolean;
  warningMessage: string;
}

/**
 * Detects tab switches (visibilitychange), window blur (switching apps), and page refreshes.
 * Persists tabSwitchCount to localStorage and PostgreSQL Database so it survives hard page refreshes.
 */
export function useTabSwitchDetection({
  enabled,
  interviewId,
  initialCount = 0,
}: UseTabSwitchDetectionOptions): TabSwitchState & { dismissWarning: () => void } {
  const storageKey = interviewId ? `algopilot_tab_switches_${interviewId}` : null;

  const [tabSwitchCount, setTabSwitchCount] = useState<number>(() => {
    if (typeof window !== "undefined" && storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed)) return Math.max(parsed, initialCount);
      }
    }
    return initialCount;
  });

  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const wasAwayRef = useRef(false);

  const dismissWarning = useCallback(() => {
    setShowWarning(false);
    setWarningMessage("");
  }, []);

  // Helper to persist count to localStorage and Database
  const incrementAndPersistCount = useCallback(
    (message: string) => {
      setTabSwitchCount((prev) => {
        const nextCount = prev + 1;
        if (storageKey) {
          try {
            localStorage.setItem(storageKey, nextCount.toString());
          } catch (e) {
            console.error("Failed to save to localStorage:", e);
          }
        }
        if (interviewId) {
          fetch(`/api/interviews/${interviewId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tabSwitchCount: nextCount }),
          }).catch((err) => console.error("Failed to sync tabSwitchCount to DB:", err));

          // Log the event
          fetch(`/api/events`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              eventType: "TAB_SWITCH",
              interviewId,
              details: { message, count: nextCount }
            }),
          }).catch((err) => console.error("Failed to log event:", err));
        }
        return nextCount;
      });

      setWarningMessage(message);
      setShowWarning(true);
    },
    [interviewId, storageKey]
  );

  useEffect(() => {
    if (!enabled) return;

    // Detect tab switch (document hidden)
    function handleVisibilityChange() {
      if (document.hidden) {
        wasAwayRef.current = true;
      } else if (wasAwayRef.current) {
        wasAwayRef.current = false;
        incrementAndPersistCount("Please be loyal — do not switch tabs during the interview");
      }
    }

    // Detect window blur (user clicks outside browser or switches applications)
    function handleWindowBlur() {
      wasAwayRef.current = true;
    }

    function handleWindowFocus() {
      if (wasAwayRef.current) {
        wasAwayRef.current = false;
        incrementAndPersistCount("Please keep focus on the interview window");
      }
    }

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }

    // Detect refresh: mark in sessionStorage before unload, check on mount
    const refreshKey = interviewId ? `algopilot_active_${interviewId}` : "algopilot_interview_active";
    const wasRefresh = sessionStorage.getItem(refreshKey) === "true";
    if (wasRefresh) {
      incrementAndPersistCount("Please do not refresh the page during the interview");
    }
    sessionStorage.setItem(refreshKey, "true");

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled, interviewId, incrementAndPersistCount]);

  return { tabSwitchCount, showWarning, warningMessage, dismissWarning };
}
