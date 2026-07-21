"use client";

import { useCallback, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { useInterviewStore } from "@/features/interview/store/interview-store";
import { LANGUAGE_CONFIG, type ProgrammingLanguage } from "@/types";

/**
 * Monaco code editor component with debounced autosave.
 * Per UI/UX spec: Large font, comfortable spacing, line numbers,
 * syntax highlighting, dark theme.
 */
export function CodeEditor() {
  const code = useInterviewStore((s) => s.code);
  const setCode = useInterviewStore((s) => s.setCode);
  const language = useInterviewStore((s) => s.language);
  const status = useInterviewStore((s) => s.status);
  const interviewId = useInterviewStore((s) => s.interviewId);
  const setSaveStatus = useInterviewStore((s) => s.setSaveStatus);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedCodeRef = useRef(code);

  const monacoLanguage =
    LANGUAGE_CONFIG[language as ProgrammingLanguage]?.monacoId ?? "plaintext";

  // Debounced autosave — saves to DB 3 seconds after last edit
  useEffect(() => {
    if (status !== "in_progress" || !interviewId) return;
    if (code === lastSavedCodeRef.current) return;

    // Clear any pending save
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    setSaveStatus("idle");

    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/interviews/${interviewId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        if (res.ok) {
          lastSavedCodeRef.current = code;
          setSaveStatus("saved");
          // Reset to idle after 2 seconds
          setTimeout(() => setSaveStatus("idle"), 2000);
        } else {
          setSaveStatus("error");
        }
      } catch {
        setSaveStatus("error");
      }
    }, 3000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [code, status, interviewId, setSaveStatus]);

  // Synchronous save on page unload/refresh
  useEffect(() => {
    const handlePageHide = () => {
      if (status === "in_progress" && interviewId && code !== lastSavedCodeRef.current) {
        const blob = new Blob([JSON.stringify({ code })], {
          type: "application/json",
        });
        navigator.sendBeacon(`/api/interviews/${interviewId}`, blob);
      }
    };
    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [code, status, interviewId]);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined) {
        setCode(value);
      }
    },
    [setCode]
  );

  return (
    <div className="h-full w-full overflow-hidden flex-1">
      <Editor
        height="100%"
        language={monacoLanguage}
        value={code}
        onChange={handleChange}
        theme="vs-dark"
        options={{
          fontSize: 14,
          lineHeight: 22,
          fontFamily: "var(--font-geist-mono), 'Fira Code', 'Cascadia Code', Consolas, monospace",
          fontLigatures: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: "on",
          padding: { top: 16, bottom: 16 },
          lineNumbers: "on",
          renderLineHighlight: "line",
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          smoothScrolling: true,
          tabSize: 2,
          automaticLayout: true,
          readOnly: status !== "in_progress",
          // Hide unnecessary UI elements for clean look
          folding: true,
          glyphMargin: false,
          contextmenu: true,
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          overviewRulerLanes: 0,
          scrollbar: {
            vertical: "auto",
            horizontal: "auto",
            verticalScrollbarSize: 6,
            horizontalScrollbarSize: 6,
          },
        }}
        loading={
          <div className="flex h-full items-center justify-center bg-[#1e1e1e]">
            <p className="text-sm text-muted-foreground animate-pulse">
              Loading editor...
            </p>
          </div>
        }
      />
    </div>
  );
}
