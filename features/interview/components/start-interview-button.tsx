"use client";

import { useState } from "react";
import { StartInterviewModal } from "./start-interview-modal";

/**
 * "Start Interview" CTA button that opens the configuration modal.
 */
export function StartInterviewButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex h-9 items-center justify-center rounded-md bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
      >
        Start Interview
      </button>
      {isOpen && <StartInterviewModal onClose={() => setIsOpen(false)} />}
    </>
  );
}
