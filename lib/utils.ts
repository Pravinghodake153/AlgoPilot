import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with clsx for conditional class names.
 * Prevents class conflicts (e.g., "p-2 p-4" -> "p-4").
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format seconds into MM:SS display string.
 */
export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Format a date string into a human-readable relative time.
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Get score color based on value (green 80+, amber 60-79, red <60).
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}

/**
 * Get score background color for visual indicators.
 */
export function getScoreBgColor(score: number): string {
  if (score >= 80) return "bg-emerald-400";
  if (score >= 60) return "bg-amber-400";
  return "bg-red-400";
}

/**
 * Truncate text to a maximum length with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "...";
}

/**
 * Generate a unique ID using crypto.randomUUID with fallback.
 */
export function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Check if Web Speech API is supported in the current browser.
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "SpeechRecognition" in window || "webkitSpeechRecognition" in window
  );
}

/**
 * Check if Speech Synthesis API is supported in the current browser.
 */
export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "speechSynthesis" in window;
}
