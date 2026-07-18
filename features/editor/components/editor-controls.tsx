"use client";

import { useState } from "react";
import { useInterviewStore } from "@/features/interview/store/interview-store";

interface ExecutionResult {
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  statusDescription: string;
  time: string | null;
  memory: number | null;
}

/**
 * Editor controls — Run Code + Submit buttons + Console output.
 * Per UI/UX spec: "Below editor: Run Code, Submit, Console Output, Test Results"
 */
export function EditorControls() {
  const code = useInterviewStore((s) => s.code);
  const language = useInterviewStore((s) => s.language);
  const interviewId = useInterviewStore((s) => s.interviewId);
  const status = useInterviewStore((s) => s.status);
  const [output, setOutput] = useState<ExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"output" | "none">("none");

  const isDisabled = status !== "in_progress";

  async function handleRunCode() {
    setIsRunning(true);
    setActiveTab("output");
    setOutput(null);

    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceCode: code, language }),
      });

      if (!response.ok) {
        const data = await response.json();
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
    } catch {
      setOutput({
        stdout: null,
        stderr: "Network error — could not reach execution server",
        compileOutput: null,
        statusDescription: "Error",
        time: null,
        memory: null,
      });
    } finally {
      setIsRunning(false);
    }
  }

  async function handleSubmit() {
    setIsSubmitting(true);

    try {
      // Save the code to the database
      await fetch(`/api/interviews/${interviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, action: "submit" }),
      });
    } catch {
      console.error("Failed to submit code");
    } finally {
      setIsSubmitting(false);
    }
  }

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
            <span className="animate-pulse">Running...</span>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <polygon points="6 3 20 12 6 21 6 3" />
              </svg>
              Run Code
            </>
          )}
        </button>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || isDisabled}
          className="inline-flex h-8 items-center rounded-md bg-foreground px-4 text-xs font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-40 cursor-pointer"
        >
          {isSubmitting ? "Submitting..." : "Submit"}
        </button>

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
    </div>
  );
}
