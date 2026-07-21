"use client";

import { useEffect, useState } from "react";

interface WarningToastProps {
  message: string;
  isVisible: boolean;
  onDismiss: () => void;
  durationMs?: number;
}

/**
 * A semi-transparent red warning toast that appears at the top center of the screen.
 * Auto-dismisses after the specified duration (default 5s).
 */
export function WarningToast({ message, isVisible, onDismiss, durationMs = 5000 }: WarningToastProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        onDismiss();
      }, durationMs);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [isVisible, durationMs, onDismiss]);

  if (!show) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-3 rounded-lg px-5 py-3 shadow-xl border border-red-500/30"
        style={{ backgroundColor: "rgba(220, 38, 38, 0.8)", backdropFilter: "blur(8px)" }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white shrink-0"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span className="text-sm font-medium text-white">{message}</span>
      </div>
    </div>
  );
}
