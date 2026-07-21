"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SUPPORTED_LANGUAGES, INTERVIEW_DURATIONS, INTERVIEW_STYLES } from "@/types";

interface StartInterviewModalProps {
  onClose: () => void;
}

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
] as const;

/**
 * Interview configuration modal.
 * Collects: Language, Difficulty, Duration.
 * Then calls POST /api/interviews to create a new interview session.
 */
export function StartInterviewModal({ onClose }: StartInterviewModalProps) {
  const router = useRouter();
  const [language, setLanguage] = useState("python");
  const [difficulty, setDifficulty] = useState("medium");
  const [style, setStyle] = useState("standard");
  const [duration, setDuration] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  async function handleStart() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, difficulty, style, duration }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create interview");
      }

      const data = await response.json();
      router.push(`/interview/${data.interview.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            New Interview
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground cursor-pointer"
            aria-label="Close modal"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" x2="6" y1="6" y2="18" />
              <line x1="6" x2="18" y1="6" y2="18" />
            </svg>
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-5">
          {/* Language */}
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-muted-foreground">
              Language
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setLanguage(lang.id)}
                  className={`flex h-9 items-center justify-center rounded-md border text-sm font-medium transition-colors cursor-pointer ${
                    language === lang.id
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Difficulty */}
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-muted-foreground">
              Difficulty
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDifficulty(opt.value)}
                  className={`flex h-9 items-center justify-center rounded-md border text-sm font-medium transition-colors cursor-pointer ${
                    difficulty === opt.value
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Style */}
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-muted-foreground">
              Interview Style
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {INTERVIEW_STYLES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStyle(opt.value)}
                  className={`flex h-9 items-center justify-center rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                    style === opt.value
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Duration */}
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-muted-foreground">
              Duration
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {INTERVIEW_DURATIONS.map((dur) => (
                <button
                  key={dur.value}
                  type="button"
                  onClick={() => setDuration(dur.value)}
                  className={`flex h-9 items-center justify-center rounded-md border text-sm font-medium transition-colors cursor-pointer ${
                    duration === dur.value
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  {dur.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        {/* Error */}
        {error && (
          <p className="mt-4 text-sm text-red-400">{error}</p>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="h-9 rounded-md px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStart}
            disabled={isLoading}
            className="inline-flex h-9 items-center justify-center rounded-md bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer disabled:opacity-50"
          >
            {isLoading ? "Starting..." : "Start Interview"}
          </button>
        </div>
      </div>
    </div>
  );
}
