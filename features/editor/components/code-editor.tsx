"use client";

import { useCallback } from "react";
import Editor from "@monaco-editor/react";
import { useInterviewStore } from "@/features/interview/store/interview-store";
import { LANGUAGE_CONFIG, type ProgrammingLanguage } from "@/types";

/**
 * Monaco code editor component.
 * Per UI/UX spec: Large font, comfortable spacing, line numbers,
 * syntax highlighting, dark theme.
 */
export function CodeEditor() {
  const code = useInterviewStore((s) => s.code);
  const setCode = useInterviewStore((s) => s.setCode);
  const language = useInterviewStore((s) => s.language);
  const status = useInterviewStore((s) => s.status);

  const monacoLanguage =
    LANGUAGE_CONFIG[language as ProgrammingLanguage]?.monacoId ?? "plaintext";

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined) {
        setCode(value);
      }
    },
    [setCode]
  );

  return (
    <div className="flex-1 overflow-hidden">
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
