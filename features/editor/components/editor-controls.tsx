"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useInterviewStore } from "@/features/interview/store/interview-store";

interface ExecutionResult {
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  statusDescription: string;
  time: string | null;
  memory: number | null;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

/**
 * Editor controls — Run Code + Submit buttons + Console output.
 * Includes: keyboard shortcuts, save indicator, confirm dialog,
 * auto-retry on execution failure with friendly messages.
 */
export function EditorControls({ children }: { children?: React.ReactNode }) {
  const code = useInterviewStore((s) => s.code);
  const language = useInterviewStore((s) => s.language);
  const interviewId = useInterviewStore((s) => s.interviewId);
  const status = useInterviewStore((s) => s.status);
  const setStatus = useInterviewStore((s) => s.setStatus);
  const saveStatus = useInterviewStore((s) => s.saveStatus);
  const [output, setOutput] = useState<ExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"output" | "none">("none");
  const [retryCount, setRetryCount] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  const isDisabled = status !== "in_progress";

  // Execute code with auto-retry
  const executeCode = useCallback(async function runAttempt(attempt: number = 1): Promise<void> {
    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceCode: code, language }),
      });

      if (!response.ok) {
        const data = await response.json();
        // If server error and we have retries left, retry
        if (response.status >= 500 && attempt < MAX_RETRIES) {
          setRetryCount(attempt);
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
          return runAttempt(attempt + 1);
        }
        setOutput({
          stdout: null,
          stderr: data.error || "Execution failed",
          compileOutput: null,
          statusDescription: "Error",
          time: null,
          memory: null,
        });
        return;
      }

      const data = await response.json();
      setOutput(data.result);
      setRetryCount(0);

      // Broadcast execution result so chat inputs can send it to the AI
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("code-execution-result", { detail: data.result })
        );
      }
    } catch {
      if (attempt < MAX_RETRIES) {
        setRetryCount(attempt);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return executeCode(attempt + 1);
      }
      setOutput({
        stdout: null,
        stderr: "Execution service is unavailable. Please try again in a moment.",
        compileOutput: null,
        statusDescription: "Service Unavailable",
        time: null,
        memory: null,
      });
      setRetryCount(0);
    }
  }, [code, language]);

  async function handleRunCode() {
    setIsRunning(true);
    setActiveTab("output");
    setOutput(null);
    setRetryCount(0);

    await executeCode(1);
    setIsRunning(false);
  }

  async function handleSubmit() {
    setIsSubmitting(true);

    try {
      // Save the code to the database
      const response = await fetch(`/api/interviews/${interviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, action: "submit" }),
      });

      if (response.ok) {
        setStatus("completed");
      } else {
        console.error("Failed to submit code: server error");
      }
    } catch {
      console.error("Failed to submit code");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmitClick() {
    setShowConfirm(true);
  }

  function handleConfirmSubmit() {
    setShowConfirm(false);
    handleSubmit();
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;

      // Ctrl/Cmd + Enter → Run Code
      if (isMod && e.key === "Enter" && !isDisabled && !isRunning) {
        e.preventDefault();
        handleRunCode();
      }

      // Ctrl/Cmd + S → Prevent browser save (autosave handles it)
      if (isMod && e.key === "s") {
        e.preventDefault();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDisabled, isRunning, code, language]);

  // Save status indicator
  const saveIndicator = (() => {
    switch (saveStatus) {
      case "saving":
        return (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            Saving...
          </span>
        );
      case "saved":
        return (
          <span className="flex items-center gap-1 text-[11px] text-emerald-400">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Saved
          </span>
        );
      case "error":
        return (
          <span className="flex items-center gap-1 text-[11px] text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
            Save failed
          </span>
        );
      default:
        return null;
    }
  })();

  return (
    <div className="flex flex-col border-t border-border">
      {/* Button bar */}
      <div className="flex items-center gap-2 px-4 py-2">
        <button
          onClick={handleRunCode}
          disabled={isRunning || isDisabled}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-secondary px-3 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-40 cursor-pointer"
        >
          {isRunning ? (
            retryCount > 0 ? (
              <span className="animate-pulse">Retrying ({retryCount}/{MAX_RETRIES})...</span>
            ) : (
              <span className="animate-pulse">Running...</span>
            )
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <polygon points="6 3 20 12 6 21 6 3" />
              </svg>
              Run
              <span className="text-[10px] text-muted-foreground ml-1 hidden sm:inline">
                {navigator.platform?.includes("Mac") ? "Cmd" : "Ctrl"}+Enter
              </span>
            </>
          )}
        </button>

        <button
          onClick={handleSubmitClick}
          disabled={isSubmitting || isDisabled}
          className="inline-flex h-8 items-center rounded-md bg-foreground px-4 text-xs font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-40 cursor-pointer"
        >
          {isSubmitting ? "Submitting..." : "Submit"}
        </button>

        {/* Save indicator */}
        <div className="ml-2">
          {saveIndicator}
        </div>

        {/* Hint button slot */}
        {children && <div className="ml-2">{children}</div>}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Output toggle */}
        {output && (
          <button
            onClick={() => setActiveTab(activeTab === "output" ? "none" : "output")}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {activeTab === "output" ? "Hide Output" : "Show Output"}
          </button>
        )}
      </div>

      {/* Console output */}
      {activeTab === "output" && output && (
        <div className="max-h-40 overflow-y-auto border-t border-border bg-[#1e1e1e] px-4 py-3">
          {/* Status line */}
          <div className="mb-2 flex items-center gap-2 text-xs">
            <span
              className={
                output.statusDescription === "Accepted"
                  ? "text-emerald-400"
                  : "text-red-400"
              }
            >
              {output.statusDescription}
            </span>
            {output.time && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-muted-foreground">{output.time}s</span>
              </>
            )}
            {output.memory && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-muted-foreground">
                  {(output.memory / 1024).toFixed(1)} MB
                </span>
              </>
            )}
          </div>

          {/* Output content */}
          <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap">
            {output.compileOutput && (
              <span className="text-red-400">{output.compileOutput}</span>
            )}
            {output.stderr && (
              <span className="text-red-400">{output.stderr}</span>
            )}
            {output.stdout && (
              <span className="text-foreground/80">{output.stdout}</span>
            )}
            {!output.stdout && !output.stderr && !output.compileOutput && (
              <span className="text-muted-foreground/50">No output</span>
            )}
          </pre>
        </div>
      )}

      {/* Submit confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowConfirm(false)}
            aria-hidden
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
            <h3 className="text-base font-semibold">Submit your solution?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              You won&apos;t be able to return to the editor after submitting. The interview will end and your report will be generated.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="h-9 rounded-md px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSubmit}
                className="h-9 rounded-md bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-foreground/90 cursor-pointer"
              >
                Submit & End
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
